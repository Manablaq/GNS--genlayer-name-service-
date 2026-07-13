# v0.1.0
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
from dataclasses import dataclass
import json

# GenLayer Name Service (GNS)
# Register .gen names, send GEN tokens to names, manage profiles
# AI validates names using prompt_non_comparative (format-only criteria)
# gl.message_raw["datetime"] for timestamps (NOT gl.message.datetime)


def _safe_json(text: str) -> dict:
    try:
        s = text.strip()
        if s.startswith("```"):
            s = s.split("```")[1]
            if s.startswith("json"):
                s = s[4:]
        return json.loads(s.strip())
    except:
        return {}


def _normalize(name: str) -> str:
    """Lowercase and strip .gen suffix if provided."""
    name = name.lower().strip()
    if name.endswith(".gen"):
        name = name[:-4]
    return name


def _validate_format(name: str) -> bool:
    """Check name format: 3-32 chars, alphanumeric + hyphens, no leading/trailing hyphens."""
    if len(name) < 3 or len(name) > 32:
        return False
    if name.startswith("-") or name.endswith("-"):
        return False
    for ch in name:
        if not (ch.isalnum() or ch == "-"):
            return False
    return True


class GenLayerNameService(gl.Contract):
    # name (normalized, no .gen) -> JSON string of NameRecord
    names: TreeMap[str, str]
    # address (lowercase) -> primary name
    primary_names: TreeMap[str, str]
    # name -> GEN balance in wei (stored as string)
    balances: TreeMap[str, str]
    # total registered names
    total_names: str
    # total GEN sent through GNS
    total_transferred: str

    def __init__(self):
        self.total_names = "0"
        self.total_transferred = "0"

    # ── WRITE METHODS ──────────────────────────────────────────────────────────

    @gl.public.write
    def register(
        self,
        name: str,
        avatar: str,
        bio: str,
        twitter: str,
        github: str,
        website: str,
    ) -> None:
        """Register a .gen name. AI validates the name is appropriate."""
        name = _normalize(name)
        assert _validate_format(name), (
            "Invalid name format. Use 3-32 alphanumeric characters or hyphens, "
            "no leading/trailing hyphens."
        )

        owner = str(gl.message.sender_address)
        now_str = gl.message_raw["datetime"]

        # Check availability
        existing = self.names.get(name, None)
        assert existing is None, f"Name '{name}.gen' is already registered."

        # AI validation — checks name is appropriate
        def _get_name_input() -> str:
            return (
                "Name to register: " + name + ".gen\n"
                "Owner address: " + owner + "\n"
                "Bio: " + (bio[:200] if bio else "none") + "\n"
                "Twitter: " + (twitter if twitter else "none") + "\n"
                "GitHub: " + (github if github else "none")
            )

        validation_raw = gl.eq_principle.prompt_non_comparative(
            _get_name_input,
            task=(
                "Validate this GenLayer Name Service (.gen) registration request.\n"
                "Check if the name is appropriate:\n"
                "- REJECT if name is clearly offensive, slurs, or hate speech\n"
                "- REJECT if name impersonates a major brand or public figure "
                "(e.g. 'apple', 'microsoft', 'vitalik', 'satoshi')\n"
                "- REJECT if name is a known scam pattern\n"
                "- APPROVE everything else — short names, numbers, hyphens are all fine\n"
                "Reply ONLY with valid JSON."
            ),
            criteria=(
                "Validate format only. Accept if: "
                "(1) valid JSON object, "
                "(2) 'approved' field is exactly true or false (boolean), "
                "(3) 'reason' field is a non-empty string. "
                "No semantic evaluation."
            ),
        )

        result = _safe_json(validation_raw)
        approved = result.get("approved", True)
        reason = str(result.get("reason", ""))
        assert approved, f"Name rejected by AI validators: {reason}"

        # Build record
        record = (
            '{"owner":"' + owner + '",'
            '"address":"' + owner + '",'
            '"registered_at":"' + now_str + '",'
            '"avatar":"' + (avatar or "").replace('"', "'") + '",'
            '"bio":"' + (bio[:280] if bio else "").replace('"', "'") + '",'
            '"twitter":"' + (twitter or "").replace('"', "'") + '",'
            '"github":"' + (github or "").replace('"', "'") + '",'
            '"website":"' + (website or "").replace('"', "'") + '"}'
        )

        self.names[name] = record
        self.balances[name] = "0"

        # Auto-set as primary if wallet has no primary name
        existing_primary = self.primary_names.get(owner.lower(), None)
        if existing_primary is None:
            self.primary_names[owner.lower()] = name

        try:
            self.total_names = str(int(self.total_names) + 1)
        except:
            self.total_names = "1"

    @gl.public.write
    def update_profile(
        self,
        name: str,
        avatar: str,
        bio: str,
        twitter: str,
        github: str,
        website: str,
    ) -> None:
        """Update profile metadata. Owner only."""
        name = _normalize(name)
        owner = str(gl.message.sender_address)

        raw = self.names.get(name, None)
        assert raw is not None, f"Name '{name}.gen' not found."

        record = json.loads(raw)
        assert record.get("owner", "").lower() == owner.lower(), "Not the owner."

        record["avatar"] = (avatar or "").replace('"', "'")
        record["bio"] = (bio[:280] if bio else "").replace('"', "'")
        record["twitter"] = (twitter or "").replace('"', "'")
        record["github"] = (github or "").replace('"', "'")
        record["website"] = (website or "").replace('"', "'")

        self.names[name] = json.dumps(record)

    @gl.public.write
    def set_address(self, name: str, new_address: str) -> None:
        """Point a name to a different address (for receiving). Owner only."""
        name = _normalize(name)
        owner = str(gl.message.sender_address)

        raw = self.names.get(name, None)
        assert raw is not None, f"Name '{name}.gen' not found."

        record = json.loads(raw)
        assert record.get("owner", "").lower() == owner.lower(), "Not the owner."

        assert len(new_address) == 42 and new_address.startswith("0x"), (
            "Invalid address format."
        )

        record["address"] = new_address
        self.names[name] = json.dumps(record)

    @gl.public.write
    def set_primary(self, name: str) -> None:
        """Set a name as the primary name for your wallet (reverse lookup)."""
        name = _normalize(name)
        owner = str(gl.message.sender_address)

        raw = self.names.get(name, None)
        assert raw is not None, f"Name '{name}.gen' not found."

        record = json.loads(raw)
        assert record.get("owner", "").lower() == owner.lower(), "Not the owner."

        self.primary_names[owner.lower()] = name

    @gl.public.write
    def transfer(self, name: str, new_owner: str) -> None:
        """Transfer name ownership to another address."""
        name = _normalize(name)
        owner = str(gl.message.sender_address)

        raw = self.names.get(name, None)
        assert raw is not None, f"Name '{name}.gen' not found."

        record = json.loads(raw)
        assert record.get("owner", "").lower() == owner.lower(), "Not the owner."

        assert len(new_owner) == 42 and new_owner.startswith("0x"), (
            "Invalid address format."
        )

        record["owner"] = new_owner
        record["address"] = new_owner
        self.names[name] = json.dumps(record)

        # Update primary names
        if self.primary_names.get(owner.lower(), None) == name:
            self.primary_names[owner.lower()] = ""
        if self.primary_names.get(new_owner.lower(), None) is None:
            self.primary_names[new_owner.lower()] = name

    @gl.public.write.payable
    def send_to_name(self, name: str) -> None:
        """Send GEN tokens to a .gen name. Credited to name's balance."""
        name = _normalize(name)

        raw = self.names.get(name, None)
        assert raw is not None, f"Name '{name}.gen' is not registered."

        amount = gl.message.value
        assert amount > 0, "Send amount must be greater than 0."

        current = int(self.balances.get(name, "0"))
        self.balances[name] = str(current + amount)

        try:
            self.total_transferred = str(int(self.total_transferred) + amount)
        except:
            self.total_transferred = str(amount)

    @gl.public.write
    def withdraw(self, name: str) -> None:
        """Withdraw GEN balance from a name to the owner's wallet."""
        name = _normalize(name)
        owner = str(gl.message.sender_address)

        raw = self.names.get(name, None)
        assert raw is not None, f"Name '{name}.gen' not found."

        record = json.loads(raw)
        assert record.get("owner", "").lower() == owner.lower(), "Not the owner."

        balance = int(self.balances.get(name, "0"))
        assert balance > 0, "No balance to withdraw."

        self.balances[name] = "0"
        gl.transfer(Address(owner), balance)

    # ── READ METHODS ───────────────────────────────────────────────────────────

    @gl.public.view
    def resolve(self, name: str) -> str:
        """Resolve a .gen name to a wallet address."""
        name = _normalize(name)
        raw = self.names.get(name, None)
        if raw is None:
            return json.dumps({"found": False, "name": name + ".gen", "address": ""})
        record = json.loads(raw)
        return json.dumps({
            "found": True,
            "name": name + ".gen",
            "address": record.get("address", ""),
        })

    @gl.public.view
    def reverse_resolve(self, address: str) -> str:
        """Resolve a wallet address to its primary .gen name."""
        primary = self.primary_names.get(address.lower(), None)
        if not primary:
            return json.dumps({"found": False, "address": address, "name": ""})
        return json.dumps({
            "found": True,
            "address": address,
            "name": primary + ".gen",
        })

    @gl.public.view
    def get_record(self, name: str) -> str:
        """Get full name record including balance."""
        name = _normalize(name)
        raw = self.names.get(name, None)
        if raw is None:
            return json.dumps({"found": False, "name": name + ".gen"})
        record = json.loads(raw)
        record["found"] = True
        record["name"] = name + ".gen"
        record["balance"] = self.balances.get(name, "0")
        return json.dumps(record)

    @gl.public.view
    def is_available(self, name: str) -> str:
        """Check if a name is available for registration."""
        name = _normalize(name)
        if not _validate_format(name):
            return json.dumps({
                "available": False,
                "name": name + ".gen",
                "reason": "Invalid format.",
            })
        existing = self.names.get(name, None)
        return json.dumps({
            "available": existing is None,
            "name": name + ".gen",
            "reason": "" if existing is None else "Already registered.",
        })

    @gl.public.view
    def get_balance(self, name: str) -> str:
        """Get GEN balance for a name."""
        name = _normalize(name)
        return json.dumps({
            "name": name + ".gen",
            "balance": self.balances.get(name, "0"),
        })

    @gl.public.view
    def get_names_by_owner(self, owner: str) -> str:
        """Get all names owned by an address (scans up to 200 names)."""
        owner = owner.lower()
        owned = []
        count = 0
        for key in self.names.keys():
            if count >= 200:
                break
            try:
                record = json.loads(self.names[key])
                if record.get("owner", "").lower() == owner:
                    record["name"] = key + ".gen"
                    record["balance"] = self.balances.get(key, "0")
                    owned.append(record)
            except:
                pass
            count += 1
        return json.dumps(owned)

    @gl.public.view
    def get_stats(self) -> str:
        """Get global stats."""
        return json.dumps({
            "total_names": self.total_names or "0",
            "total_transferred": self.total_transferred or "0",
        })
