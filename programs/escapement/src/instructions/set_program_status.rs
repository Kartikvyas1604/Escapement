use anchor_lang::prelude::*;

use crate::{constants::*, state::RegisteredProgram, EscapementError};

#[derive(Accounts)]
pub struct SetProgramStatus<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [REGISTERED_PROGRAM_SEED, registered_program.authority.as_ref(), registered_program.template_id.as_ref()],
        bump,
        has_one = authority @ EscapementError::UnauthorizedAuthority
    )]
    pub registered_program: Account<'info, RegisteredProgram>,
}

pub fn handle_set_status(ctx: Context<SetProgramStatus>, status: u8) -> Result<()> {
    require!(
        status == PROGRAM_STATUS_ACTIVE || status == PROGRAM_STATUS_PAUSED,
        EscapementError::InvalidStatus
    );
    ctx.accounts.registered_program.status = status;
    Ok(())
}
