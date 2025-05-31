session_store = {
    "917400164456": {
        "state": None,
        "erp_company": "Biosthan Technologies Pvt Ltd",
        "customer_company": "John Traders Pvt Ltd"
    }
}


def get_user_state(phone):
    return session_store.get(phone, {}).get("state")

def set_user_state(phone, state):
    if phone in session_store:
        session_store[phone]["state"] = state

def clear_user_state(phone):
    if phone in session_store:
        session_store[phone]["state"] = None

def get_erp_company(phone):
    return session_store.get(phone, {}).get("erp_company", "ERP Company")

def get_customer_company(phone):
    return session_store.get(phone, {}).get("customer_company", "Customer Company")
