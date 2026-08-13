import json
from datetime import datetime, timezone

CONTRACT = "contracts/gns.py"
EMPTY_PROFILE = ("", "", "", "", "")
SAFE = '{"approved":true,"category":"safe","reason":"safe candidate"}'
REJECTED = '{"approved":false,"category":"scam_phishing","reason":"phishing intent"}'
CHALLENGE_SUSPEND = ('{"action":"suspend","category":"impersonation",'
                     '"confidence_bps":9500,"summary":"The source materially supports impersonation."}')
CHALLENGE_KEEP = ('{"action":"keep","category":"insufficient_evidence",'
                  '"confidence_bps":6000,"summary":"The source does not materially support the claim."}')
EVIDENCE_URL = "https://evidence.example/identity-proof"


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


def warp_after(direct_vm, timestamp):
    direct_vm.warp(datetime.fromtimestamp(timestamp, timezone.utc).isoformat())


def test_deployment_initial_stats_and_nested_validator_consensus(direct_vm, direct_deploy):
    direct_vm.check_pickling = True
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    assert json.loads(contract.get_stats()) == {"total_names": 0}
    contract.register("ALICE.GEN", *EMPTY_PROFILE)
    assert json.loads(contract.get_stats()) == {"total_names": 1}
    assert direct_vm.run_validator() is True
    result = record(contract, "alice")
    assert result["owner"].lower() == address_text(direct_vm.sender).lower()
    assert result["resolved"].lower() == address_text(direct_vm.sender).lower()
    assert result["status"] == "active"
    assert int(result["expires_at"]) > 0


def test_nested_registration_validator_rejects_different_policy_outcome(direct_vm, direct_deploy):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    contract.register("alice", *EMPTY_PROFILE)
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", REJECTED)
    assert direct_vm.run_validator() is False


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
    with direct_vm.expect_revert("registration rejected: scam_phishing"):
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


def test_post_registration_profile_is_independently_moderated(direct_vm, direct_deploy):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    contract.register("alice", *EMPTY_PROFILE)
    direct_vm.clear_mocks()
    direct_vm.mock_llm(r".*", REJECTED)
    with direct_vm.expect_revert("profile rejected: scam_phishing"):
        contract.update_profile("alice", "", "A deceptive recovery offer", "", "", "")
    assert record(contract, "alice")["bio"] == ""


def test_release_and_delayed_recovery_lifecycle(direct_vm, direct_deploy, direct_bob):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    owner = direct_vm.sender
    contract.register("recoverable", *EMPTY_PROFILE)
    contract.set_recovery("recoverable", address_text(direct_bob))
    with direct_vm.prank(direct_bob):
        contract.initiate_recovery("recoverable", address_text(direct_bob))
    pending = record(contract, "recoverable")
    assert pending["recovery_configured"] is True
    assert pending["recovery_pending"] is True
    with direct_vm.expect_revert("recovery delay has not elapsed"):
        contract.execute_recovery("recoverable")
    warp_after(direct_vm, int(pending["recovery_available_at"]) + 1)
    contract.execute_recovery("recoverable")
    recovered = record(contract, "recoverable")
    assert recovered["owner"].lower() == address_text(direct_bob).lower()
    assert recovered["resolved"].lower() == address_text(direct_bob).lower()
    assert recovered["recovery_configured"] is False
    with direct_vm.prank(direct_bob):
        contract.release("recoverable")
    assert contract.is_available("recoverable") is True


def test_expiry_blocks_resolution_then_renewal_or_expired_release(direct_vm, direct_deploy):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    contract.register("renewable", *EMPTY_PROFILE)
    contract.register("releasable", *EMPTY_PROFILE)
    expires_at = int(record(contract, "renewable")["expires_at"])
    warp_after(direct_vm, expires_at + 1)
    assert record(contract, "renewable")["status"] == "expired"
    assert json.loads(contract.resolve("renewable"))["found"] is False
    with direct_vm.expect_revert("name is not active: expired"):
        contract.set_primary("renewable")
    contract.renew("renewable")
    assert record(contract, "renewable")["status"] == "active"
    contract.release_expired("releasable")
    assert contract.is_available("releasable") is True


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


def test_source_backed_challenge_suspends_only_after_validator_agreement(
    direct_vm, direct_deploy
):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    contract.register("profile-name", *EMPTY_PROFILE)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*evidence\.example.*", {"status": 200, "body": "Independent source documents the impersonation."})
    direct_vm.mock_llm(r".*", CHALLENGE_SUSPEND)
    contract.challenge_profile("profile-name", EVIDENCE_URL, "The profile impersonates this source.")
    assert direct_vm.run_validator() is True
    assert record(contract, "profile-name")["status"] == "suspended"
    challenge = json.loads(contract.get_challenge("profile-name"))
    assert challenge["action"] == "suspend"
    assert challenge["category"] == "impersonation"
    assert challenge["confidence_bps"] == 9500
    assert json.loads(contract.resolve("profile-name"))["found"] is False


def test_source_backed_challenge_validator_rejects_conflicting_outcome(
    direct_vm, direct_deploy
):
    contract = deploy_with_safe_llm(direct_vm, direct_deploy)
    contract.register("profile-name", *EMPTY_PROFILE)
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*evidence\.example.*", {"status": 200, "body": "Independent source documents the impersonation."})
    direct_vm.mock_llm(r".*", CHALLENGE_SUSPEND)
    contract.challenge_profile("profile-name", EVIDENCE_URL, "The profile impersonates this source.")
    direct_vm.clear_mocks()
    direct_vm.mock_web(r".*evidence\.example.*", {"status": 200, "body": "Independent source documents the impersonation."})
    direct_vm.mock_llm(r".*", CHALLENGE_KEEP)
    assert direct_vm.run_validator() is False
