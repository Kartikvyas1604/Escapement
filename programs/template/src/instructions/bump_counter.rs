use anchor_lang::prelude::*;

use crate::{constants::COUNTER_SEED, error::TemplateError, state::{Bumped, Counter}};

/// Bumps the counter for a lease. Invoked by the Escapement crank via CPI;
/// the crank pays one-time rent when the counter is first created.
#[derive(Accounts)]
#[instruction(lease: Pubkey)]
pub struct BumpCounter<'info> {
    #[account(
        init_if_needed,
        payer = crank,
        space = 8 + Counter::INIT_SPACE,
        seeds = [COUNTER_SEED, lease.as_ref()],
        bump
    )]
    pub counter: Account<'info, Counter>,
    /// Crank authority (buyer session key, buyer wallet, or Escapement
    /// protocol crank). Pays rent on first tick.
    #[account(mut)]
    pub crank: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_bump_counter(ctx: Context<BumpCounter>, lease: Pubkey) -> Result<()> {
    if ctx.accounts.counter.lease != lease {
        // Freshly-created counters carry the zero pubkey; claim them.
        require!(
            ctx.accounts.counter.lease == Pubkey::default(),
            TemplateError::LeaseMismatch
        );
    }
    ctx.accounts.counter.lease = lease;
    ctx.accounts.counter.count = ctx
        .accounts
        .counter
        .count
        .checked_add(1)
        .ok_or(TemplateError::LeaseMismatch)?;

    let clock = Clock::get()?;
    emit!(Bumped {
        lease,
        count: ctx.accounts.counter.count,
        slot: clock.slot,
        unix_ts: clock.unix_timestamp,
    });
    msg!("Tick: lease {} count {}", lease, ctx.accounts.counter.count);
    Ok(())
}
