use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Counter {
    /// Escapement lease this counter belongs to.
    pub lease: Pubkey,
    /// Number of ticks fired for the lease.
    pub count: u64,
}

#[event]
#[derive(Clone, Copy)]
pub struct Bumped {
    pub lease: Pubkey,
    pub count: u64,
    pub slot: u64,
    pub unix_ts: i64,
}
