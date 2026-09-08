use anchor_lang::prelude::*;

use crate::{constants::*, state::*, EscapementError};

/// Fires one tick for a lease. Permissionless in shape but restricted to the
/// buyer (wallet or delegated session key) or the protocol crank: iteration
/// caps are prepaid, so an open crank would let strangers burn a buyer's
/// purchased iterations.
///
/// The interval itself is enforced by the crank scheduler (MagicBlock
/// ScheduleTask on the Ephemeral Rollup); the chain enforces the iteration
/// cap, the expiry window, and the fee accounting.
#[derive(Accounts)]
pub struct CrankTick<'info> {
    /// Buyer (or delegated session key), or the protocol crank authority.
    #[account(mut)]
    pub crank: Signer<'info>,
    #[account(seeds = [MARKET_SEED], bump)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub lease: Account<'info, Lease>,
    #[account(
        seeds = [REGISTERED_PROGRAM_SEED, registered_program.authority.as_ref(), registered_program.template_id.as_ref()],
        bump
    )]
    pub registered_program: Account<'info, RegisteredProgram>,
    /// CHECK: must be the registered template program.
    pub template_program: UncheckedAccount<'info>,
    /// CHECK: counter PDA owned by the template program, created on first tick.
    #[account(mut)]
    pub counter: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_crank_tick(ctx: Context<CrankTick>) -> Result<()> {
    let lease = &mut ctx.accounts.lease;
    let crank = ctx.accounts.crank.key();

    require!(
        crank == lease.buyer || crank == ctx.accounts.market.authority,
        EscapementError::UnauthorizedCrank
    );
    require!(
        ctx.accounts.registered_program.key() == lease.registered_program,
        EscapementError::LeaseProgramMismatch
    );
    require!(
        ctx.accounts.template_program.key() == lease.template_id,
        EscapementError::TemplateMismatch
    );
    require!(lease.status == STATUS_ACTIVE, EscapementError::LeaseNotActive);
    require!(
        lease.iterations_done < lease.iterations,
        EscapementError::LeaseExhausted
    );
    let now = Clock::get()?.unix_timestamp;
    require!(now <= lease.expires_at, EscapementError::LeaseExpiredError);

    // CPI into the template program: bump the lease counter.
    let cpi_accounts = crate::escapement_template::cpi::accounts::BumpCounter {
        counter: ctx.accounts.counter.to_account_info(),
        crank: ctx.accounts.crank.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(crate::escapement_template::ID, cpi_accounts);
    crate::escapement_template::cpi::bump_counter(cpi_ctx, lease.key())?;

    lease.iterations_done = lease
        .iterations_done
        .checked_add(1)
        .ok_or(EscapementError::Overflow)?;
    lease.last_tick_at = now;
    let seq = lease.iterations_done;
    if seq >= lease.iterations {
        lease.status = STATUS_EXHAUSTED;
    }

    emit!(TickFired {
        lease: lease.key(),
        seq,
        success: true,
        unix_ts: now,
    });
    Ok(())
}
