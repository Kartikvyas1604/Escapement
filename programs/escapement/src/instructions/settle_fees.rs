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

    // Total earned so far is the proportional share of the prepaid fee.
    let total_due = ((lease.fee_prepaid as u128)
        .checked_mul(lease.iterations_done as u128)
        .and_then(|v| v.checked_div(lease.iterations as u128))
        .and_then(|v| u64::try_from(v).ok())
        .ok_or(EscapementError::Overflow))?;

    // Settlement is incremental: pay only the newly earned share. A lease that
    // still has iterations left stays settleable, so the remainder of the
    // escrow is never stranded — it settles on later ticks or sweeps on expiry.
    let settled_now = total_due
        .checked_sub(lease.fee_settled)
        .ok_or(EscapementError::Overflow)?;
    require!(settled_now > 0, EscapementError::NothingToSettle);

    let vault_signer = &[VAULT_SEED, &[ctx.bumps.vault]];
    system_program::transfer(
        CpiContext::new_with_signer(
            system_program::ID,
            system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.fee_receiver.to_account_info(),
            },
            &[vault_signer],
        ),
        settled_now,
    )?;

    lease.fee_settled = total_due;
    // Only a fully executed lease reaches the terminal settled state. A
    // partially executed one keeps its live status so remaining escrow
    // remains settleable.
    if lease.iterations_done >= lease.iterations {
        lease.status = STATUS_SETTLED;
    }

    emit!(LeaseSettled {
        lease: lease.key(),
        amount: settled_now,
        ticks_billed: lease.iterations_done,
    });
    Ok(())
}
