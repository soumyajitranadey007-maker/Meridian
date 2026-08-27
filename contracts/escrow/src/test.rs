use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};

#[test]
fn client_can_add_a_milestone() {
    let env = Env::default(); env.mock_all_auths();
    let contract_id = env.register(EscrowContract, ()); let client = Address::generate(&env); let freelancer = Address::generate(&env); let token = Address::generate(&env); let factory = Address::generate(&env);
    let client_api = EscrowContractClient::new(&env, &contract_id);
    client_api.initialize(&client, &freelancer, &token, &factory);
    assert_eq!(client_api.add_milestone(&String::from_str(&env, "Design"), &100_i128), 0);
}
