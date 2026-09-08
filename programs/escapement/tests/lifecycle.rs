use {
    anchor_lang::{
        prelude::Pubkey,
        solana_program::{instruction::Instruction, system_program},
        AccountDeserialize, InstructionData, ToAccountMetas,
    },
    escapement::{
        self,
        constants::*,
        state::Lease,
    },
    escapement_template::{constants::COUNTER_SEED, state::Counter},
    litesvm::LiteSVM,
    solana_keypair::Keypair,
    solana_message::{Message, VersionedMessage},
    solana_signer::Signer,
    solana_transaction::versioned::VersionedTransaction,
};

const FEE_BASE: u64 = 5_000;
const FEE_PER_TICK: u64 = 10_000;
const LAMPORTS: u64 = 5_000_000_000;

struct Env {
    svm: LiteSVM,
    authority: Keypair,
    provider: Keypair,
    buyer: Keypair,
    stranger: Keypair,
    market: Pubkey,
    registered_program: Pubkey,
    vault: Pubkey,
}

fn build(
    svm: &mut LiteSVM,
    payer: &Keypair,
    ix: Instruction,
    extra_signers: &[&Keypair],
) -> Result<(), String> {
    svm.expire_blockhash();
    let blockhash = svm.latest_blockhash();
    let msg = Message::new_with_blockhash(&[ix], Some(&payer.pubkey()), &blockhash);
    let mut signers: Vec<&Keypair> = vec![payer];
    signers.extend_from_slice(extra_signers);
    let tx = VersionedTransaction::try_new(VersionedMessage::Legacy(msg), &signers).unwrap();
    svm.send_transaction(tx).map(|_| ()).map_err(|e| format!("{e:?}"))
}

fn send(
    svm: &mut LiteSVM,
    payer: &Keypair,
    ix: Instruction,
    extra_signers: &[&Keypair],
) -> Result<(), String> {
    build(svm, payer, ix, extra_signers)
}

fn derive(seeds: &[&[u8]], program_id: &Pubkey) -> Pubkey {
    Pubkey::find_program_address(seeds, program_id).0
}

