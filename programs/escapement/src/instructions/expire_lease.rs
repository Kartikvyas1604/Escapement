use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::{constants::*, state::*, EscapementError};

/// Expires a lease. Past nominal expiry anyone may expire it; the buyer may
/// cancel early. Remaining escrow sweeps to the market authority — the MVP
/// policy is no refunds for unused iterations (a lease is not a standing
/// cron and unused time expires).
#[derive(Accounts)]
pub struct ExpireLease<'info> {
    /// Buyer (early cancel) or any payer (past-expiry sweep).
    #[account(mut)]
    pub signer: Signer<'info>,
    #[account(seeds = [MARKET_SEED], bump)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub lease: Account<'info, Lease>,
    /// CHECK: must equal the market authority; receives the sweep.
    #[account(mut)]
    pub fee_receiver: UncheckedAccount<'info>,
    /// CHECK: fee escrow vault PDA.
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_expire_lease(ctx: Context<ExpireLease>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.fee_receiver.key(),
        ctx.accounts.market.authority,
        EscapementError::UnauthorizedAuthority
    );

    let lease = &mut ctx.accounts.lease;
    require!(
        lease.status == STATUS_ACTIVE || lease.status == STATUS_EXHAUSTED,
        EscapementError::LeaseNotActive
    );

    let now = Clock::get()?.unix_timestamp;
    if now <= lease.expires_at {
        require!(
            ctx.accounts.signer.key() == lease.buyer,
            EscapementError::LeaseNotExpirable
        );
    }

    let swept = lease.fee_prepaid.saturating_sub(lease.fee_settled);
    if swept > 0 {
        system_program::transfer(
            CpiContext::new(
                system_program::ID,
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.fee_receiver.to_account_info(),
                },
            ),
            swept,
        )?;
    }

    lease.status = STATUS_EXPIRED;
    emit!(LeaseExpired {
        lease: lease.key(),
        amount_swept: swept,
    });
    Ok(())
}
