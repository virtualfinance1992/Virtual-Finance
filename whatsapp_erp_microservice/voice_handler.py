# ✅ Corrected voice_handler.py - Separated Properly

import os
import requests
from pydub import AudioSegment
import whisper

# Whisper settings
OPENAI_MODEL_SIZE = "base"  # you can change to "tiny", "small", "medium", "large"

# Set your ffmpeg binary path if needed
FFMPEG_PATH = r"C:/Users/pc5/Downloads/ffmpeg-7.1.1-essentials_build/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe"

AudioSegment.converter = FFMPEG_PATH

def download_voice_file(media_url, filename="voice_note.ogg"):
    try:
        response = requests.get(media_url)
        if response.status_code != 200:
            print("❌ Failed to download audio file.")
            return None
        file_path = os.path.join("media", "audio", filename)
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(response.content)
        print(f"✅ Audio downloaded: {file_path}")
        return file_path
    except Exception as e:
        print("❌ Error downloading voice file:", str(e))
        return None

def convert_audio_to_wav(input_path):
    try:
        output_path = input_path.replace(".ogg", ".wav")
        audio = AudioSegment.from_file(input_path)
        audio.export(output_path, format="wav")
        print(f"✅ Audio converted to WAV: {output_path}")
        return output_path
    except Exception as e:
        print("❌ Error converting audio:", str(e))
        return None

def transcribe_voice_with_whisper(wav_path):
    try:
        model = whisper.load_model(OPENAI_MODEL_SIZE)
        result = model.transcribe(wav_path)
        text = result.get("text", "").strip()
        print(f"📝 Transcription result: {text}")
        return text
    except Exception as e:
        print("❌ Whisper transcription failed:", str(e))
        return ""

# ✅ Example use:
# if you get media_url in app.py:
#   ogg_path = download_voice_file(media_url)
#   wav_path = convert_audio_to_wav(ogg_path)
#   text = transcribe_voice_with_whisper(wav_path)
#   Then pass 'text' into interpret_local_nlp(message)
