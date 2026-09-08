use anchor_lang::prelude::*;

use crate::{constants::*, state::*};

#[derive(Accounts)]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED],
        bump
    )]
    pub market: Account<'info, Market>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize_market(
    ctx: Context<InitializeMarket>,
    authority: Pubkey,
    fee_base: u64,
    fee_per_tick: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    market.authority = authority;
    market.fee_base = fee_base;
    market.fee_per_tick = fee_per_tick;
    market.bump = ctx.bumps.market;

    emit!(MarketInitialized {
        authority,
        fee_base,
        fee_per_tick,
    });
    Ok(())
}
