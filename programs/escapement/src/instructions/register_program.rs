use anchor_lang::prelude::*;

use crate::{constants::*, state::*};

#[derive(Accounts)]
pub struct RegisterProgram<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + RegisteredProgram::INIT_SPACE,
        seeds = [REGISTERED_PROGRAM_SEED, authority.key().as_ref(), template_program.key().as_ref()],
        bump
    )]
    pub registered_program: Account<'info, RegisteredProgram>,
    /// CHECK: the template program id being registered for cranking.
    pub template_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handle_register_program(ctx: Context<RegisterProgram>, ix_discriminator: [u8; 8]) -> Result<()> {
    let registered_program = &mut ctx.accounts.registered_program;
    registered_program.authority = ctx.accounts.authority.key();
    registered_program.template_id = ctx.accounts.template_program.key();
    registered_program.ix_discriminator = ix_discriminator;
    registered_program.status = PROGRAM_STATUS_ACTIVE;
    registered_program.bump = ctx.bumps.registered_program;

    emit!(ProgramRegistered {
        registered_program: registered_program.key(),
        authority: registered_program.authority,
        template_id: registered_program.template_id,
    });
    Ok(())
}
