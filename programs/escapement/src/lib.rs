use anchor_lang::prelude::*;

declare_id!("KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z");

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_program!(escapement_template);

#[program]
pub mod escapement {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        authority: Pubkey,
        fee_base: u64,
        fee_per_tick: u64,
    ) -> Result<()> {
        crate::instructions::initialize_market::handle_initialize_market(ctx, authority, fee_base, fee_per_tick)
    }

    pub fn set_market_config(
        ctx: Context<SetMarketConfig>,
        fee_base: u64,
        fee_per_tick: u64,
    ) -> Result<()> {
        crate::instructions::set_market_config::handle_set_config(ctx, fee_base, fee_per_tick)
    }

    pub fn register_program(
        ctx: Context<RegisterProgram>,
        ix_discriminator: [u8; 8],
    ) -> Result<()> {
        crate::instructions::register_program::handle_register_program(ctx, ix_discriminator)
    }

    pub fn set_program_status(ctx: Context<SetProgramStatus>, status: u8) -> Result<()> {
        crate::instructions::set_program_status::handle_set_status(ctx, status)
    }

    pub fn mint_lease(ctx: Context<MintLease>, interval_ms: u64, iterations: u32) -> Result<()> {
        crate::instructions::mint_lease::handle_mint_lease(ctx, interval_ms, iterations)
    }

    pub fn crank_tick(ctx: Context<CrankTick>) -> Result<()> {
        crate::instructions::crank_tick::handle_crank_tick(ctx)
    }

    pub fn settle_fees(ctx: Context<SettleFees>) -> Result<()> {
        crate::instructions::settle_fees::handle_settle_fees(ctx)
    }

    pub fn expire_lease(ctx: Context<ExpireLease>) -> Result<()> {
        crate::instructions::expire_lease::handle_expire_lease(ctx)
    }
}
