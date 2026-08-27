#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, vec, Address, BytesN, Env, IntoVal, String, Symbol};

#[contracttype]
#[derive(Clone)]
enum DataKey { Admin, EscrowWasmHash, Token, Reputation, Arbitration, RegisteredEscrow(Address) }

#[contractevent(topics = ["meridian", "escrow_created"])]
pub struct EscrowCreated { #[topic] client: Address, freelancer: Address, escrow: Address }

#[contract]
pub struct MeridianFactory;

#[contractimpl]
impl MeridianFactory {
    pub fn initialize(env: Env, admin: Address, escrow_wasm_hash: BytesN<32>, token: Address, reputation: Address, arbitration: Address) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("already initialized"); }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::EscrowWasmHash, &escrow_wasm_hash);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Reputation, &reputation);
        env.storage().instance().set(&DataKey::Arbitration, &arbitration);
    }

    pub fn create_escrow(env: Env, client: Address, freelancer: Address, salt: BytesN<32>) -> Address {
        client.require_auth();
        let wasm_hash: BytesN<32> = env.storage().instance().get(&DataKey::EscrowWasmHash).unwrap();
        let token: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let escrow = env.deployer().with_current_contract(salt).deploy_v2(wasm_hash, ());
        env.invoke_contract::<()>(&escrow, &Symbol::new(&env, "initialize"), vec![&env, client.into_val(&env), freelancer.into_val(&env), token.into_val(&env), env.current_contract_address().into_val(&env)]);
        env.storage().persistent().set(&DataKey::RegisteredEscrow(escrow.clone()), &true);
        EscrowCreated { client, freelancer, escrow: escrow.clone() }.publish(&env);
        escrow
    }

    pub fn is_registered_escrow(env: Env, escrow: Address) -> bool {
        env.storage().persistent().get(&DataKey::RegisteredEscrow(escrow)).unwrap_or(false)
    }

    pub fn get_arbitration(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Arbitration).unwrap()
    }

    // Escrow instances call through the factory so that the reputation contract
    // only accepts score changes from protocol-controlled call paths.
    pub fn record_approval(env: Env, freelancer: Address, caller: Address) {
        Self::require_registered(&env, &caller);
        caller.require_auth();
        let reputation: Address = env.storage().instance().get(&DataKey::Reputation).unwrap();
        env.invoke_contract::<i32>(&reputation, &Symbol::new(&env, "update_score"), vec![&env, freelancer.into_val(&env), 8_i32.into_val(&env), String::from_str(&env, "milestone_approved").into_val(&env), env.current_contract_address().into_val(&env)]);
    }

    pub fn open_case(env: Env, milestone_id: u32, caller: Address) -> u32 {
        Self::require_registered(&env, &caller);
        caller.require_auth();
        let arbitration: Address = env.storage().instance().get(&DataKey::Arbitration).unwrap();
        env.invoke_contract::<u32>(&arbitration, &Symbol::new(&env, "open_case"), vec![&env, caller.into_val(&env), milestone_id.into_val(&env), env.current_contract_address().into_val(&env)])
    }

    fn require_registered(env: &Env, escrow: &Address) {
        if !env.storage().persistent().get(&DataKey::RegisteredEscrow(escrow.clone())).unwrap_or(false) { panic!("unregistered escrow"); }
    }
}

#[cfg(test)]
mod test;
