# LoanBot AI

LoanBot AI is an AI-powered personal loan assistant built for Indian NBFC-style workflows. It guides a borrower from first enquiry through affordability screening, KYC, live Video KYC, credit evaluation, and sanction-letter generation inside a chat-first experience.

## ✨ Key Features

- **Multi-agent backend flow**: Sales → KYC → Video KYC → Credit → Sanction
- **EMI affordability checks** before credit evaluation
- **Transparent CIBIL-like scoring** model (300–900) with risk-factor reasoning
- **Live webcam-based Video KYC** with face alignment and liveness prompts
- **Rich chat UI** with offer cards, affordability alerts, and credit reports
- **PDF sanction letters** with financial analysis and NPA risk tagging
- **Encrypted storage** for sensitive KYC media artifacts
- **Voice input** supporting Hindi, English, and Hinglish (browser-native, no backend required)
- **User authentication** with protected profile dashboard
- **Functional profile dashboard**:
  - Dashboard tab: Loan overview, journey timeline, EMI countdown
  - My Loans tab: Active loan details, repayment schedule
  - Documents tab: Downloadable sanction letter and KYC documents
  - Settings tab: Profile management (name, email, phone)
- **Instant logo navigation** — click LoanBot AI logo anywhere to return home
- **Graceful rate-limit handling** — surfaced as user-friendly messages

## What The App Does

### 1. Sales Agent

- Collects loan amount, tenure, and monthly income in natural conversation
- Calculates EMI using the standard amortization formula
- Applies affordability checks before moving forward
- Warns users if EMI-to-income ratio is above recommended limits

### 2. KYC Agent

- Collects and validates borrower name, Aadhaar, and PAN
- Masks sensitive identity fields before sending data to the frontend
- Routes verified users into live Video KYC

### 3. Live Video KYC

- Live webcam capture flow with face-positioning guidance
- Uses browser camera via `navigator.mediaDevices.getUserMedia`
- Detects: no face, multiple faces, low lighting, unstable position, bad alignment
- Runs randomized liveness prompts (blink, smile, turn, nod)
- Auto-records a short clip only when the face is valid
- Sends recorded video + Aadhaar image to the backend for server-side validation

### 4. Credit Agent

- India-oriented underwriting model producing a CIBIL-equivalent score (300–900)
- Evaluates income stability, loan-to-income ratio, EMI-to-income ratio, tenure impact, and affordability history
- Returns `emi_ratio`, `loan_to_income`, `risk_factors`, `approval_reasoning`, `npa_risk`
- Generates machine-readable credit analysis for the UI

### 5. Sanction Agent

- Generates a branded sanction PDF via ReportLab
- Includes borrower details, financial analysis, credit summary, and NPA risk
- Exposes `/download/{filename}` route for approval screen and profile page

### 6. User Dashboard

- **Dashboard**: Overview with key loan metrics, loan journey timeline, EMI countdown
- **My Loans**: Active loan details, interest rate, tenure, disbursement date, maturity
- **Documents**: Download sanction letter PDF, access KYC summary (when complete)
- **Settings**: Edit profile information with one-click save

## Voice Input (Speech-to-Text)

Powered by the browser-native **Web Speech API** — no external service, no audio stored or transmitted.

### Supported Languages

| Mode | Example |
|---|---|
| Pure English | "I need a 3 lakh loan for 24 months" |
| Pure Hindi | "मुझे तीन लाख का लोन चाहिए" |
| Hinglish | "Mujhe loan lena hai, income 50000 hai" |

### How It Works

1. Tap the mic icon in the chat input bar
2. A **"Listening…"** indicator appears — speak naturally
3. Interim transcription appears live inside the input field
4. When you stop speaking, the final transcript is automatically sent to the chatbot
5. Tap the mic again to stop early

### Language Selection

Use the language selector next to the mic button to switch between हिंदी (hi-IN), English IN (en-IN), and English US (en-US). The selected language persists for the session.

### Error Handling

| Error | User-Facing Message |
|---|---|
| Mic permission denied | "Microphone access denied. Click the lock icon and allow mic access." |
| No speech detected | "No speech detected. Please try again and speak clearly." |
| No microphone | "No microphone found. Please connect one and try again." |
| Network error | "Voice recognition failed. Try typing instead, or use Chrome/Edge with a stable connection." |
| Unsupported browser | Mic button is shown as disabled |

### Browser Support

| Browser | Support |
|---|---|
| Chrome (desktop + Android) | Full support |
| Edge | Full support |
| Safari (macOS + iOS) | Via `webkitSpeechRecognition` |
| Firefox | Not supported (button disabled) |

## Navigation & UX

