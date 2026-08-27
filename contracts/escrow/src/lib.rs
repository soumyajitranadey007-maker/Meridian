#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, token, vec, Address, BytesN, Env, IntoVal, String, Symbol};

#[contracttype]
#[derive(Clone, Eq, PartialEq)]
pub enum MilestoneStatus { Draft, Funded, Submitted, Approved, Disputed, Released }

#[contracttype]
#[derive(Clone)]
pub struct Milestone { pub id: u32, pub description: String, pub amount: i128, pub status: MilestoneStatus, pub deliverable_hash: Option<BytesN<32>> }

#[contractevent(topics = ["meridian", "milestone_created"])]
pub struct MilestoneCreated { #[topic] milestone_id: u32, amount: i128 }
#[contractevent(topics = ["meridian", "milestone_funded"])]
pub struct MilestoneFunded { #[topic] milestone_id: u32, amount: i128 }
#[contractevent(topics = ["meridian", "milestone_submitted"])]
pub struct MilestoneSubmitted { #[topic] milestone_id: u32 }
#[contractevent(topics = ["meridian", "milestone_approved"])]
pub struct MilestoneApproved { #[topic] milestone_id: u32, amount: i128 }
#[contractevent(topics = ["meridian", "dispute_raised"])]
pub struct DisputeRaised { #[topic] milestone_id: u32, caller: Address }
#[contractevent(topics = ["meridian", "milestone_resolved"])]
pub struct MilestoneResolved { #[topic] milestone_id: u32, release_to_freelancer: bool }

#[contracttype]
#[derive(Clone)]
enum DataKey { Client, Freelancer, Token, Factory, NextMilestone, Milestone(u32) }

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    pub fn initialize(env: Env, client: Address, freelancer: Address, token: Address, factory: Address) {
        if env.storage().instance().has(&DataKey::Client) { panic!("already initialized"); }
        // Registered escrows are created and initialized atomically by the
        // factory, which already requires the client's authorization.
        env.storage().instance().set(&DataKey::Client, &client);
        env.storage().instance().set(&DataKey::Freelancer, &freelancer);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage().instance().set(&DataKey::NextMilestone, &0u32);
    }

    pub fn add_milestone(env: Env, description: String, amount: i128) -> u32 {
        let client = Self::client(&env); client.require_auth();
        if amount <= 0 { panic!("amount must be positive"); }
        let id: u32 = env.storage().instance().get(&DataKey::NextMilestone).unwrap_or(0);
        let milestone = Milestone { id, description, amount, status: MilestoneStatus::Draft, deliverable_hash: None };
        env.storage().persistent().set(&DataKey::Milestone(id), &milestone);
        env.storage().instance().set(&DataKey::NextMilestone, &(id + 1));
        MilestoneCreated { milestone_id: id, amount }.publish(&env);
        id
    }

    pub fn fund_milestone(env: Env, milestone_id: u32) {
        let client = Self::client(&env); client.require_auth();
        let mut milestone = Self::milestone(&env, milestone_id);
        if milestone.status != MilestoneStatus::Draft { panic!("milestone is not draft"); }
        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_address).transfer(&client, &env.current_contract_address(), &milestone.amount);
        milestone.status = MilestoneStatus::Funded;
        env.storage().persistent().set(&DataKey::Milestone(milestone_id), &milestone);
        MilestoneFunded { milestone_id, amount: milestone.amount }.publish(&env);
    }

    pub fn submit_milestone(env: Env, milestone_id: u32, deliverable_hash: BytesN<32>) {
        let freelancer: Address = env.storage().instance().get(&DataKey::Freelancer).unwrap(); freelancer.require_auth();
        let mut milestone = Self::milestone(&env, milestone_id);
        if milestone.status != MilestoneStatus::Funded { panic!("milestone is not funded"); }
        milestone.status = MilestoneStatus::Submitted;
        milestone.deliverable_hash = Some(deliverable_hash);
        env.storage().persistent().set(&DataKey::Milestone(milestone_id), &milestone);
        MilestoneSubmitted { milestone_id }.publish(&env);
    }

