use super::*;
use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};

#[test]
fn administrator_can_initialize_factory() {
    let env = Env::default(); env.mock_all_auths();
    let id = env.register(MeridianFactory, ());
    let admin = Address::generate(&env); let token = Address::generate(&env); let reputation = Address::generate(&env); let arbitration = Address::generate(&env);
    MeridianFactoryClient::new(&env, &id).initialize(&admin, &BytesN::from_array(&env, &[7; 32]), &token, &reputation, &arbitration);
}
