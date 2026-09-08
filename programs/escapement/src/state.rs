use anchor_lang::prelude::*;

use crate::constants::*;

/// Global market config. PDA, receives settled fees via its authority.
#[account]
#[derive(InitSpace)]
pub struct Market {
    /// Admin: can retune pricing, pause programs. Receives settled fees.
    pub authority: Pubkey,
    /// Flat base fee per lease, in lamports.
    pub fee_base: u64,
    /// Fee per tick, in lamports.
    pub fee_per_tick: u64,
    pub bump: u8,
}

/// Per-buyer lease index so lease PDAs are deterministic and enumerable.
#[account]
#[derive(InitSpace)]
pub struct BuyerState {
    /// Index the buyer's next lease will use.
    pub next_index: u32,
}

/// A program template registered by a provider.
#[account]
#[derive(InitSpace)]
pub struct RegisteredProgram {
    /// Provider wallet that owns this registration.
    pub authority: Pubkey,
    /// Program cranked on every tick.
    pub template_id: Pubkey,
    /// Discriminator of the template instruction invoked per tick.
    pub ix_discriminator: [u8; 8],
    /// PROGRAM_STATUS_ACTIVE or PROGRAM_STATUS_PAUSED.
    pub status: u8,
    pub bump: u8,
}

/// The market object: a time-bounded right to scheduled execution.
#[account]
#[derive(InitSpace)]
pub struct Lease {
    pub buyer: Pubkey,
    /// RegisteredProgram PDA this lease was minted against.
    pub registered_program: Pubkey,
    /// Target program being cranked (denormalized for cheap crank checks).
    pub template_id: Pubkey,
    /// Requested cadence in ms. Enforced by the crank scheduler; the chain
    /// enforces the cap, expiry, and fee accounting.
    pub interval_ms: u64,
    pub iterations: u32,
    pub iterations_done: u32,
    /// Escrowed in the vault PDA at mint time.
    pub fee_prepaid: u64,
    /// Portion paid out to the market authority.
    pub fee_settled: u64,
    /// STATUS_ACTIVE | STATUS_EXHAUSTED | STATUS_SETTLED | STATUS_EXPIRED
    pub status: u8,
    pub created_at: i64,
    /// Nominal expiry = created_at + interval * iterations + grace.
    pub expires_at: i64,
    /// Last tick, in unix seconds (reference data for the scheduler).
    pub last_tick_at: i64,
    pub bump: u8,
}

impl Lease {
    pub fn is_settleable(&self) -> bool {
        self.iterations_done > 0
            && (self.status == STATUS_ACTIVE || self.status == STATUS_EXHAUSTED)
    }
}

#[event]
#[derive(Clone, Copy)]
pub struct MarketInitialized {
    pub authority: Pubkey,
    pub fee_base: u64,
    pub fee_per_tick: u64,
}

#[event]
#[derive(Clone, Copy)]
pub struct ProgramRegistered {
    pub registered_program: Pubkey,
    pub authority: Pubkey,
    pub template_id: Pubkey,
}

#[event]
#[derive(Clone, Copy)]
pub struct LeaseMinted {
    pub lease: Pubkey,
    pub buyer: Pubkey,
    pub interval_ms: u64,
    pub iterations: u32,
    pub fee_prepaid: u64,
    pub expires_at: i64,
}

#[event]
#[derive(Clone, Copy)]
pub struct TickFired {
    pub lease: Pubkey,
    pub seq: u32,
    pub success: bool,
    pub unix_ts: i64,
}

#[event]
#[derive(Clone, Copy)]
pub struct LeaseSettled {
    pub lease: Pubkey,
    pub amount: u64,
    pub ticks_billed: u32,
}

#[event]
#[derive(Clone, Copy)]
pub struct LeaseExpired {
    pub lease: Pubkey,
    pub amount_swept: u64,
}
