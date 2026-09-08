use anchor_lang::prelude::*;

use crate::{constants::MARKET_SEED, state::Market, EscapementError};

#[derive(Accounts)]
pub struct SetMarketConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [MARKET_SEED],
        bump,
        has_one = authority @ EscapementError::UnauthorizedAuthority
    )]
    pub market: Account<'info, Market>,
}

pub fn handle_set_config(
    ctx: Context<SetMarketConfig>,
    fee_base: u64,
    fee_per_tick: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.fee_base = fee_base;
    market.fee_per_tick = fee_per_tick;
    Ok(())
}
