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

    def register_node(self):
        return next(n for n in ast.walk(TREE)
                    if isinstance(n, ast.FunctionDef) and n.name == "register")

    def test_documented_nested_nondeterminism(self):
        register = self.register_node()
        nested = {node.name: node for node in register.body
                  if isinstance(node, ast.FunctionDef)}
        self.assertEqual(set(nested), {"leader_fn", "validator_fn"})
        self.assertFalse(any(isinstance(node, ast.Lambda) for node in ast.walk(register)))
        for function in nested.values():
            self.assertFalse(any(isinstance(node, ast.Name) and node.id == "self"
                                 for node in ast.walk(function)))

        run_call = next(node for node in ast.walk(register)
                        if isinstance(node, ast.Call)
                        and isinstance(node.func, ast.Attribute)
                        and node.func.attr == "run_nondet_unsafe")
        self.assertEqual([ast.unparse(arg) for arg in run_call.args],
                         ["leader_fn", "validator_fn"])
        self.assertFalse(any(isinstance(arg, ast.Attribute) and arg.attr == "__call__"
                             for arg in run_call.args))

    def test_obsolete_callable_constructs_are_absent(self):
        class_names = {node.name for node in TREE.body if isinstance(node, ast.ClassDef)}
        self.assertTrue(class_names.isdisjoint({
            "moderation_leader", "moderation_validator",
            "ModerationLeader", "ModerationValidator",
        }))
        self.assertNotIn("functools.partial", SOURCE)
        self.assertFalse(any(isinstance(node, ast.Attribute) and node.attr == "__call__"
                             for node in ast.walk(TREE)))

    def test_bounded_payload(self):
        register = self.register_node()
        text = ast.unparse(register)
        self.assertIn("{'canonical_name': canonical}", text)
        for excluded in ("avatar", "bio", "twitter", "github", "website", "owner"):
            payload_line = next(line for line in text.splitlines() if "payload =" in line)
            self.assertNotIn(excluded, payload_line)

    def test_semantic_consensus_language_and_comparison(self):
        self.assertNotIn("Validate format only", SOURCE)
        self.assertNotIn("No semantic evaluation", SOURCE)
        register = self.register_node()
        validator = next(node for node in register.body
                         if isinstance(node, ast.FunctionDef) and node.name == "validator_fn")
        comparisons = {ast.unparse(node) for node in ast.walk(validator)
                       if isinstance(node, ast.Compare)}
        self.assertIn("leader['approved'] == validator['approved']", comparisons)
        self.assertIn("leader['category'] == validator['category']", comparisons)
        consensus_return = next(node for node in ast.walk(validator)
                                if isinstance(node, ast.Return)
                                and isinstance(node.value, ast.BoolOp))
        self.assertNotIn("reason", ast.unparse(consensus_return))

    def test_storage_follows_nondeterminism_and_strict_validation(self):
        register = self.register_node()
        run_call = next(node for node in ast.walk(register)
                        if isinstance(node, ast.Call)
                        and isinstance(node.func, ast.Attribute)
                        and node.func.attr == "run_nondet_unsafe")
        strict_call = next(node for node in ast.walk(register)
                           if isinstance(node, ast.Call)
                           and isinstance(node.func, ast.Name)
                           and node.func.id == "validate_moderation_result"
                           and node.lineno > run_call.lineno)
        approved_check = next(node for node in ast.walk(register)
                              if isinstance(node, ast.If)
                              and "result['approved']" in ast.unparse(node.test))
        storage_lines = []
        for node in ast.walk(register):
            if isinstance(node, (ast.Assign, ast.AugAssign, ast.Delete)):
                targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                if any("self." in ast.unparse(target) for target in targets):
                    storage_lines.append(node.lineno)
            if (isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
                    and isinstance(node.func.value, ast.Name)
                    and node.func.value.id == "self"
                    and node.func.attr == "_add_owner_name"):
                storage_lines.append(node.lineno)
        self.assertTrue(storage_lines)
        self.assertGreater(min(storage_lines), run_call.lineno)
        self.assertGreater(min(storage_lines), strict_call.lineno)
        self.assertGreater(min(storage_lines), approved_check.lineno)

    def test_public_method_schema_source_is_unchanged(self):
        contract = next(node for node in TREE.body if isinstance(node, ast.ClassDef)
                        and node.name == "GenLayerNameServiceV2")
        methods = []
        for node in contract.body:
            if not isinstance(node, ast.FunctionDef):
                continue
            kind = next((decorator.attr for decorator in node.decorator_list
                         if isinstance(decorator, ast.Attribute)
                         and decorator.attr in {"write", "view"}), None)
            if kind is not None:
                methods.append((kind, node.name,
                                [(arg.arg, ast.unparse(arg.annotation))
                                 for arg in node.args.args[1:]],
                                ast.unparse(node.returns)))
        self.assertEqual(methods, [
            ("write", "register", [("name", "str"), ("avatar", "str"),
             ("bio", "str"), ("twitter", "str"), ("github", "str"),
             ("website", "str")], "None"),
            ("write", "update_profile", [("name", "str"), ("avatar", "str"),
             ("bio", "str"), ("twitter", "str"), ("github", "str"),
             ("website", "str")], "None"),
            ("write", "set_address", [("name", "str"), ("new_address", "str")], "None"),
            ("write", "set_primary", [("name", "str")], "None"),
            ("write", "transfer", [("name", "str"), ("new_owner", "str")], "None"),
            ("view", "resolve", [("name", "str")], "str"),
            ("view", "reverse_resolve", [("owner", "str")], "str"),
            ("view", "get_record", [("name", "str")], "str"),
            ("view", "is_available", [("name", "str")], "bool"),
            ("view", "get_names_by_owner", [("owner", "str"), ("offset", "u32"),
             ("limit", "u32")], "str"),
            ("view", "get_stats", [], "str"),
        ])

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
