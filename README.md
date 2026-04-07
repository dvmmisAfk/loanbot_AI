# LoanBot AI

LoanBot AI is an AI-powered loan assistant built for Indian NBFC-style workflows. It guides a borrower from first enquiry through loan type selection, affordability screening, KYC, live Video KYC with liveness detection, credit evaluation, and sanction-letter generation — all inside a chat-first experience.

## ✨ Key Features

- **Multi-agent backend flow**: Sales → KYC → Video KYC → Credit → Sanction
- **Loan type selection** with type-specific interest rates (Personal, Home, Car, Education, Business, Gold)
- **EMI affordability checks** before credit evaluation
- **Transparent CIBIL-like scoring** model (300–900) with risk-factor reasoning
- **Live webcam Video KYC** — look left + look right liveness, auto-record, one-click submit
- **Rich chat UI** with offer cards, affordability alerts, and credit reports
- **PDF sanction letters** auto-generated and auto-downloaded after KYC
- **Voice input** via MediaRecorder → Groq Whisper (works on Indian networks)
- **User authentication** with protected profile dashboard
- **Functional profile dashboard**: Dashboard, My Loans, Documents, Settings tabs
- **Instant logo navigation** — click LoanBot AI logo anywhere to return home

## What The App Does

### 1. Sales Agent

- Asks for loan type first, then collects loan amount, tenure, and monthly income
- Applies loan-type-specific interest rate for EMI calculation
- Warns users if EMI-to-income ratio exceeds recommended limits

### 2. KYC Agent

- Collects and validates borrower name, Aadhaar (12-digit), and PAN
- Regex fallback extraction bypasses LLM digit-miscounting on small models
- Masks sensitive fields before surfacing in the UI

### 3. Live Video KYC

- Face alignment guidance with MediaPipe FaceLandmarker (CDN-loaded)
- Liveness: look **left** then look **right** — detected via yaw angle
- Auto-records a 2-second clip after liveness passes
- One-click **Submit KYC** button — no file uploads required for demo
- 6.5-second processing screen, then PDF auto-downloads

### 4. Credit Agent

- Pure Python rule-based CIBIL-equivalent scoring (no LLM call)
- Evaluates income, loan-to-income ratio, EMI ratio, tenure, and affordability history
- Returns score band, risk factors, approval reasoning, NPA risk

### 5. Sanction Agent

- Generates a branded PDF via ReportLab with absolute path resolution
- Includes borrower details, financial analysis, CIBIL score, NPA risk
- `/download/{filename}` route for approval screen and profile page
- PDF auto-downloads client-side after KYC completes

### 6. User Dashboard

- **Dashboard**: Loan overview, journey timeline, EMI countdown
- **My Loans**: Active loan details, repayment schedule
- **Documents**: Downloadable sanction letter
- **Settings**: Profile editing

## Loan Types & Interest Rates

| Loan Type | Rate (p.a.) |
|---|---|
| Personal | 14.0% |
| Home | 8.5% |
| Car / Vehicle | 9.5% |
| Education | 9.0% |
| Business | 16.0% |
| Gold | 11.0% |

## Voice Input (Speech-to-Text)

Powered by **MediaRecorder → POST /transcribe → Groq Whisper** — works on Indian networks where the Web Speech API's Google endpoint is unreachable.

1. Tap the mic icon → recording starts
2. Tap again → audio sent to `/transcribe`
3. Transcript auto-fills and sends

## Architecture

```text
Frontend (React 19 + TypeScript + Vite)
    |
    |  /chat  /submit-kyc  /download  /transcribe
    v
FastAPI Backend (port 8001)
    |
    v
LangGraph Pipeline
    |- Sales Agent      (Groq LLM — llama-3.1-8b-instant)
    |- KYC Agent        (Groq LLM + regex fallback)
    |- Video KYC Agent  (hardcoded VERIFIED for demo)
    |- Credit Agent     (pure Python, no LLM)
    |- Sanction Agent   (ReportLab PDF)
    |
    +-> Groq LLM  (llama-3.1-8b-instant, 500k TPD free tier)
    +-> Groq Whisper  (voice transcription)
    +-> ReportLab PDF Generation
    +-> Fernet Encrypted Storage

Browser (MediaPipe tasks-vision CDN)
    |- Face alignment detection
    |- Yaw-based left/right liveness
    |- 2-second auto-record clip
```

## Tech Stack

### Backend

- FastAPI + uvicorn
- LangGraph
- Groq (`llama-3.1-8b-instant` + Whisper via `groq` SDK)
- ReportLab
- cryptography (Fernet)

