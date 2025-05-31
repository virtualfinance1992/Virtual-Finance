import os
os.environ["PATH"] += os.pathsep + r"C:/Users/pc5/Downloads/ffmpeg-7.1.1-essentials_build/ffmpeg-7.1.1-essentials_build/bin"

from flask import Flask, request, jsonify
import requests
import json
import re
from pydub import AudioSegment
import whisper

import whisper
from fallback_nlp import interpret_local_nlp
from config import META_ACCESS_TOKEN, ALLOWED_USER_PHONE
from session_manager import (
    get_user_state, set_user_state, clear_user_state,
    get_erp_company, get_customer_company
)
from customer_lookup import is_registered_customer, get_customer_whatsapp


app = Flask(__name__)
VERIFY_TOKEN = "virtual_finance_secret_token"
WHATSAPP_PHONE_NUMBER_ID = "582453088293010"
WHATSAPP_API_URL = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
MEDIA_DOWNLOAD_URL = "https://graph.facebook.com/v19.0/{MEDIA_ID}"
os.makedirs("media/audio", exist_ok=True)

def send_whatsapp_message(to, message):
    print(f"\n📤 Sending WhatsApp message to {to}: {message}")
    payload = {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "text",
        "text": {"body": message}
    }
    headers = {
        "Authorization": f"Bearer {META_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    response = requests.post(WHATSAPP_API_URL, headers=headers, json=payload)
    print("📡 WhatsApp API response:", response.status_code, response.text)

def download_audio(media_id, filename="voice_note.ogg"):
    meta_resp = requests.get(
        f"https://graph.facebook.com/v19.0/{media_id}",
        params={"fields": "url"},
        headers={"Authorization": f"Bearer {META_ACCESS_TOKEN}"}
    )
    if not meta_resp.ok:
        print("❌ Failed to fetch media URL:", meta_resp.status_code, meta_resp.text)
        return None

    media_url = meta_resp.json().get("url")
    if not media_url:
        print("❌ No URL in response:", meta_resp.text)
        return None

    headers = {"Authorization": f"Bearer {META_ACCESS_TOKEN}"}
    data_resp = requests.get(media_url, headers=headers)
    if data_resp.status_code != 200:
        print("❌ Failed to download audio file:", data_resp.status_code, data_resp.text)
        return None

    path = os.path.join("media", "audio", filename)
    with open(path, "wb") as f:
        f.write(data_resp.content)
    print(f"✅ Audio saved to {path}  (size: {len(data_resp.content)} bytes)")
    return path

def convert_ogg_to_wav(input_path):
    try:
        from pydub import AudioSegment
        from pydub.utils import which

        AudioSegment.converter = which("ffmpeg") or r"C:\Users\pc5\Downloads\ffmpeg-7.1.1-essentials_build\bin\ffmpeg.exe"
        AudioSegment.ffprobe = which("ffprobe")

        print(f"🔧 Using FFmpeg at: {AudioSegment.converter}")

        output_path = input_path.rsplit(".", 1)[0] + ".wav"
        audio = AudioSegment.from_file(input_path)      # auto-detect format
        audio.export(output_path, format="wav")
        print(f"✅ Converted to {output_path}")
        return output_path

    except Exception as e:
        print(f"❌ Error converting audio: {e}")
        return None


def transcribe_audio(wav_path):
    try:
        model = whisper.load_model("base")
        result = model.transcribe(wav_path)
        print("📝 Transcribed text:", result.get("text", "").strip())
        return result.get("text", "").strip()
    except Exception as e:
        print("❌ Whisper transcription failed:", e)
        return ""

@app.route('/webhook', methods=['GET', 'POST'])
def whatsapp_webhook():
    if request.method == 'GET':
        if request.args.get('hub.verify_token') == VERIFY_TOKEN:
            return request.args.get('hub.challenge'), 200
        return "Verification failed", 403

    if request.method == 'POST':
        data = request.get_json()
        print("\n📥 Webhook payload:", json.dumps(data))

        try:
            value = data['entry'][0]['changes'][0]['value']
            if 'messages' not in value:
                print("⚠️ Not a message payload")
                return jsonify({"status": "ignored"}), 200

            message_data = value['messages'][0]
            phone = message_data['from']
            print(f"📨 From: {phone}")

            if phone != ALLOWED_USER_PHONE:
                send_whatsapp_message(phone, "❌ Unauthorized access.")
                return jsonify({"status": "unauthorized"}), 200

            # 👂 Voice or 💬 Text
            if message_data['type'] == 'text':
                message = message_data['text']['body']
                print("💬 Text:", message)

            elif message_data['type'] == 'audio' and message_data['audio'].get('voice', False):
                print("🎧 Audio metadata:", message_data['audio'])
                media_id = message_data['audio']['id']
                ogg_path = download_audio(media_id)
                if not ogg_path:
                    send_whatsapp_message(phone, "❌ Could not fetch voice message.")
                    return jsonify({"status": "download_failed"}), 400
                wav_path = convert_ogg_to_wav(ogg_path)
                if not wav_path:
                    send_whatsapp_message(phone, "❌ Failed to convert voice note.")
                    return jsonify({"status": "conversion_failed"}), 400
                message = transcribe_audio(wav_path)

            else:
                print("⚠️ Unknown message type.")
                return jsonify({"status": "unsupported_type"}), 400

            # 🔄 NLP + State Handling
            state = get_user_state(phone)
            print("🧾 State:", state)

            if message.lower() in ["hi", "hello", "start"]:
                erp = get_erp_company(phone)
                customer = get_customer_company(phone)
                menu = (
                    f"👋 *Welcome to Virtual Finance ERP*\n"
                    f"Customer: *{customer}*\n"
                    f"Company: *{erp}*\n\n"
                    "Please choose an option:\n"
                    "1️⃣ Sales\n"
                    "2️⃣ Purchase\n"
                    "3️⃣ Expense\n"
                    "4️⃣ Income\n"
                    "5️⃣ Payment Made\n"
                    "6️⃣ Payment Received"
                )
                send_whatsapp_message(phone, menu)
                return jsonify({"status": "menu_sent"}), 200

            if message.strip() == "1":
                send_whatsapp_message(phone, """📤 Please enter *Sales Details* like:
• 2×500 avocado to Ram
• 3000 for hosting to John
• Sold 10x200 wires to Rahul
💬 You can use any simple format — I'll understand.""")
                set_user_state(phone, "awaiting_sales_input")
                return jsonify({"status": "sales_prompted"}), 200

            if state == "awaiting_sales_input":
                result = interpret_local_nlp(message, forced_type="sales")
                print("🧠 NLP Result:", result)
                reply = (
                    f"🤖 I understood this:\n"
                    f"📌 Type: {result.get('type')}\n"
                    f"💰 Amount: ₹{result.get('amount')}\n"
                    f"👤 Party: {result.get('party')}\n"
                    f"📝 Description: {result.get('description')}\n\n"
                    "✅ Reply *yes* to confirm or *no* to cancel."
                )
                with open(f"temp_sales_{phone}.txt", "w") as f:
                    f.write(f"1|{result.get('amount')}|{result.get('amount')}|{result.get('party')}|{result.get('description')}")
                set_user_state(phone, "confirming_sales_entry")
                send_whatsapp_message(phone, reply)
                return jsonify({"status": "sales_nlp_interpreted"}), 200

            if state == "confirming_sales_entry":
                if message.lower() in ["yes", "y", "confirm"]:
                    with open(f"temp_sales_{phone}.txt", "r") as f:
                        q, r, a, c, d = f.read().split("|")
                    is_registered = is_registered_customer(c, phone)
                    invoice_msg = f"🧾 *Invoice Summary*\nCustomer: *{c}*\nQty: {q} × ₹{r} = ₹{a}\nDescription: {d}"
                    if is_registered:
                        customer_whatsapp = get_customer_whatsapp(c, phone)
                        send_whatsapp_message(customer_whatsapp, invoice_msg)
                    send_whatsapp_message(phone, f"✅ Sales recorded! Invoice sent to *{c}*.")
                    clear_user_state(phone)
                    return jsonify({"status": "saved"}), 200
                elif message.lower() in ["no", "cancel"]:
                    clear_user_state(phone)
                    send_whatsapp_message(phone, "❌ Sales entry cancelled.")
                    return jsonify({"status": "cancelled"}), 200

            # NLP fallback (no state)
            if state is None:
                result = interpret_local_nlp(message, forced_type="sales")
                print("🧠 NLP (no-state) Result:", result)
                reply = (
                    f"🤖 I understood this:\n"
                    f"📌 Type: {result.get('type')}\n"
                    f"💰 Amount: ₹{result.get('amount')}\n"
                    f"👤 Party: {result.get('party')}\n"
                    f"📝 Description: {result.get('description')}\n\n"
                    "✅ Reply *yes* to confirm or *no* to cancel."
                )
                with open(f"temp_sales_{phone}.txt", "w") as f:
                    f.write(f"1|{result.get('amount')}|{result.get('amount')}|{result.get('party')}|{result.get('description')}")
                set_user_state(phone, "confirming_sales_entry")
                send_whatsapp_message(phone, reply)
                return jsonify({"status": "local_nlp_interpreted"}), 200

        except Exception as e:
            print("❌ Exception:", str(e))
            send_whatsapp_message(phone, "❌ Error processing your message.")
            return jsonify({"status": "error"}), 400

    return "Method Not Allowed", 405

if __name__ == '__main__':
    app.run(port=5005, debug=True)