fn setup() -> Env {
    let mut svm = LiteSVM::new();
    svm.add_program(
        escapement::ID,
        include_bytes!(concat!(
            env!("CARGO_TARGET_TMPDIR"),
            "/../deploy/escapement.so"
        )),
    )
    .unwrap();
    svm.add_program(
        escapement_template::ID,
        include_bytes!(concat!(
            env!("CARGO_TARGET_TMPDIR"),
            "/../deploy/escapement_template.so"
        )),
    )
    .unwrap();

    let authority = Keypair::new();
    let provider = Keypair::new();
    let buyer = Keypair::new();
    let stranger = Keypair::new();
    for kp in [&authority, &provider, &buyer, &stranger] {
        svm.airdrop(&kp.pubkey(), LAMPORTS).unwrap();
    }

    let market = derive(&[MARKET_SEED], &escapement::ID);
    let registered_program = derive(
        &[REGISTERED_PROGRAM_SEED, provider.pubkey().as_ref(), escapement_template::ID.as_ref()],
        &escapement::ID,
    );
    let vault = derive(&[VAULT_SEED], &escapement::ID);

    // initialize_market
    let ix = Instruction::new_with_bytes(
        escapement::ID,
        &escapement::instruction::InitializeMarket {
            authority: authority.pubkey(),
            fee_base: FEE_BASE,
            fee_per_tick: FEE_PER_TICK,
        }
        .data(),
        escapement::accounts::InitializeMarket {
            payer: authority.pubkey(),
            market,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    build(&mut svm, &authority, ix, &[]).unwrap();

    // register_program (counter template)
    let ix = Instruction::new_with_bytes(
        escapement::ID,
        &escapement::instruction::RegisterProgram {
            ix_discriminator: [0u8; 8],
        }
        .data(),
        escapement::accounts::RegisterProgram {
            authority: provider.pubkey(),
            registered_program,
            template_program: escapement_template::ID,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    build(&mut svm, &provider, ix, &[]).unwrap();

    Env {
        svm,
        authority,
        provider,
        buyer,
        stranger,
        market,
        registered_program,
        vault,
    }
}

fn mint_lease(env: &mut Env, interval_ms: u64, iterations: u32) -> Pubkey {
    let buyer_state = derive(&[BUYER_SEED, env.buyer.pubkey().as_ref()], &escapement::ID);
    let lease = derive(
        &[LEASE_SEED, env.buyer.pubkey().as_ref(), &0u32.to_le_bytes()],
        &escapement::ID,
    );
    let ix = Instruction::new_with_bytes(
        escapement::ID,
        &escapement::instruction::MintLease {
            interval_ms,
            iterations,
        }
        .data(),
        escapement::accounts::MintLease {
            buyer: env.buyer.pubkey(),
            market: env.market,
            registered_program: env.registered_program,
            buyer_state,
            lease,
            vault: env.vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    build(&mut env.svm, &env.buyer, ix, &[]).unwrap();
    lease
}

fn fetch_lease(env: &Env, lease: &Pubkey) -> Lease {
    let account = env.svm.get_account(lease).unwrap();
    Lease::try_deserialize(&mut account.data.as_slice()).unwrap()
}

fn fetch_counter(env: &Env, lease: &Pubkey) -> Counter {
    let counter = derive(&[COUNTER_SEED, lease.as_ref()], &escapement_template::ID);
    let account = env.svm.get_account(&counter).unwrap();
    Counter::try_deserialize(&mut account.data.as_slice()).unwrap()
}

fn crank_ix(env: &Env, lease: &Pubkey) -> Instruction {
    let counter = derive(&[COUNTER_SEED, lease.as_ref()], &escapement_template::ID);
    Instruction::new_with_bytes(
        escapement::ID,
        &escapement::instruction::CrankTick {}.data(),
        escapement::accounts::CrankTick {
            crank: env.buyer.pubkey(),
            market: env.market,
            lease: *lease,
            registered_program: env.registered_program,
            template_program: escapement_template::ID,
            counter,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    )
}

#[test]
fn lease_lifecycle_mint_crank_settle() {
    let mut env = setup();
    let iterations = 3u32;
    let lease = mint_lease(&mut env, 1_000, iterations);

    // Lease escrowed the full prepaid fee.
    let fee_prepaid = FEE_BASE + FEE_PER_TICK * iterations as u64;
    assert_eq!(env.svm.get_balance(&env.vault).unwrap_or(0), fee_prepaid);
    let lease_state = fetch_lease(&env, &lease);
    assert_eq!(lease_state.status, STATUS_ACTIVE);
    assert_eq!(lease_state.fee_prepaid, fee_prepaid);
    assert_eq!(lease_state.iterations_done, 0);

    // Crank all ticks as the buyer.
    let ix = crank_ix(&env, &lease);
    for _ in 0..iterations {
        build(&mut env.svm, &env.buyer, ix.clone(), &[]).unwrap();
    }
    let counter = fetch_counter(&env, &lease);
    assert_eq!(counter.count, 3);
    let lease_state = fetch_lease(&env, &lease);
    assert_eq!(lease_state.iterations_done, 3);
    assert_eq!(lease_state.status, STATUS_EXHAUSTED);

    // Settle: proportional share = full prepaid fee.
    let authority_before = env.svm.get_balance(&env.authority.pubkey()).unwrap();
    let ix = Instruction::new_with_bytes(
        escapement::ID,
        &escapement::instruction::SettleFees {}.data(),
        escapement::accounts::SettleFees {
            fee_receiver: env.authority.pubkey(),
            market: env.market,
            lease,
            vault: env.vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    send(&mut env.svm, &env.stranger, ix, &[]).unwrap(); // permissionless

    assert_eq!(env.svm.get_balance(&env.vault).unwrap_or(0), 0);
    assert_eq!(
        env.svm.get_balance(&env.authority.pubkey()).unwrap(),
        authority_before + fee_prepaid
    );
    let lease_state = fetch_lease(&env, &lease);
    assert_eq!(lease_state.fee_settled, fee_prepaid);
    assert_eq!(lease_state.status, STATUS_SETTLED);
}

#[test]
fn crank_enforces_iteration_cap() {
    let mut env = setup();
    let iterations = 2u32;
    let lease = mint_lease(&mut env, 1_000, iterations);

    let ix = crank_ix(&env, &lease);
    for _ in 0..iterations {
        build(&mut env.svm, &env.buyer, ix.clone(), &[]).unwrap();
    }
    // One tick over the cap must fail with LeaseExhausted.
    let ix = crank_ix(&env, &lease);
    let res = build(&mut env.svm, &env.buyer, ix, &[]);
    assert!(res.is_err());
    let counter = fetch_counter(&env, &lease);
    assert_eq!(counter.count, 2);
}

#[test]
fn crank_rejects_strangers() {
    let mut env = setup();
    let lease = mint_lease(&mut env, 1_000, 2);

    // Buyer crank works; stranger crank must not.
    let mut ix = crank_ix(&env, &lease);
    let _ = &env.svm;
    ix.accounts[0] = anchor_lang::solana_program::instruction::AccountMeta {
        pubkey: env.stranger.pubkey(),
        is_signer: true,
        is_writable: true,
    };
    let res = build(&mut env.svm, &env.stranger, ix, &[]);
    assert!(res.is_err());
    assert!(env.svm.get_account(&derive(
        &[COUNTER_SEED, lease.as_ref()],
        &escapement_template::ID
    ))
    .is_none());
}

#[test]
fn settle_requires_at_least_one_tick() {
    let mut env = setup();
    let lease = mint_lease(&mut env, 1_000, 2);
    let ix = Instruction::new_with_bytes(
        escapement::ID,
        &escapement::instruction::SettleFees {}.data(),
        escapement::accounts::SettleFees {
            fee_receiver: env.authority.pubkey(),
            market: env.market,
            lease,
            vault: env.vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    let res = send(&mut env.svm, &env.buyer, ix, &[]);
    assert!(res.is_err());
    assert!(fetch_lease(&env, &lease).fee_settled == 0);
}

#[test]
fn partial_settle_is_proportional() {
    let mut env = setup();
    let iterations = 4u32;
    let lease = mint_lease(&mut env, 1_000, iterations);

    let ix = crank_ix(&env, &lease);
    build(&mut env.svm, &env.buyer, ix, &[]).unwrap();

    let fee_prepaid = FEE_BASE + FEE_PER_TICK * iterations as u64;
    let expected = fee_prepaid * 1 / 4;
    let authority_before = env.svm.get_balance(&env.authority.pubkey()).unwrap();
    let ix = Instruction::new_with_bytes(
        escapement::ID,
        &escapement::instruction::SettleFees {}.data(),
        escapement::accounts::SettleFees {
            fee_receiver: env.authority.pubkey(),
            market: env.market,
            lease,
            vault: env.vault,
            system_program: system_program::ID,
        }
        .to_account_metas(None),
    );
    send(&mut env.svm, &env.buyer, ix, &[]).unwrap();

    assert_eq!(env.svm.get_balance(&env.authority.pubkey()).unwrap(), authority_before + expected);
    assert_eq!(fetch_lease(&env, &lease).fee_settled, expected);
}
