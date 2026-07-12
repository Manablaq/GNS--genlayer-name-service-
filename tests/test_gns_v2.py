import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import types
import unittest


ROOT = Path(__file__).resolve().parents[1]
ACTIVE = ROOT / "contracts" / "gns.py"
LEGACY = ROOT / "contracts" / "legacy" / "gns_rejected.py"
SOURCE = ACTIVE.read_text()
TREE = ast.parse(SOURCE)


def load_helpers():
    genlayer = types.ModuleType("genlayer")
    class DummyContract: pass
    class DummyPublic:
        def write(self, fn): return fn
        def view(self, fn): return fn
    class DummyGl:
        Contract = DummyContract
        public = DummyPublic()
        class vm:
            class UserError(Exception): pass
    class Address(str): pass
    class U32(int): pass
    class TreeMap:
        def __class_getitem__(cls, _): return cls
    def allow_storage(cls): return cls
    genlayer.__all__ = ["gl", "Address", "u32", "TreeMap", "allow_storage"]
    genlayer.gl = DummyGl()
    genlayer.Address = Address
    genlayer.u32 = U32
    genlayer.TreeMap = TreeMap
    genlayer.allow_storage = allow_storage
    previous = sys.modules.get("genlayer")
    sys.modules["genlayer"] = genlayer
    try:
        spec = importlib.util.spec_from_file_location("gns_v2_helpers", ACTIVE)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module
    finally:
        if previous is None:
            del sys.modules["genlayer"]
        else:
            sys.modules["genlayer"] = previous


GNS = load_helpers()


class StructureTests(unittest.TestCase):
    def test_bradbury_source_packaging_header(self):
        lines = SOURCE.splitlines()
        self.assertEqual(
            lines[0],
            '# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }',
        )
        self.assertFalse(lines[1].startswith("#"))
        self.assertTrue(lines[1].startswith(("from ", "import ")))
        first_statement = TREE.body[0]
        self.assertIsInstance(first_statement, (ast.Import, ast.ImportFrom))
        self.assertEqual(first_statement.lineno, 2)
        self.assertNotIn("GNS V2 resolver-only candidate", "\n".join(lines[:2]))

    def test_legacy_hash(self):
        self.assertEqual(hashlib.sha256(LEGACY.read_bytes()).hexdigest(),
                         "93014009a7348c62394e3f38b02030ac4f1e535b32f02add145dcb7333a8bc9f")

    def test_one_active_contract(self):
        contracts = [n for n in TREE.body if isinstance(n, ast.ClassDef)
                     and any(isinstance(b, ast.Attribute) and b.attr == "Contract" for b in n.bases)]
        self.assertEqual(len(contracts), 1)

    def test_no_custody_surface(self):
        forbidden = ["gl.transfer", "send_to_name", "withdraw", "get_balance",
                     "balances", "total_transferred", "write.payable"]
        for token in forbidden:
            self.assertNotIn(token, SOURCE)

    def test_no_contract_assertions(self):
        self.assertFalse(any(isinstance(node, ast.Assert) for node in ast.walk(TREE)))
        writes = [node for node in ast.walk(TREE) if isinstance(node, ast.FunctionDef)
                  and any(isinstance(decorator, ast.Attribute) and decorator.attr == "write"
                          for decorator in node.decorator_list)]
        self.assertTrue(writes)
        self.assertFalse(any(isinstance(child, ast.Assert) for node in writes for child in ast.walk(node)))

    def test_no_privileged_migration(self):
        names = {n.name for n in ast.walk(TREE) if isinstance(n, (ast.FunctionDef, ast.ClassDef))}
        self.assertTrue(names.isdisjoint({"admin", "migrate", "recover", "upgrade"}))

    def test_typed_storage(self):
        self.assertIn("owner: Address", SOURCE)
        self.assertIn("resolved: Address", SOURCE)
        self.assertIn("total_names: u32", SOURCE)
        self.assertIn("TreeMap[str, NameRecord]", SOURCE)

    def test_module_level_nondeterminism(self):
        classes = {n.name: n for n in TREE.body if isinstance(n, ast.ClassDef)}
        self.assertIn("moderation_leader", classes)
        self.assertIn("moderation_validator", classes)
        self.assertFalse(any(isinstance(n, ast.Lambda) for n in ast.walk(TREE)))
        contract = next(n for n in TREE.body if isinstance(n, ast.ClassDef)
                        and n.name == "GenLayerNameServiceV2")
        self.assertFalse(any(isinstance(n, ast.FunctionDef) for method in contract.body
                             if isinstance(method, ast.FunctionDef)
                             for n in ast.iter_child_nodes(method) if isinstance(n, ast.FunctionDef)))

    def test_bounded_payload(self):
        register = next(n for n in ast.walk(TREE) if isinstance(n, ast.FunctionDef) and n.name == "register")
        text = ast.unparse(register)
        self.assertIn("{'canonical_name': canonical}", text)
        for excluded in ("avatar", "bio", "twitter", "github", "website", "owner"):
            payload_line = next(line for line in text.splitlines() if "payload =" in line)
            self.assertNotIn(excluded, payload_line)

    def test_semantic_consensus_language_and_comparison(self):
        self.assertNotIn("Validate format only", SOURCE)
        self.assertNotIn("No semantic evaluation", SOURCE)
        self.assertIn('leader["approved"] == validator["approved"]', SOURCE)
        self.assertIn('leader["category"] == validator["category"]', SOURCE)

    def test_direct_bounded_owner_index(self):
        self.assertNotIn("records.keys", SOURCE)
        self.assertNotIn("names.keys", SOURCE)
        self.assertNotIn("200", SOURCE)
        self.assertIn("MAX_OWNER_PAGE = 50", SOURCE)
        self.assertIn("owner_slots", SOURCE)
        self.assertIn("name_positions", SOURCE)

    def test_transfer_policy_source_model(self):
        transfer = next(n for n in ast.walk(TREE) if isinstance(n, ast.FunctionDef) and n.name == "transfer")
        text = ast.unparse(transfer)
        self.assertIn("_remove_owner_name(old_owner, canonical)", text)
        self.assertIn("_add_owner_name(recipient, canonical)", text)
        self.assertIn("NameRecord(recipient, recipient", text)
        self.assertIn("del self.primary_names[old_owner]", text)
        self.assertNotIn("self.primary_names[recipient]", text)

    def test_safe_json_serialization(self):
        self.assertIn("json.dumps", SOURCE)
        self.assertNotIn("record = (", SOURCE)