### Logo Navigation
- Click the **LoanBot AI** logo from any page to return to the home page
- Works on:
  - Landing page
  - Login/Signup forms
  - Chat modal
  - Chat panel
  - Profile dashboard (both desktop & mobile)

### Profile Dashboard
- Access via login and navigation to `/profile`
- **Desktop**: Fixed sidebar with navigation tabs and mobile hamburger menu
- **Mobile**: Collapsible drawer menu for all navigation
- **Functional tabs**:
  - Dashboard: Loan metrics and journey timeline
  - My Loans: Detailed active loan information
  - Documents: Download center for loan documents
  - Settings: Profile editing form
- **Sign Out**: Clears session and returns to login

## Architecture

```text
Frontend (React 19 + TypeScript + Vite)
    |
    |  /chat, /video-kyc, /download, /verify-face, /submit-signature
    v
FastAPI Backend (port 8000)
    |
    v
LangGraph Pipeline
    |- Sales Agent
    |- KYC Agent
    |- Video KYC Agent  (lazy-loads heavy deps: cv2, torch, mediapipe)
    |- Credit Agent
    |- Sanction Agent
    |
    +-> Groq LLM  (llama-3.1-8b-instant via groq SDK)
    +-> ReportLab PDF Generation
    +-> Encrypted Media Storage (Fernet)

Browser STT (Web Speech API — no backend needed)
    |- useVoiceInput hook
    |- Language switcher: hi-IN / en-IN / en-US
    |- Real-time interim transcription
    +-> Auto-send final transcript to /chat endpoint
```

## Tech Stack

### Backend

- FastAPI + uvicorn
- LangGraph
- Groq (`llama-3.1-8b-instant` via `groq` SDK)
- ReportLab
- cryptography (Fernet)
- OpenCV, MediaPipe, facenet-pytorch, pytesseract *(optional — Video KYC only)*

### Frontend

- React 19 + TypeScript
- Vite + Tailwind CSS v4
- Framer Motion
- Lucide React
- `@mediapipe/tasks-vision` (CDN, Video KYC)
- Web Speech API (built-in, no package required)

## Key Backend Files

```text
backend/
├── agents.py                # Sales, KYC, Credit, Sanction agent logic
├── financials.py            # EMI formula and credit-scoring helpers
├── llm.py                   # Groq LLM client (MODEL = llama-3.1-8b-instant)
├── main.py                  # FastAPI routes, session management, error handling
├── pdf_gen.py               # Sanction PDF generation
├── pipeline.py              # LangGraph routing
├── secure_storage.py        # Fernet-encrypted storage for KYC artifacts
├── state.py                 # LoanState schema and defaults
├── video_kyc_agent.py       # Face match, OCR, liveness evaluation (lazy deps)
├── test_agents.py           # Full backend flow test
├── test_financial_logic.py  # Financial profile validation test
├── test_pdf.py              # PDF generation test
└── test_setup.py            # Environment/setup test
```

## Key Frontend Files

```text
frontend/src/
├── components/
│   ├── ChatPage.tsx           # Chat route and API orchestration
│   ├── ChatPanel.tsx          # Chat UI with voice-integrated input bar
│   ├── ChatSidebar.tsx        # Live loan metrics sidebar
│   ├── ApprovalScreen.tsx     # Loan approved screen with PDF download
│   ├── CreditReportCard.tsx   # AI credit analysis card
│   ├── AffordabilityAlert.tsx # High EMI-ratio warning card
│   ├── LoanOfferCard.tsx      # EMI offer breakdown card
│   ├── KYCCard.tsx            # Identity verification summary card
│   ├── VoiceButton.tsx        # Animated mic button with language switcher
│   ├── VideoKYC.tsx           # Live webcam KYC component
│   └── LandingPage.tsx        # Marketing landing page
├── hooks/
│   ├── useVoiceInput.ts       # Web Speech API hook (hi-IN / en-IN / en-US)
│   ├── useCamera.ts
│   └── useFaceDetection.ts
├── lib/
│   └── api.ts                 # API_BASE_URL and apiUrl() helper
├── pages/
│   ├── Login.tsx
│   ├── Signup.tsx
│   └── Profile.tsx
└── types.ts                   # ChatMessage, LoanData, parseLoanData
```

## Financial Logic

### EMI Formula

```text
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)
where r = 10.5 / (12 × 100) = 0.00875
```

### Affordability Rules

- `≤ 40%` EMI-to-income: strong
- `40–50%`: caution, application can proceed
- `> 50%`: warning — borrower chooses to reduce amount, extend tenure, or proceed

### Credit Score Bands

- `750–900`: Excellent
- `700–749`: Good
- `650–699`: Fair / conditional
- `550–649`: Poor / review
- `< 550`: Very poor

