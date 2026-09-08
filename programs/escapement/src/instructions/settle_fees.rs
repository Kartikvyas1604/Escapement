use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::{constants::*, state::*, EscapementError};

/// Settles the fee accounting for a lease: pays the executed share of the
/// prepaid fee from the vault to the market authority. Permissionless —
/// anyone can trigger an honest settle, the amount is derived on-chain.
#[derive(Accounts)]
pub struct SettleFees<'info> {
    /// CHECK: must equal the market authority; receives settled fees.
    #[account(mut)]
    pub fee_receiver: UncheckedAccount<'info>,
    #[account(seeds = [MARKET_SEED], bump)]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub lease: Account<'info, Lease>,
    /// CHECK: fee escrow vault PDA.
    #[account(mut, seeds = [VAULT_SEED], bump)]
    pub vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_settle_fees(ctx: Context<SettleFees>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.fee_receiver.key(),
        ctx.accounts.market.authority,
        EscapementError::UnauthorizedAuthority
    );

    let lease = &mut ctx.accounts.lease;
    require!(
        lease.is_settleable(),
        if lease.iterations_done == 0 {
            EscapementError::NoTicksToSettle
        } else {
            EscapementError::LeaseNotActive
        }
    );

    let settled = ((lease.fee_prepaid as u128)
        .checked_mul(lease.iterations_done as u128)
        .and_then(|v| v.checked_div(lease.iterations as u128))
        .and_then(|v| u64::try_from(v).ok())
        .ok_or(EscapementError::Overflow))?;

    system_program::transfer(
        CpiContext::new(
            system_program::ID,
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
        ),
        settled,
    )?;

    lease.fee_settled = settled;
    lease.status = STATUS_SETTLED;

    emit!(LeaseSettled {
        lease: lease.key(),
        amount: settled,
        ticks_billed: lease.iterations_done,
    });
    Ok(())
}
