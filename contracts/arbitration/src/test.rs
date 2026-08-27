use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env};

#[test]
fn administrator_can_initialize_arbitration() {
    let env = Env::default(); env.mock_all_auths();
    let id = env.register(ArbitrationContract, ()); let admin = Address::generate(&env); let arbitrator = Address::generate(&env); let reputation = Address::generate(&env); let factory = Address::generate(&env);
    ArbitrationContractClient::new(&env, &id).initialize(&admin, &arbitrator, &reputation, &factory);
}
