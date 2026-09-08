use anchor_lang::prelude::*;

declare_id!("E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi");

pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

pub use constants::*;
pub use instructions::*;
pub use state::*;

#[program]
pub mod escapement_template {
    use super::*;

    pub fn bump_counter(ctx: Context<BumpCounter>, lease: Pubkey) -> Result<()> {
        crate::instructions::bump_counter::handle_bump_counter(ctx, lease)
    }
}
