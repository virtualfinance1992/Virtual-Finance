# customer_lookup.py

# ✅ Example registered customers list
REGISTERED_CUSTOMERS = {
    "vinayak konar": "917400164456",
    "ramesh": "919898989898",
    "amit": "919911223344"
}

def is_registered_customer(name, sender_number):
    return name.lower() in REGISTERED_CUSTOMERS

def get_customer_whatsapp(name, sender_number):
    return REGISTERED_CUSTOMERS.get(name.lower(), sender_number)

def is_registered_customer(name, sender_number):
    name_clean = name.lower().strip()
    result = name_clean in REGISTERED_CUSTOMERS
    print(f"🔍 Checking if registered: '{name_clean}' → {result}")
    return result

def get_customer_whatsapp(name, sender_number):
    name_clean = name.lower().strip()
    number = REGISTERED_CUSTOMERS.get(name_clean, sender_number)
    print(f"📞 Fetching number for '{name_clean}' → {number}")
    return number
