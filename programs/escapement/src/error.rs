use anchor_lang::prelude::*;

#[error_code]
pub enum EscapementError {
    #[msg("Market is already initialized")]
    MarketAlreadyInitialized,
    #[msg("This program template is already registered for this authority")]
    ProgramAlreadyRegistered,
    #[msg("The registered program is paused — new leases cannot be minted against it")]
    ProgramPaused,
    #[msg("Lease is not active and cannot be cranked")]
    LeaseNotActive,
    #[msg("Lease has consumed all of its iterations")]
    LeaseExhausted,
    #[msg("Lease has expired")]
    LeaseExpiredError,
    #[msg("Only the buyer or the market authority may crank this lease")]
    UnauthorizedCrank,
    #[msg("Only the market authority may call this instruction")]
    UnauthorizedAuthority,
    #[msg("Nothing to settle — fire at least one tick first")]
    NoTicksToSettle,
    #[msg("Lease cannot be expired yet and only the buyer may cancel early")]
    LeaseNotExpirable,
    #[msg("Lease references a different registered program")]
    LeaseProgramMismatch,
    #[msg("Template program does not match the registered template")]
    TemplateMismatch,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Invalid program status value")]
    InvalidStatus,
}
