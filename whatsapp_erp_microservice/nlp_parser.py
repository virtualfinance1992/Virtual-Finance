import openai
from config import OPENAI_API_KEY

openai.api_key = OPENAI_API_KEY

def interpret_message_with_gpt(message):
    print("📤 Sending to GPT:", message)
    print("📡 GPT API Key:", openai.api_key[:8] + "...")

    prompt = (
        "You are a financial assistant bot. Extract structured data from the following WhatsApp message.\n"
        "Respond ONLY in valid JSON with these keys:\n"
        "- type: sales, purchase, expense, income, payment_received, payment_made, quotation, estimate, journal\n"
        "- amount: numeric only\n"
        "- party: name of customer/supplier/person\n"
        "- description: purpose of the transaction\n"
        "- phone_number (optional)\n"
        "- email (optional)\n"
        "- reference (optional)\n"
        "- payment_mode (optional)\n"
        "- remarks (optional)\n\n"
        f"Message: {message}"
    )

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        result = response['choices'][0]['message']['content']
        print("📬 GPT Raw Response:", result)
        return result
    
    except Exception as e:
        print("❌ GPT Error:", str(e))
        return '{"error": "' + str(e) + '"}'
    
# nlp_parser.py

import re

def interpret_local_nlp(message, forced_type=None):
    amount = None
    party = None
    description = None

    # Step 1: Amount Detection (handles various ways of specifying prices and quantities)
    amount_match = re.search(r"(\d+)(?:\s*(?:x|pcs|kg|unit|each))?\s*(\w+)\s*(?:at|for|@)\s*(\d+)\s*(?:rupees|rs|₹|per unit)?", message, re.IGNORECASE)
    if amount_match:
        quantity = int(amount_match.group(1))
        description = amount_match.group(2)  # the item name, e.g., "rice"
        price_per_item = int(amount_match.group(3))
        amount = quantity * price_per_item
        print(f"💰 Amount detected: ₹{amount}")
    
    # Step 2: Party Detection (looking for "to [party]" or "for [party]")
    party_match = re.search(r"(?:to|for)\s+([A-Za-z]+)", message, re.IGNORECASE)
    if party_match:
        party = party_match.group(1)
        print(f"👤 Party detected: {party}")

    # Step 3: Extracting Description (e.g., rice, mango, etc.)
    description_match = re.search(r"(.*?)\s*(?:to|for)\s*", message, re.IGNORECASE)
    if description_match:
        description = description_match.group(1).strip()
        print(f"📝 Description detected: {description}")

    # Fallback: If no party or description found, assume the message is simple and descriptive
    if not description:
        description = message.split(" ")[0]  # Default to the first word as description if it's simple

 

    return {
        "type": forced_type,
        "qty": qty,
        "rate": int(amount/qty) if qty else amount,
        'amount': amount,
        'party': party,
        'description': description,
    }



    return {
        "type": forced_type,
        "qty": qty,
        "rate": int(amount/qty) if qty else amount,
        "amount": amount,
        "party": party,
        "description": description
    }