### Frontend

- React 19 + TypeScript
- Vite + Tailwind CSS v4
- Lucide React
- `@mediapipe/tasks-vision` (CDN, Video KYC liveness)

## Key Backend Files

```text
backend/
├── agents.py          # Sales, KYC, Credit, Sanction agents + loan type rates
├── financials.py      # EMI formula with dynamic interest rate support
├── llm.py             # Groq LLM client (llama-3.1-8b-instant)
├── main.py            # FastAPI routes + /submit-kyc bypass endpoint
├── pdf_gen.py         # Sanction PDF generation (absolute paths, None-safe)
├── pipeline.py        # LangGraph routing
├── secure_storage.py  # Fernet-encrypted KYC artifact storage
├── state.py           # LoanState schema (loan_type, interest_rate added)
└── video_kyc_agent.py # Hardcoded VERIFIED for demo (no ML processing)
```

## Key Frontend Files

```text
frontend/src/
├── components/
│   ├── ChatPage.tsx      # /submit-kyc call, 6.5s min display, PDF auto-download
│   ├── ChatPanel.tsx     # Chat UI, VideoKYC placement
│   ├── VideoKYC.tsx      # Liveness (left/right), Submit KYC button, processing screen
│   ├── ApprovalScreen.tsx
│   └── VoiceButton.tsx   # MediaRecorder → Groq Whisper
├── hooks/
│   ├── useSpeechToText.ts   # MediaRecorder → /transcribe hook
│   ├── useCamera.ts         # Camera with stable ref (no re-render loop)
│   └── useFaceDetection.ts  # MediaPipe liveness (turn_left / turn_right)
├── lib/
│   └── api.ts            # API_BASE_URL (port 8001)
└── types.ts
```

## Financial Logic

### EMI Formula

```text
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)
where r = annual_rate / (12 × 100)   ← dynamic per loan type
```

### Affordability Rules

- `≤ 40%` EMI-to-income: strong eligibility
- `40–50%`: caution, proceeds with warning
- `> 50%`: high-risk warning, user chooses to adjust or proceed

### Credit Score Bands

| Score | Band |
|---|---|
| 750–900 | Excellent |
| 700–749 | Good |
| 650–699 | Fair / conditional |
| 550–649 | Poor / review |
| < 550 | Very poor |

## API Endpoints

### `POST /chat`
Main conversational endpoint.
```json
{ "session_id": "uuid", "message": "I need a personal loan" }
```

### `POST /submit-kyc/{session_id}`
Bypasses all file/ML processing. Marks KYC as VERIFIED, runs credit + sanction agents directly, returns PDF.

### `POST /transcribe`
Accepts audio file, returns Groq Whisper transcript.

### `GET /download/{filename}`
Downloads generated sanction PDF. Path traversal blocked via `os.path.basename`.

### `GET /health`
```json
{ "status": "ok" }
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- **Groq API key** — free tier at [console.groq.com](https://console.groq.com) (500k TPD on `llama-3.1-8b-instant`)
- Chrome or Edge (camera + microphone)

## Environment Variables

`backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
```

Optional:
```env
LOANBOT_FERNET_KEY=optional_pre_generated_fernet_key
VITE_API_BASE_URL=http://127.0.0.1:8001
```

## Installation

### Backend
```powershell
cd backend
py -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend
```powershell
cd frontend
npm install
```

## Running The App

```powershell
# Terminal 1 — Backend
cd backend
.\venv\Scripts\activate
py -m uvicorn main:app --host 0.0.0.0 --port 8001

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8001`

## Demo Flow

```text
User: "Mujhe personal loan chahiye"

Sales Agent  →  asks loan type → amount → tenure → income → EMI calculated at 14%
KYC Agent    →  name, Aadhaar (12-digit), PAN — regex fallback ensures accuracy
Video KYC    →  align face → look left → look right → 2s clip → Submit KYC
Processing   →  6.5s screen → credit scored → PDF generated → auto-downloaded
Approval     →  CIBIL score, loan status, sanction letter ready
```

## Security Notes

- Aadhaar and PAN masked in UI (`XXXX-XXXX-1234` / `ABCXXXX234`)
- KYC media stored Fernet-encrypted at rest
- Path traversal blocked on `/download`
- Voice audio processed server-side via Groq Whisper — not stored

## Ports

| Service | Port |
|---|---|
| Frontend dev server | 5173 |
| Backend API | 8001 |

## Repository

[https://github.com/dvmmisAfk/loanbot_AI](https://github.com/dvmmisAfk/loanbot_AI)

---

Last updated: April 7, 2026
