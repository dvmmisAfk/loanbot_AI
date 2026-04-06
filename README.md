# LoanBot AI - Intelligent Loan Processing System

A full-stack fintech application powered by AI agents that automates the loan approval process through multi-stage workflows: Sales → KYC → Credit Check → Loan Sanction with PDF generation.

## 🚀 Features

- **Multi-Agent Pipeline**: Orchestrated AI agents handling different stages of loan processing
  - **Sales Agent**: Collects loan amount, tenure, and income with natural conversation
  - **KYC Agent**: Verifies identity with Aadhaar and PAN validation
  - **Credit Agent**: Calculates CIBIL score based on financial metrics
  - **Sanction Agent**: Generates official PDF sanction letters

- **AI-Powered Conversations**: Uses Groq's LLaMA 3.3 70B for intelligent, context-aware interactions
- **JSON Mode Processing**: Structured data extraction for reliable decision making
- **PDF Generation**: Professional sanction letters with branded styling using ReportLab
- **Real-time Chat UI**: React + Vite frontend with smooth animations
- **State Management**: LangGraph-based pipeline for robust workflow orchestration

## 🏗️ Architecture

```
Frontend (React/Vite)
    ↓
FastAPI Backend
    ↓
LangGraph Pipeline
    ├─ Sales Agent (Groq LLM JSON mode)
    ├─ KYC Agent (Groq LLM JSON mode)
    ├─ Credit Agent (Python calculation)
    └─ Sanction Agent (PDF generation)
    ↓
Groq Cloud LLM / ReportLab PDF / State Management
```

## 📋 Prerequisites

- Python 3.13+
- Node.js 18+
- Groq API Key (from [console.groq.com](https://console.groq.com))
- Git

## 🔧 Installation

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create environment file with Groq API key:
   ```bash
   # Create backend/.env
   GROQ_API_KEY=your_groq_api_key_here
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run setup tests to verify everything works:
   ```bash
   python test_setup.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

## 📦 Environment Variables

Create a `backend/.env` file (already in `.gitignore`):

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 🎯 Usage

### Running the Full Pipeline

```bash
cd backend
python test_agents.py
```

This simulates a complete loan conversation:
1. User requests loan amount (3 lakh), tenure (24 months), income (₹40,000)
2. System validates KYC (name, Aadhaar, PAN)
3. Credit check calculates CIBIL score (718 with demo data)
4. Generates official sanction letter PDF

### Generating Sample PDF

```bash
cd backend
python test_pdf.py
```

Output: `pdfs/test_sanction.pdf`

### Running Setup Tests

```bash
cd backend
python test_setup.py
```

Verifies:
- ✅ State module loads correctly
- ✅ Groq API connection works
- ✅ JSON mode responses parse correctly

## 📁 Project Structure

```
loanbot/
├── backend/
│   ├── agents.py              # Sales, KYC, Credit, Sanction agents
│   ├── pipeline.py            # LangGraph workflow orchestration
│   ├── llm.py                 # Groq API integration (lazy-loaded)
│   ├── pdf_gen.py             # ReportLab PDF generation
│   ├── state.py               # LoanState TypedDict definition
│   ├── test_agents.py         # Full pipeline conversation test
│   ├── test_pdf.py            # Standalone PDF generation test
│   ├── test_setup.py          # Integration tests for setup
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables (gitignored)
│   └── pdfs/                  # Generated sanction letters
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── App.jsx            # Main app component
│   │   └── main.jsx           # Entry point
│   ├── package.json           # Node dependencies
│   ├── vite.config.js         # Vite configuration
│   └── index.html             # HTML template
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
└── .git/                      # Git repository
```

## 💻 Tech Stack

### Backend
- **FastAPI**: Modern async web framework
- **LangGraph**: Multi-agent orchestration
- **Groq**: LLaMA 3.3 70B LLM API
- **ReportLab**: PDF generation library
- **Python-dotenv**: Environment variables

### Frontend
- **React 19**: UI framework
- **Vite**: Build tool & dev server
- **Tailwind CSS**: Utility-first CSS
- **Framer Motion**: Animation library
- **TypeScript**: Type-safe JavaScript

## 🔄 Loan Processing Flow

### Stage 1: Sales (Natural Conversation)
- Collects: Loan amount, Tenure, Monthly income
- Calculates: EMI using standard formula
- Language: Hindi, English, Hinglish

### Stage 2: KYC Verification
- Collects: Full name, Aadhaar (12 digits), PAN
- Validates: Format compliance
- Output: KYC_STATUS = VERIFIED/FAILED

### Stage 3: Credit Check
- **CIBIL Score Calculation**:
  - Base: 300 points
  - Income factor: +90–220 points
  - Loan-to-income ratio: +40–160 points
  - Tenure factor: +0–100 points
  - EMI/Income ratio: +10–70 points
  - **Range**: 300–900

### Stage 4: Sanction
- Generates official branded PDF
- Includes loan summary, terms, borrower details
- Saves to `pdfs/sanction_{name}.pdf`

## 🧪 Testing

### Integration Tests
```bash
cd backend
python test_setup.py      # Validates setup
python test_agents.py     # Tests full pipeline
python test_pdf.py        # Tests PDF generation
```

### Expected Outputs

**test_setup.py**:
```
✅ State module works: greeting
✅ Groq connected: LoanBot ready!
✅ JSON mode works: {'status': 'ok'}
🚀 All systems go! Ready to build agents.
```

**test_pdf.py**:
```
✅ PDF generated: pdfs/test_sanction.pdf
📄 Open: D:\coding\loanbot\backend\pdfs\test_sanction.pdf
```

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Commit changes: `git commit -m "Add feature description"`
3. Push to remote: `git push origin feature/your-feature`
4. Open a Pull Request

## 📝 API Reference

### State Schema (LoanState)
```python
{
    "messages": List[dict],           # Conversation history
    "current_step": str,              # "greeting", "sales", "kyc", "credit", "sanction", "done"
    "name": Optional[str],            # Full name (from KYC)
    "loan_amount": Optional[int],     # Amount in rupees
    "tenure": Optional[int],          # Months (12, 24, 36)
    "income": Optional[int],          # Monthly income
    "emi": Optional[float],           # Calculated EMI
    "aadhaar": Optional[str],         # 12-digit Aadhaar
    "pan": Optional[str],             # PAN card number
    "kyc_status": Optional[str],      # "VERIFIED" or "FAILED"
    "cibil_score": Optional[int],     # 300–900
    "loan_status": Optional[str],     # "APPROVED" or "REVIEW"
    "pdf_path": Optional[str],        # Path to generated PDF
}
```

## 🔐 Security Notes

- API keys are stored in `.env` files (git-ignored)
- Aadhaar/PAN are masked in outputs
- All secrets excluded from version control
- Groq client initializes lazily (no API calls until needed)

## 📄 License

This project is proprietary and confidential.

## 📞 Support

For issues or questions, please reach out to the development team.

---

**Last Updated**: April 6, 2026  
**Repository**: [https://github.com/dvmmisAfk/loanbot_AI](https://github.com/dvmmisAfk/loanbot_AI)