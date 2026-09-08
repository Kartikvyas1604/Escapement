use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::{
    constants::*,
    state::*,
    EscapementError,
};

/// Mints an Escapement lease: a time-bounded right to scheduled execution.
/// The prepaid fee is escrowed in the vault PDA and settles after ticks fire.
#[derive(Accounts)]
pub struct MintLease<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(seeds = [MARKET_SEED], bump)]
    pub market: Account<'info, Market>,
    /// Program template the lease cranks.
    #[account(
        seeds = [REGISTERED_PROGRAM_SEED, registered_program.authority.as_ref(), registered_program.template_id.as_ref()],
        bump
    )]
    pub registered_program: Account<'info, RegisteredProgram>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + BuyerState::INIT_SPACE,
        seeds = [BUYER_SEED, buyer.key().as_ref()],
        bump
    )]
    pub buyer_state: Account<'info, BuyerState>,
    #[account(
        init,
        payer = buyer,
        space = 8 + Lease::INIT_SPACE,
        seeds = [LEASE_SEED, buyer.key().as_ref(), &buyer_state.next_index.to_le_bytes()],
        bump
    )]
    pub lease: Account<'info, Lease>,
    /// CHECK: fee escrow vault, a system-owned PDA.
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_mint_lease(ctx: Context<MintLease>, interval_ms: u64, iterations: u32) -> Result<()> {
    require!(
        ctx.accounts.registered_program.status == PROGRAM_STATUS_ACTIVE,
        EscapementError::ProgramPaused
    );

    let market = &ctx.accounts.market;
    let fee_prepaid = market
        .fee_base
        .checked_add(
            (market.fee_per_tick as u128)
                .checked_mul(iterations as u128)
                .and_then(|v| u64::try_from(v).ok())
                .ok_or(EscapementError::Overflow)?,
        )
        .ok_or(EscapementError::Overflow)?;

    // Escrow the prepaid fee in the vault.
    system_program::transfer(
        CpiContext::new(
            system_program::ID,
            system_program::Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
            },
        ),
        fee_prepaid,
    )?;

    let clock = Clock::get()?;
    let now = clock.unix_timestamp;
    let run_seconds = (interval_ms
        .checked_mul(iterations as u64)
        .ok_or(EscapementError::Overflow)?
        / 1000) as i64;
    let expires_at = now
        .checked_add(run_seconds)
        .and_then(|v| v.checked_add(GRACE_SECS))
        .ok_or(EscapementError::Overflow)?;

    let lease = &mut ctx.accounts.lease;
    lease.buyer = ctx.accounts.buyer.key();
    lease.registered_program = ctx.accounts.registered_program.key();
    lease.template_id = ctx.accounts.registered_program.template_id;
    lease.interval_ms = interval_ms;
    lease.iterations = iterations;
    lease.iterations_done = 0;
    lease.fee_prepaid = fee_prepaid;
    lease.fee_settled = 0;
    lease.status = STATUS_ACTIVE;
    lease.created_at = now;
    lease.expires_at = expires_at;
    lease.last_tick_at = 0;
    lease.bump = ctx.bumps.lease;

    ctx.accounts.buyer_state.next_index = ctx
        .accounts
        .buyer_state
        .next_index
        .checked_add(1)
        .ok_or(EscapementError::Overflow)?;

    emit!(LeaseMinted {
        lease: lease.key(),
        buyer: lease.buyer,
        interval_ms,
        iterations,
        fee_prepaid,
        expires_at,
    });
    Ok(())
}
