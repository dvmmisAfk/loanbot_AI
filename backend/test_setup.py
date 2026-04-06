import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

def test_groq_connection():
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": "Say 'LoanBot ready!' and nothing else."
            }
        ],
        max_tokens=20
    )
    reply = response.choices[0].message.content.strip()
    print("✅ Groq connected:", reply)

def test_state_import():
    from state import LoanState, get_initial_state
    state = get_initial_state()
    assert state["current_step"] == "greeting"
    assert state["loan_amount"] is None
    print("✅ State module works:", state["current_step"])

def test_json_mode():
    from llm import call_groq_json
    messages = [{"role": "user", "content": "test"}]
    system = "Return a JSON with one field: status with value 'ok'"
    result = call_groq_json(system, messages)
    import json
    parsed = json.loads(result)
    assert parsed.get("status") == "ok"
    print("✅ JSON mode works:", parsed)

if __name__ == "__main__":
    print("Running setup tests...")
    print("---")
    test_state_import()
    test_groq_connection()
    test_json_mode()
    print("---")
    print("🚀 All systems go! Ready to build agents.")
