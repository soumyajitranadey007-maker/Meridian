#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, Address, Env, String};

#[contracttype]
#[derive(Clone)]
enum DataKey { Admin, Factory, Arbitration, Score(Address) }

#[contractevent(topics = ["meridian", "reputation_updated"])]
pub struct ReputationUpdated { #[topic] address: Address, score: i32, reason: String }

#[contract]
pub struct ReputationContract;

#[contractimpl]
impl ReputationContract {
    pub fn initialize(env: Env, admin: Address, factory: Address, arbitration: Address) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("already initialized"); }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage().instance().set(&DataKey::Arbitration, &arbitration);
    }

    pub fn set_callers(env: Env, factory: Address, arbitration: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage().instance().set(&DataKey::Arbitration, &arbitration);
    }

    // `caller` is explicit so the contract can authenticate its allow-listed upstream invoker.
    pub fn update_score(env: Env, address: Address, delta: i32, reason: String, caller: Address) -> i32 {
        let factory: Address = env.storage().instance().get(&DataKey::Factory).unwrap();
        let arbitration: Address = env.storage().instance().get(&DataKey::Arbitration).unwrap();
        if caller != factory && caller != arbitration { panic!("unauthorized caller"); }
        caller.require_auth();
        let key = DataKey::Score(address.clone());
        let score: i32 = env.storage().persistent().get(&key).unwrap_or(0);
        let next = score.saturating_add(delta);
        env.storage().persistent().set(&key, &next);
        ReputationUpdated { address, score: next, reason }.publish(&env);
        next
    }

    pub fn get_score(env: Env, address: Address) -> i32 {
        env.storage().persistent().get(&DataKey::Score(address)).unwrap_or(0)
    }
}

#[cfg(test)]
mod test;
