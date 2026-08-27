#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, vec, Address, BytesN, Env, IntoVal, String, Symbol, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Case { pub id: u32, pub escrow: Address, pub milestone_id: u32, pub client: Address, pub freelancer: Address, pub open: bool }

#[contractevent(topics = ["meridian", "dispute_opened"])]
pub struct DisputeOpened { #[topic] case_id: u32, milestone_id: u32 }
#[contractevent(topics = ["meridian", "evidence_submitted"])]
pub struct EvidenceSubmitted { #[topic] case_id: u32, party: Address }
#[contractevent(topics = ["meridian", "dispute_resolved"])]
pub struct DisputeResolved { #[topic] case_id: u32, release_to_freelancer: bool }

#[contracttype]
#[derive(Clone)]
enum DataKey { Admin, Arbitrator, Reputation, Factory, NextCase, Case(u32), Evidence(u32, Address) }

#[contract]
pub struct ArbitrationContract;

#[contractimpl]
impl ArbitrationContract {
    pub fn initialize(env: Env, admin: Address, arbitrator: Address, reputation: Address, factory: Address) {
        if env.storage().instance().has(&DataKey::Admin) { panic!("already initialized"); }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Arbitrator, &arbitrator);
        env.storage().instance().set(&DataKey::Reputation, &reputation);
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage().instance().set(&DataKey::NextCase, &0u32);
    }

    pub fn open_case(env: Env, escrow_address: Address, milestone_id: u32, caller: Address) -> u32 {
        let factory: Address = env.storage().instance().get(&DataKey::Factory).unwrap();
        if caller != factory { panic!("factory only"); }
        caller.require_auth();
        let registered: bool = env.invoke_contract(&factory, &Symbol::new(&env, "is_registered_escrow"), vec![&env, escrow_address.clone().into_val(&env)]);
        if !registered { panic!("unregistered escrow"); }
        let client: Address = env.invoke_contract(&escrow_address, &Symbol::new(&env, "get_client"), Vec::new(&env));
        let freelancer: Address = env.invoke_contract(&escrow_address, &Symbol::new(&env, "get_freelancer"), Vec::new(&env));
        let id: u32 = env.storage().instance().get(&DataKey::NextCase).unwrap_or(0);
        let case = Case { id, escrow: escrow_address, milestone_id, client, freelancer, open: true };
        env.storage().persistent().set(&DataKey::Case(id), &case);
        env.storage().instance().set(&DataKey::NextCase, &(id + 1));
        DisputeOpened { case_id: id, milestone_id }.publish(&env);
        id
    }

    pub fn submit_evidence(env: Env, case_id: u32, party: Address, evidence_hash: BytesN<32>) {
        party.require_auth();
        let case = Self::case(&env, case_id);
        if !case.open || (party != case.client && party != case.freelancer) { panic!("unauthorized evidence"); }
        env.storage().persistent().set(&DataKey::Evidence(case_id, party.clone()), &evidence_hash);
        EvidenceSubmitted { case_id, party }.publish(&env);
    }

    pub fn resolve(env: Env, case_id: u32, release_to_freelancer: bool) {
        let arbitrator: Address = env.storage().instance().get(&DataKey::Arbitrator).unwrap(); arbitrator.require_auth();
        let mut case = Self::case(&env, case_id);
        if !case.open { panic!("case is closed"); }
        env.invoke_contract::<()>(&case.escrow, &Symbol::new(&env, "resolve_from_arbitration"), vec![&env, case.milestone_id.into_val(&env), release_to_freelancer.into_val(&env), env.current_contract_address().into_val(&env)]);
        let reputation: Address = env.storage().instance().get(&DataKey::Reputation).unwrap();
        let (winner, loser) = if release_to_freelancer { (case.freelancer.clone(), case.client.clone()) } else { (case.client.clone(), case.freelancer.clone()) };
        Self::update_reputation(&env, &reputation, winner, 6, String::from_str(&env, "dispute_resolved"));
        Self::update_reputation(&env, &reputation, loser, -2, String::from_str(&env, "dispute_lost"));
        case.open = false;
        env.storage().persistent().set(&DataKey::Case(case_id), &case);
        DisputeResolved { case_id, release_to_freelancer }.publish(&env);
    }

    pub fn get_case(env: Env, case_id: u32) -> Case { Self::case(&env, case_id) }
    fn case(env: &Env, id: u32) -> Case { env.storage().persistent().get(&DataKey::Case(id)).unwrap() }
    fn update_reputation(env: &Env, reputation: &Address, address: Address, delta: i32, reason: String) { env.invoke_contract::<i32>(reputation, &Symbol::new(env, "update_score"), vec![env, address.into_val(env), delta.into_val(env), reason.into_val(env), env.current_contract_address().into_val(env)]); }
}

#[cfg(test)]
mod test;
