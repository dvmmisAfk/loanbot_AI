import os
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional

from state import get_initial_state
from pipeline import pipeline

app = FastAPI(title="LoanBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: session_id -> LoanState
sessions: dict = {}


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    session_id: str
    message: str
    current_step: Optional[str] = None
    loan_status: Optional[str] = None
    pdf_ready: bool = False
    pdf_filename: Optional[str] = None


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())

    if session_id not in sessions:
        sessions[session_id] = get_initial_state()

    state = sessions[session_id]

    # Count assistant messages before pipeline run
    prev_assistant_count = sum(1 for m in state["messages"] if m["role"] == "assistant")

    state["messages"].append({"role": "user", "content": req.message})

    result = pipeline.invoke(state)
    sessions[session_id] = result

    # Collect all NEW assistant messages added during this pipeline run
    assistant_messages = [m for m in result["messages"] if m["role"] == "assistant"]
    new_messages = assistant_messages[prev_assistant_count:]
    combined_message = "\n\n".join(m["content"] for m in new_messages) if new_messages else ""

    pdf_path = result.get("pdf_path")
    pdf_filename = os.path.basename(pdf_path) if pdf_path else None

    return ChatResponse(
        session_id=session_id,
        message=combined_message,
        current_step=result.get("current_step"),
        loan_status=result.get("loan_status"),
        pdf_ready=bool(pdf_path and os.path.exists(pdf_path)),
        pdf_filename=pdf_filename,
    )


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    sessions.pop(session_id, None)
    return {"status": "cleared"}


@app.get("/download/{filename}")
async def download_pdf(filename: str):
    # Prevent path traversal
    safe_filename = os.path.basename(filename)
    pdf_path = os.path.join("pdfs", safe_filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=safe_filename,
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}