    pub fn approve_milestone(env: Env, milestone_id: u32) {
        let client = Self::client(&env); client.require_auth();
        let mut milestone = Self::milestone(&env, milestone_id);
        if milestone.status != MilestoneStatus::Submitted { panic!("milestone is not submitted"); }
        let freelancer: Address = env.storage().instance().get(&DataKey::Freelancer).unwrap();
        let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        token::Client::new(&env, &token_address).transfer(&env.current_contract_address(), &freelancer, &milestone.amount);
        milestone.status = MilestoneStatus::Approved;
        env.storage().persistent().set(&DataKey::Milestone(milestone_id), &milestone);
        Self::record_approval(&env, freelancer);
        MilestoneApproved { milestone_id, amount: milestone.amount }.publish(&env);
    }

    // Caller is explicit because Soroban contract authentication needs allow-listed contract context.
    pub fn raise_dispute(env: Env, milestone_id: u32, caller: Address) {
        let client = Self::client(&env); let freelancer: Address = env.storage().instance().get(&DataKey::Freelancer).unwrap();
        if caller != client && caller != freelancer { panic!("only a party may dispute"); }
        caller.require_auth();
        let mut milestone = Self::milestone(&env, milestone_id);
        if milestone.status != MilestoneStatus::Funded && milestone.status != MilestoneStatus::Submitted { panic!("milestone cannot be disputed"); }
        milestone.status = MilestoneStatus::Disputed;
        env.storage().persistent().set(&DataKey::Milestone(milestone_id), &milestone);
        let factory: Address = env.storage().instance().get(&DataKey::Factory).unwrap();
        env.invoke_contract::<u32>(&factory, &Symbol::new(&env, "open_case"), vec![&env, milestone_id.into_val(&env), env.current_contract_address().into_val(&env)]);
        DisputeRaised { milestone_id, caller }.publish(&env);
    }

    pub fn resolve_from_arbitration(env: Env, milestone_id: u32, release_to_freelancer: bool, caller: Address) {
        let factory: Address = env.storage().instance().get(&DataKey::Factory).unwrap();
        let arbitration: Address = env.invoke_contract(&factory, &Symbol::new(&env, "get_arbitration"), soroban_sdk::Vec::new(&env));
        if caller != arbitration { panic!("arbitration only"); }
        caller.require_auth();
        let mut milestone = Self::milestone(&env, milestone_id);
        if milestone.status != MilestoneStatus::Disputed { panic!("milestone is not disputed"); }
        let client = Self::client(&env); let freelancer: Address = env.storage().instance().get(&DataKey::Freelancer).unwrap(); let token_address: Address = env.storage().instance().get(&DataKey::Token).unwrap();
        let recipient = if release_to_freelancer { freelancer } else { client };
        token::Client::new(&env, &token_address).transfer(&env.current_contract_address(), &recipient, &milestone.amount);
        milestone.status = MilestoneStatus::Released;
        env.storage().persistent().set(&DataKey::Milestone(milestone_id), &milestone);
        MilestoneResolved { milestone_id, release_to_freelancer }.publish(&env);
    }

    pub fn get_client(env: Env) -> Address { Self::client(&env) }

    pub fn get_freelancer(env: Env) -> Address { env.storage().instance().get(&DataKey::Freelancer).unwrap() }

    pub fn get_factory(env: Env) -> Address { env.storage().instance().get(&DataKey::Factory).unwrap() }

    fn client(env: &Env) -> Address { env.storage().instance().get(&DataKey::Client).unwrap() }
    fn milestone(env: &Env, id: u32) -> Milestone { env.storage().persistent().get(&DataKey::Milestone(id)).unwrap() }
    fn record_approval(env: &Env, freelancer: Address) { let factory: Address = env.storage().instance().get(&DataKey::Factory).unwrap(); env.invoke_contract::<()>(&factory, &Symbol::new(env, "record_approval"), vec![env, freelancer.into_val(env), env.current_contract_address().into_val(env)]); }
}

#[cfg(test)]
mod test;
