use anchor_lang::prelude::*;

pub const MARKET_SEED: &[u8] = b"market";
pub const BUYER_SEED: &[u8] = b"buyer";
pub const REGISTERED_PROGRAM_SEED: &[u8] = b"program";
pub const LEASE_SEED: &[u8] = b"lease";
pub const VAULT_SEED: &[u8] = b"vault";

/// Lease status values.
pub const STATUS_ACTIVE: u8 = 0;
pub const STATUS_EXHAUSTED: u8 = 1;
pub const STATUS_SETTLED: u8 = 2;
pub const STATUS_EXPIRED: u8 = 3;

/// Registered program status values.
pub const PROGRAM_STATUS_ACTIVE: u8 = 0;
pub const PROGRAM_STATUS_PAUSED: u8 = 1;

/// Grace window after the nominal expiry during which ticks still fire.
pub const GRACE_SECS: i64 = 60;