class NormalizationTests(unittest.TestCase):
    def test_variants(self):
        self.assertEqual(GNS.normalize_name("alice"), "alice")
        self.assertEqual(GNS.normalize_name("ALICE"), "alice")
        self.assertEqual(GNS.normalize_name("Alice.GEN"), "alice")

    def test_invalid_names(self):
        invalid = ["", " alice", "alice ", "al", "a" * 33, "alice.gen.gen",
                   "alice.genx", "álîce", "ali_ce", "-alice", "alice-", "ali--ce",
                   "alice.com", "ali\x00ce"]
        for name in invalid:
            with self.subTest(name=repr(name)), self.assertRaises(ValueError):
                GNS.normalize_name(name)

    def test_reserved_literals(self):
        for name in GNS.RESERVED_NAMES:
            with self.subTest(name=name), self.assertRaises(ValueError):
                GNS.normalize_name(name)

    def test_innocent_names(self):
        for name in ("alice", "officially-yours", "wallet-tools", "supporter"):
            self.assertEqual(GNS.normalize_name(name), name)


class ModerationParserTests(unittest.TestCase):
    def parse(self, value): return GNS.validate_moderation_result(value)

    def test_safe_and_rejections(self):
        self.assertTrue(self.parse({"approved": True, "category": "safe", "reason": "ok"})["approved"])
        for category in GNS.MODERATION_CATEGORIES - {"safe"}:
            value = {"approved": False, "category": category, "reason": "risk"}
            self.assertFalse(self.parse(value)["approved"])

    def test_invalid_results(self):
        cases = ["{", [], "text", None, {},
                 {"category": "safe", "reason": "x"},
                 {"approved": True, "reason": "x"},
                 {"approved": True, "category": "safe"},
                 {"approved": "false", "category": "safe", "reason": "x"},
                 {"approved": 1, "category": "safe", "reason": "x"},
                 {"approved": False, "category": "unknown", "reason": "x"},
                 {"approved": True, "category": "safe", "reason": ""},
                 {"approved": True, "category": "safe", "reason": "x" * 281},
                 {"approved": True, "category": "safe", "reason": "x", "extra": 1},
                 {"approved": True, "category": "impersonation", "reason": "x"},
                 {"approved": False, "category": "safe", "reason": "x"}]
        for value in cases:
            with self.subTest(value=repr(value)[:50]), self.assertRaises(ValueError): self.parse(value)


class ProfileValidationTests(unittest.TestCase):
    def test_url_requires_scheme_host_and_no_whitespace(self):
        for url in ("https://", "http://", "https:// space", "https://example.com/a b"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                GNS.validate_profile(url, "", "", "", "")
        GNS.validate_profile("https://example.com/avatar.png", "", "", "", "http://example.com")


class OwnerIndexModelTests(unittest.TestCase):
    class Model:
        def __init__(self):
            self.records, self.slots, self.positions, self.primary = {}, {}, {}, {}
        def register(self, name, owner):
            if name in self.records: raise ValueError("duplicate")
            self.records[name] = owner
            self.positions[name] = len(self.slots.setdefault(owner, []))
            self.slots[owner].append(name)
            self.primary.setdefault(owner, name)
        def transfer(self, name, new_owner):
            old = self.records[name]; pos = self.positions[name]; last = self.slots[old].pop()
            if name != last:
                self.slots[old][pos] = last; self.positions[last] = pos
            self.positions[name] = len(self.slots.setdefault(new_owner, []))
            self.slots[new_owner].append(name); self.records[name] = new_owner
            if self.primary.get(old) == name: del self.primary[old]

    def test_more_than_200_global_and_duplicate(self):
        model = self.Model()
        for i in range(250): model.register(f"name{i}", "alice" if i % 3 == 0 else f"owner{i}")
        self.assertEqual(len(model.slots["alice"]), 84)
        with self.assertRaises(ValueError): model.register("name0", "bob")

    def test_swap_pop_transfer_and_primary(self):
        model = self.Model()
        for name in ("one", "two", "three"): model.register(name, "alice")
        model.register("existing", "bob")
        model.primary["alice"] = "two"
        model.transfer("two", "bob")
        self.assertEqual(model.slots["alice"], ["one", "three"])
        self.assertEqual(model.positions["three"], 1)
        self.assertEqual(model.records["two"], "bob")
        self.assertNotIn("alice", model.primary)
        self.assertEqual(model.primary["bob"], "existing")


if __name__ == "__main__":
    unittest.main()
