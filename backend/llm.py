import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = None

MODEL = "llama-3.1-8b-instant"


def get_client() -> Groq:
    """Initialize Groq client lazily so non-LLM flows can run without API setup."""
    global client
    if client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY is not set.")
        client = Groq(api_key=api_key)
    return client

def call_groq(system_prompt: str, messages: list) -> str:
    """
    Call Groq with a system prompt and conversation history.
    Returns the text response as a string.
    """
    formatted_messages = [
        {"role": "system", "content": system_prompt}
    ]

    for msg in messages:
        formatted_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=formatted_messages,
        temperature=0.3,
        max_tokens=1000,
    )

    return response.choices[0].message.content.strip()


def call_groq_json(system_prompt: str, messages: list) -> str:
    """
    Call Groq expecting a JSON response.
    Uses JSON mode for guaranteed valid JSON output.
    """
    formatted_messages = [
        {"role": "system", "content": system_prompt + """

CRITICAL RULES:
- Your response must be ONLY a valid JSON object
- No markdown code blocks, no backticks, no ```json
- No explanation before or after the JSON
- Start directly with { and end with }
- Double-check your JSON is valid before responding
"""}
    ]

    for msg in messages:
        formatted_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })

    response = get_client().chat.completions.create(
        model=MODEL,
        messages=formatted_messages,
        temperature=0.1,
        max_tokens=1000,
        response_format={"type": "json_object"}
    )

    return response.choices[0].message.content.strip()
