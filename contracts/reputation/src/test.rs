use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn escrow_can_update_a_score() {
    let env = Env::default(); env.mock_all_auths();
    let id = env.register(ReputationContract, ()); let admin = Address::generate(&env); let factory = Address::generate(&env); let arbitration = Address::generate(&env); let worker = Address::generate(&env);
    let api = ReputationContractClient::new(&env, &id);
    api.initialize(&admin, &factory, &arbitration);
    assert_eq!(api.update_score(&worker, &8, &String::from_str(&env, "approved"), &factory), 8);
    assert_eq!(api.get_score(&worker), 8);
}
