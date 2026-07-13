import json

CONTRACT = "contracts/gns.py"
EMPTY_PROFILE = ("", "", "", "", "")
SAFE = '{"approved":true,"category":"safe","reason":"safe candidate"}'
REJECTED = '{"approved":false,"category":"scam_phishing","reason":"phishing intent"}'


def address_text(value):
    if isinstance(value, bytes):
        return "0x" + value.hex()
    return str(value)


def deploy_with_safe_llm(direct_vm, direct_deploy):
    direct_vm.mock_llm(r".*", SAFE)
    return direct_deploy(CONTRACT)


def record(contract, name):
    return json.loads(contract.get_record(name))


def owner_names(contract, owner, offset=0, limit=50):
    return json.loads(contract.get_names_by_owner(address_text(owner), offset, limit))


def test_deployment_initial_stats_and_serializable_binding(direct_vm, direct_deploy):
    direct_vm.check_pickling = True
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    assert json.loads(contract.get_stats()) == {"total_names": 0}
    contract.register("ALICE.GEN", *EMPTY_PROFILE)
    assert json.loads(contract.get_stats()) == {"total_names": 1}
    assert direct_vm._captured_validators
    stored, leader, validator = direct_vm._captured_validators[-1]
    assert stored == {"approved": True, "category": "safe", "reason": "safe candidate"}
    assert leader.__name__ == "__call__"
    assert validator.__name__ == "__call__"
    assert leader.__self__.payload == '{"canonical_name":"alice"}'
    assert validator.__self__.payload == '{"canonical_name":"alice"}'
    import cloudpickle
    serialized = cloudpickle.dumps(leader)
    leader.__self__.payload = '{"canonical_name":"changed"}'
    restored = cloudpickle.loads(serialized)
    assert restored.__self__.payload == '{"canonical_name":"alice"}'
    leader.__self__.payload = '{"canonical_name":"alice"}'
    assert direct_vm.run_validator() is True
    result = record(contract, "alice")
    assert result["owner"].lower() == address_text(direct_vm.sender).lower()
    assert result["resolved"].lower() == address_text(direct_vm.sender).lower()


def test_duplicate_invalid_reserved_and_unicode(direct_vm, direct_deploy):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    contract.register("Alice.GEN", *EMPTY_PROFILE)
    with direct_vm.expect_revert("duplicate registration"):
        contract.register("ALICE", *EMPTY_PROFILE)
    for name, message in (("ab", "invalid name"), ("álîce", "invalid name"),
                          ("admin", "reserved name"), ("ali_ce", "invalid name")):
        with direct_vm.expect_revert(message):
            contract.register(name, *EMPTY_PROFILE)


def test_rejected_and_malformed_moderation_are_atomic(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT)
    direct_vm.mock_llm(r".*", REJECTED)
    with direct_vm.expect_revert("name rejected: scam_phishing"):
        contract.register("scam-name", *EMPTY_PROFILE)
    assert json.loads(contract.get_stats())["total_names"] == 0
    assert record(contract, "scam-name")["found"] is False
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", '{"approved":"true","category":"safe","reason":"bad"}')
    with direct_vm.expect_revert("invalid moderation result"):
        contract.register("other-name", *EMPTY_PROFILE)
    assert json.loads(contract.get_stats())["total_names"] == 0
    assert record(contract, "other-name")["found"] is False


def test_profile_and_url_validation(direct_vm, direct_deploy):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    for avatar, message in (("x" * 257, "invalid profile field"),
                            ("https://", "invalid URL"),
                            ("http://", "invalid URL"),
                            ("https:// space", "invalid URL")):
        with direct_vm.expect_revert(message):
            contract.register("profile-name", avatar, "", "", "", "")


def test_owner_only_profile_address_and_primary(direct_vm, direct_deploy, direct_bob):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    owner = direct_vm.sender
    contract.register("alice", *EMPTY_PROFILE)
    with direct_vm.prank(direct_bob):
        with direct_vm.expect_revert("unauthorized profile update"):
            contract.update_profile("alice", *EMPTY_PROFILE)
        with direct_vm.expect_revert("unauthorized address update"):
            contract.set_address("alice", address_text(direct_bob))
        with direct_vm.expect_revert("invalid primary selection"):
            contract.set_primary("alice")
    for address in ("bad", "0x0000000000000000000000000000000000000000"):
        with direct_vm.expect_revert("invalid or zero address"):
            contract.set_address("alice", address)
    contract.set_address("alice", address_text(direct_bob))
    assert record(contract, "alice")["resolved"].lower() == address_text(direct_bob).lower()
    contract.set_primary("alice")
    assert json.loads(contract.reverse_resolve(address_text(owner)))["name"] == "alice.gen"


def test_transfer_real_swap_pop_and_primary_policy(
    direct_vm, direct_deploy, direct_bob
):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    alice = direct_vm.sender
    for name in ("first", "middle", "last"):
        contract.register(name, *EMPTY_PROFILE)
    with direct_vm.prank(direct_bob):
        contract.register("bob-primary", *EMPTY_PROFILE)
    contract.set_primary("middle")
    contract.transfer("middle", address_text(direct_bob))
    assert owner_names(contract, alice)["names"] == ["first.gen", "last.gen"]
    assert owner_names(contract, direct_bob)["names"] == ["bob-primary.gen", "middle.gen"]
    moved = record(contract, "middle")
    assert moved["owner"].lower() == address_text(direct_bob).lower()
    assert moved["resolved"].lower() == address_text(direct_bob).lower()
    assert json.loads(contract.reverse_resolve(address_text(alice)))["found"] is False
    assert json.loads(contract.reverse_resolve(address_text(direct_bob)))["name"] == "bob-primary.gen"
    assert contract.name_positions["last"] == 1
    with direct_vm.expect_revert("unauthorized transfer"):
        contract.transfer("middle", address_text(alice))
    with direct_vm.expect_revert("same-owner transfer"):
        contract.transfer("first", address_text(alice))


def test_pagination_and_more_than_200_global_registrations(direct_vm, direct_deploy):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    owner = direct_vm.sender
    for index in range(205):
        contract.register("global-" + str(index), *EMPTY_PROFILE)
    page = owner_names(contract, owner, 200, 5)
    assert page["total"] == 205
    assert page["names"] == [f"global-{index}.gen" for index in range(200, 205)]
    with direct_vm.expect_revert("invalid pagination"):
        contract.get_names_by_owner(address_text(owner), 0, 51)