### NPA Risk Logic

- `LOW`: high score + healthy EMI burden
- `MEDIUM`: moderate score or moderate EMI burden
- `HIGH`: weak score or stressed affordability

## API Endpoints

### `POST /chat`

Main conversational endpoint.

Request:

```json
{
  "session_id": "optional-uuid",
  "message": "I need a 3 lakh loan"
}
```

Response fields: `session_id`, `messages`, `current_step`, `loan_status`, `pdf_ready`, `pdf_filename`, `loan_data`.

Rate-limit errors from Groq are caught and returned as a friendly message inside `messages` rather than a 500.

### `POST /video-kyc/{session_id}`

Multipart form upload: `aadhaar_image`, `signature_image`, `live_video`, `video_meta` (JSON string), `user_name`.

Returns: `video_kyc_status`, `face_match_score`, `liveness_passed`, `ocr_name`, `ocr_aadhaar`, `kyc_confidence`, `loan_data`.

### `POST /verify-face`

Mock face verification for demo purposes. Marks session as face-verified when a non-empty base64 image is provided.

### `POST /submit-signature`

Stores a base64 signature in the session for PDF embedding.

### `GET /download/{filename}`

Downloads the generated sanction PDF. Path traversal is prevented via `os.path.basename`.

### `DELETE /session/{session_id}`

Clears a session from memory.

### `GET /health`

```json
{"status": "ok"}
```

## LoanState Fields

```python
{
    "current_step": str,          # greeting / sales / kyc / video_kyc / credit / sanction / done
    "loan_amount": Optional[int],
    "tenure": Optional[int],
    "income": Optional[int],
    "emi": Optional[float],
    "emi_ratio": Optional[float],
    "affordability_warning": Optional[bool],
    "loan_to_income": Optional[float],
    "risk_factors": Optional[list],
    "approval_reasoning": Optional[str],
    "npa_risk": Optional[str],
    "name": Optional[str],
    "aadhaar": Optional[str],
    "pan": Optional[str],
    "kyc_status": Optional[str],
    "video_kyc_status": Optional[str],
    "face_match_score": Optional[float],
    "liveness_passed": Optional[bool],
    "kyc_confidence": Optional[float],
    "cibil_score": Optional[int],
    "loan_status": Optional[str],
    "pdf_path": Optional[str],
}
```

## Prerequisites

- Python 3.11+
- Node.js 18+
- A **Groq API key** (free tier at console.groq.com — 500k tokens/day on `llama-3.1-8b-instant`)
- Chrome or Edge for microphone and camera access
- Tesseract OCR on `PATH` *(optional — only needed for Aadhaar OCR in Video KYC)*

## Environment Variables

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key_here
```

Optional:

```env
LOANBOT_FERNET_KEY=optional_pre_generated_fernet_key
```

If `LOANBOT_FERNET_KEY` is not set, the app auto-generates one and stores it in the gitignored secure uploads directory.

Optional frontend variable (defaults to `http://127.0.0.1:8000`):

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
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

### Start Backend

```powershell
cd backend
.\venv\Scripts\activate
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### Start Frontend

```powershell
cd frontend
npm run dev
```

Open:

- Frontend: `http://localhost:5173`
- Backend: `http://127.0.0.1:8000`

## Tests

### Backend

```powershell
cd backend
.\venv\Scripts\activate
python test_setup.py
python test_pdf.py
python test_agents.py
python test_financial_logic.py
```

### Frontend

```powershell
cd frontend
npm run lint
npm run build
```

## Example Demo Flow

```text
User (voice or text): "Mujhe 3 lakh ka loan chahiye"

Sales Agent  →  collects amount, tenure, income; calculates EMI; checks affordability
KYC Agent    →  captures name, Aadhaar, PAN
Video KYC    →  live camera, liveness check, submits to backend
Credit Agent →  generates AI Credit Analysis Report, CIBIL score, risk factors
Sanction     →  generates PDF; approval screen shown; download available
```

## Security Notes

- Aadhaar and PAN are masked before being surfaced in the UI (`XXXX-XXXX-1234` / `ABCXXXX234`)
- KYC media files are stored encrypted at rest using Fernet
- Sensitive runtime artifacts are kept in gitignored directories
- Path traversal is blocked on the `/download` route via `os.path.basename`
- Voice audio is processed entirely on-device — no audio is stored or transmitted

## Current Ports

- Frontend dev server: `5173`
- Backend API: `8000`

## Repository

- GitHub: [https://github.com/dvmmisAfk/loanbot_AI](https://github.com/dvmmisAfk/loanbot_AI)

## License

This project is proprietary and confidential.

---

Last updated: April 7, 2026
