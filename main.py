from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests, os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found in .env")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze-call/")
async def analyze_call(audio: UploadFile = File(...)):
    audio_bytes = await audio.read()

    # ===============================
    # 1️⃣ SPEECH → TEXT (WHISPER)
    # ===============================
    whisper_response = requests.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}"
        },
        files={
            "file": (audio.filename, audio_bytes)
        },
        data={
            "model": "whisper-large-v3",
            "response_format": "json"
        }
    )

    if whisper_response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"Whisper API failed: {whisper_response.text}"
        )

    whisper_json = whisper_response.json()

    if "text" not in whisper_json:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected Whisper response: {whisper_json}"
        )

    transcript = whisper_json["text"]

    # ===============================
    # 2️⃣ FINANCIAL ANALYSIS (LLM)
    # ===============================
    analysis_prompt = f"""
You are a financial intelligence system.

Analyze the call transcript and return:
- Customer intent
- Sentiment (Positive / Neutral / Negative)
- Financial risk indicators
- Compliance red flags
- Actionable recommendations

Transcript:
{transcript}
"""

    llm_response = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "user", "content": analysis_prompt}
            ],
            "temperature": 0.2
        }
    )

    if llm_response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"LLM API failed: {llm_response.text}"
        )

    llm_json = llm_response.json()

    insights = llm_json["choices"][0]["message"]["content"]

    return {
        "transcript": transcript,
        "analysis": insights
    }