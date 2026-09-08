use anchor_lang::prelude::*;

#[error_code]
pub enum TemplateError {
    #[msg("Counter was initialized for a different lease")]
    LeaseMismatch,
}
