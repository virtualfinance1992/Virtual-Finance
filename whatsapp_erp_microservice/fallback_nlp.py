import re
import spacy

# Load English model for name/entity detection
nlp = spacy.load("en_core_web_sm")

# Quick dictionary-based corrections for common misspellings
SPELL_CORRECTIONS = {
    "pymnt": "payment",
    "recvd": "received",
    "frm": "from",
    "kash": "cash",
    "sail": "sale",
    "purchse": "purchase",
    "advnc": "advance",
    "srvce": "service",
    "expnse": "expense",
    "trvl": "travel",
    "amt": "amount"
}

# Keywords to normalized transaction types
KEYWORDS_TYPE_MAPPING = {
    "sale": "sales",
    "sold": "sales",
    "purchase": "purchase",
    "bought": "purchase",
    "buy": "purchase",
    "expense": "expense",
    "rent": "expense",
    "travel": "expense",
    "paid": "payment_made",
    "pay": "payment_made",
    "payment made": "payment_made",
    "received": "payment_received",
    "got": "payment_received",
    "payment received": "payment_received"
}

# Regex patterns for amounts and unit-product extraction
CURRENCY_PATTERN = re.compile(r"(?:₹\s*|rs\.?\s*)([0-9][0-9,]*)", flags=re.IGNORECASE)
MULT_PATTERN = re.compile(r"(\d+)\s*[x×]\s*(\d+)")
EACH_UNIT_PATTERN = re.compile(
    r"(\d+)\s*(?:kg|pcs|units?)\b.*?(\d+)\s*/\s*each", flags=re.IGNORECASE
)
RATE_AT_PATTERN = re.compile(
    r"(\d+)\s*(?:kg|pcs|units?)\b.*?(?:@|at)\s*(\d+)",
    flags=re.IGNORECASE
)
GENERIC_EACH_PATTERN = re.compile(
    r"(\d+)\s*[A-Za-z]+\s*each\s*(?:for|at)\s*(?:rs\.?|₹)?\s*(\d+)",
    flags=re.IGNORECASE
)
UNIT_PRODUCT_PATTERN = re.compile(
    r"(\d+)\s*(?:kg|pcs|units?)\s*([A-Za-z ]+?)\b",
    flags=re.IGNORECASE
)


def autocorrect(text: str) -> str:
    """Fix common misspellings via dictionary mapping."""
    for wrong, correct in SPELL_CORRECTIONS.items():
        text = re.sub(rf"\b{wrong}\b", correct, text, flags=re.IGNORECASE)
    return text


def extract_type(text: str) -> str:
    """Detect transaction type based on keywords."""
    for kw, label in KEYWORDS_TYPE_MAPPING.items():
        if re.search(rf"\b{re.escape(kw)}\b", text, flags=re.IGNORECASE):
            return label
    return "sales"


def extract_amount(text: str) -> int:
    """Extract numeric amount, handling various patterns."""
    # 1) qty × rate
    m = MULT_PATTERN.search(text)
    if m:
        return int(m.group(1)) * int(m.group(2))
    # 2) qty unit ... rate/each
    m = EACH_UNIT_PATTERN.search(text)
    if m:
        return int(m.group(1)) * int(m.group(2))
    # 3) qty unit ... at/@ rate
    m = RATE_AT_PATTERN.search(text)
    if m:
        return int(m.group(1)) * int(m.group(2))
    # 4) generic each pattern
    m = GENERIC_EACH_PATTERN.search(text)
    if m:
        return int(m.group(1)) * int(m.group(2))
    # 5) single currency value
    m2 = CURRENCY_PATTERN.search(text)
    if m2:
        return int(m2.group(1).replace(',', ''))
    # 6) fallback standalone number
    nums = re.findall(r"\d{2,}(?:,\d{2,})*", text)
    if nums:
        return int(nums[-1].replace(',', ''))
    return 0


def extract_party(original: str, doc) -> str:
    """Extract party via 'to'/'from' or via named entity."""
    m_to = re.search(r"\bto\s+([A-Za-z][A-Za-z ]+)\b", original, flags=re.IGNORECASE)
    m_fr = re.search(r"\bfrom\s+([A-Za-z][A-Za-z ]+)\b", original, flags=re.IGNORECASE)
    if m_to:
        return m_to.group(1).title().strip()
    if m_fr:
        return m_fr.group(1).title().strip()
    for ent in doc.ents:
        if ent.label_ == "PERSON":
            return ent.text
    return "Unknown"


def extract_description(text: str, party: str) -> str:
    """Extract product/service, prioritizing direct unit-product matches."""
    # 1) direct unit-product
    m = UNIT_PRODUCT_PATTERN.search(text)
    if m:
        return m.group(2).strip().title()
    # 2) fallback cleanup
    desc = text
    for kw in KEYWORDS_TYPE_MAPPING.keys():
        desc = re.sub(rf"\b{re.escape(kw)}\b", '', desc, flags=re.IGNORECASE)
    desc = re.sub(MULT_PATTERN, '', desc)
    desc = re.sub(EACH_UNIT_PATTERN, '', desc)
    desc = re.sub(RATE_AT_PATTERN, '', desc)
    desc = re.sub(GENERIC_EACH_PATTERN, '', desc)
    desc = re.sub(CURRENCY_PATTERN, '', desc)
    desc = re.sub(rf"\bto\s+{re.escape(party)}\b", '', desc, flags=re.IGNORECASE)
    desc = re.sub(rf"\bfrom\s+{re.escape(party)}\b", '', desc, flags=re.IGNORECASE)
    desc = re.sub(r"\b(per|at|kg|pcs|units?|each|for|rs\.?|₹)\b", '', desc, flags=re.IGNORECASE)
    desc = re.sub(r"[0-9,]+", '', desc)
    desc = re.sub(r"[^a-zA-Z ]", ' ', desc)
    desc = ' '.join(desc.split()).strip()
    return desc.title() or 'Transaction'


def interpret_transaction(message: str, forced_type: str = None) -> dict:
    """Main entry: parse a transaction message into structured fields."""
    msg = autocorrect(message)
    msg = msg.replace('*', 'x').replace('×', 'x')
    msg_lower = msg.lower()
    doc = nlp(msg)
    type_ = forced_type if forced_type else extract_type(msg_lower)
    amount = extract_amount(msg_lower)
    party = extract_party(msg, doc)
    description = extract_description(msg_lower, party)
    return {'type': type_, 'amount': amount, 'party': party, 'description': description}


def format_response(parsed: dict) -> str:
    """Format the parsed dict into a WhatsApp-friendly response."""
    return (
        "🤖 I understood this:\n"
        f"📌 Type: {parsed['type']}\n"
        f"💰 Amount: ₹{parsed['amount']}\n"
        f"👤 Party: {parsed['party']}\n"
        f"📝 Product/Service: {parsed['description']}"
    )

# Alias for backward compatibility
interpret_local_nlp = interpret_transaction
