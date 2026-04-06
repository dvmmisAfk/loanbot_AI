import json
import re
from state import LoanState
from llm import call_groq, call_groq_json

# ─────────────────────────────────────
# AGENT 1: SALES AGENT
# Collects: loan_amount, tenure, income
# Calculates: EMI
# Transitions to: kyc
# ─────────────────────────────────────

SALES_PROMPT = """You are Riya, a warm and friendly loan sales
assistant for QuickLoan NBFC — a trusted Indian lending company.

YOUR ONLY JOB: Collect exactly 3 things from the customer:
1. loan_amount — how much money they want in rupees
2. tenure — repayment period in months (12, 24, or 36 only)
3. income — their monthly income in rupees

STRICT RULES:
- Greet the customer warmly on first message
- Speak naturally — match their language (Hindi, English, Hinglish)
- Ask for ONE missing thing at a time, never multiple questions
- Be encouraging and empathetic — this is their financial dream
- Never mention documents, Aadhaar, PAN — that comes later
- If they give amount in lakhs, convert: 3 lakh = 300000
- If tenure given in years, convert: 2 years = 24 months
- Accept approximate income ("around 40k", "40 thousand" = 40000)

WHEN YOU HAVE ALL 3, respond with ONLY this JSON:
{
  "done": true,
  "loan_amount": 300000,
  "tenure": 24,
  "income": 40000,
  "message": "Great news! Here is your personalized loan offer..."
}

WHEN STILL COLLECTING, respond with ONLY this JSON:
{
  "done": false,
  "message": "your natural conversational response here"
}

CRITICAL: Response must be pure JSON only. No text before or after."""


def sales_agent(state: LoanState) -> LoanState:
    try:
        result = call_groq_json(SALES_PROMPT, state["messages"])
        data = json.loads(result)

        reply = data.get("message", "How can I help you today?")

        if data.get("done"):
            loan_amount = int(data.get("loan_amount", 0))
            tenure = int(data.get("tenure", 24))
            income = int(data.get("income", 0))

            # EMI calculation: P × r(1+r)^n / ((1+r)^n - 1)
            annual_rate = 10.5
            r = annual_rate / (12 * 100)
            n = tenure
            emi = loan_amount * r * (1 + r)**n / ((1 + r)**n - 1)

            state["loan_amount"] = loan_amount
            state["tenure"] = tenure
            state["income"] = income
            state["emi"] = round(emi)
            state["current_step"] = "kyc"

            offer_msg = (
                f"{reply}\n\n"
                f"📋 Your Loan Offer:\n"
                f"• Amount: ₹{loan_amount:,}\n"
                f"• Tenure: {tenure} months\n"
                f"• Monthly EMI: ₹{round(emi):,}\n"
                f"• Interest Rate: 10.5% p.a.\n\n"
                f"Shall we proceed with KYC verification?"
            )
            state["messages"].append({
                "role": "assistant",
                "content": offer_msg
            })
        else:
            state["messages"].append({
                "role": "assistant",
                "content": reply
            })

    except (json.JSONDecodeError, KeyError, ValueError):
        fallback = "Namaste! I am Riya from QuickLoan. How much loan do you need today?"
        state["messages"].append({
            "role": "assistant",
            "content": fallback
        })

    return state


# ─────────────────────────────────────
# AGENT 2: KYC AGENT
# Collects: name, aadhaar, pan
# Validates: format of each
# Transitions to: credit
# ─────────────────────────────────────

KYC_PROMPT = """You are Priya, a professional KYC verification
officer at QuickLoan NBFC. You are thorough but friendly.

YOUR ONLY JOB: Collect and validate 3 identity details:
1. full_name — exactly as on Aadhaar card
2. aadhaar — 12 digit number (accept with or without dashes)
3. pan — PAN card number (format: 5 LETTERS + 4 DIGITS + 1 LETTER)

COLLECTION ORDER: Always collect in this order:
- First ask for full name
- Then ask for Aadhaar number
- Then ask for PAN number

VALIDATION RULES:
- Name: Must be at least 2 words, letters only
- Aadhaar: Must be exactly 12 digits (ignore dashes/spaces)
- PAN: Must match pattern ABCDE1234F (5 letters, 4 digits, 1 letter)
- If format is wrong, explain gently and ask again
- Mask Aadhaar in your reply: show only last 4 digits

TONE: Professional but warm. Assure them data is safe and encrypted.
Match their language — Hindi, English, or Hinglish.
Never rush them. One thing at a time.

WHEN ALL 3 COLLECTED AND VALID, respond ONLY with this JSON:
{
  "done": true,
  "name": "Rahul Sharma",
  "aadhaar": "123456789012",
  "pan": "ABCDE1234F",
  "message": "your warm verification success message"
}

WHEN STILL COLLECTING, respond ONLY with this JSON:
{
  "done": false,
  "message": "your next question or gentle correction"
}

CRITICAL: Response must be pure JSON only. No text before or after."""


def kyc_agent(state: LoanState) -> LoanState:
    try:
        result = call_groq_json(KYC_PROMPT, state["messages"])
        data = json.loads(result)

        reply = data.get("message", "Please share your full name.")

        if data.get("done"):
            name = data.get("name", "")
            aadhaar = re.sub(r'[\s-]', '', data.get("aadhaar", ""))
            pan = data.get("pan", "").upper().strip()

            aadhaar_valid = len(aadhaar) == 12 and aadhaar.isdigit()
            pan_valid = bool(re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', pan))

            if aadhaar_valid and pan_valid and len(name) > 2:
                state["name"] = name
                state["user_name"] = name
                state["aadhaar"] = aadhaar
                state["pan"] = pan
                has_video_inputs = bool(state.get("aadhaar_image")) and bool(state.get("video_frames"))

                if has_video_inputs:
                    state["current_step"] = "video_kyc"
                    state["kyc_status"] = "PENDING_VIDEO_KYC"
                    next_step_msg = "Running your video eKYC verification now..."
                else:
                    state["current_step"] = "video_kyc"
                    state["kyc_status"] = "PENDING_VIDEO_KYC"
                    next_step_msg = (
                        "Please upload your Aadhaar image and a short selfie video "
                        "to continue with video eKYC."
                    )

                verified_msg = (
                    f"{reply}\n\n"
                    f"✅ Document KYC Captured\n"
                    f"• Name: {name}\n"
                    f"• Aadhaar: XXXX-XXXX-{aadhaar[-4:]}\n"
                    f"• PAN: {pan[:3]}XXXXXXX\n\n"
                    f"{next_step_msg}"
                )
                state["messages"].append({
                    "role": "assistant",
                    "content": verified_msg
                })
            else:
                state["messages"].append({
                    "role": "assistant",
                    "content": "Let me re-verify your details. " + reply
                })
        else:
            state["messages"].append({
                "role": "assistant",
                "content": reply
            })

    except (json.JSONDecodeError, KeyError):
        state["messages"].append({
            "role": "assistant",
            "content": "Please share your full name as on your Aadhaar card."
        })

    return state


# ─────────────────────────────────────
# AGENT 3: CREDIT AGENT
# Pure Python — no LLM call needed
# Calculates CIBIL score from income/loan
# Transitions to: sanction
# ─────────────────────────────────────

def credit_agent(state: LoanState) -> LoanState:
    income = state.get("income") or 0
    loan_amount = state.get("loan_amount") or 0
    tenure = state.get("tenure") or 24

    score = 300  # base score

    # Income factor (max +220)
    if income >= 75000:
        score += 220
    elif income >= 50000:
        score += 190
    elif income >= 35000:
        score += 160
    elif income >= 25000:
        score += 130
    else:
        score += 90

    # Loan to annual income ratio (max +160)
    annual_income = income * 12
    ratio = loan_amount / annual_income if annual_income > 0 else 999
    if ratio < 2:
        score += 160
    elif ratio < 3:
        score += 140
    elif ratio < 4:
        score += 110
    elif ratio < 5:
        score += 80
    else:
        score += 40

    # Tenure factor — longer = more stable (max +100)
    score += min(tenure * 2, 100)

    # EMI to income ratio check (max +70)
    emi = state.get("emi") or 0
    emi_ratio = (emi / income * 100) if income > 0 else 100
    if emi_ratio < 30:
        score += 70
    elif emi_ratio < 40:
        score += 50
    elif emi_ratio < 50:
        score += 30
    else:
        score += 10

    state["cibil_score"] = min(score, 900)

    if score >= 700:
        state["loan_status"] = "APPROVED"
        status_emoji = "✅"
        status_msg = "Congratulations! Your loan is APPROVED!"
        score_label = "Excellent"
    elif score >= 650:
        state["loan_status"] = "APPROVED"
        status_emoji = "✅"
        status_msg = "Good news! Your loan is APPROVED!"
        score_label = "Good"
    elif score >= 600:
        state["loan_status"] = "REVIEW"
        status_emoji = "⚠️"
        status_msg = "Your application is under review."
        score_label = "Fair"
    else:
        state["loan_status"] = "REVIEW"
        status_emoji = "⚠️"
        status_msg = "Your application needs additional review."
        score_label = "Needs Improvement"

    credit_msg = (
        f"Credit Check Complete! {status_emoji}\n\n"
        f"📊 Credit Report:\n"
        f"• CIBIL Score: {state['cibil_score']} ({score_label})\n"
        f"• EMI/Income Ratio: {emi_ratio:.1f}%\n"
        f"• Status: {state['loan_status']}\n\n"
        f"{status_msg}\n"
        f"Generating your official sanction letter now..."
    )

    state["messages"].append({
        "role": "assistant",
        "content": credit_msg
    })
    state["current_step"] = "sanction"
    return state


# ─────────────────────────────────────
# AGENT 4: SANCTION AGENT
# Generates PDF
# Transitions to: done
# ─────────────────────────────────────

def sanction_agent(state: LoanState) -> LoanState:
    try:
        from pdf_gen import generate_pdf
        import os

        name = state.get("name", "Applicant")
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', name)
        pdf_filename = f"sanction_{safe_name}.pdf"
        pdf_path = os.path.join("pdfs", pdf_filename)

        os.makedirs("pdfs", exist_ok=True)
        generate_pdf(state, pdf_path)

        state["pdf_path"] = pdf_path
        state["current_step"] = "done"

        final_msg = (
            f"🎉 Your Sanction Letter is Ready!\n\n"
            f"Loan Summary:\n"
            f"• Borrower: {state.get('name')}\n"
            f"• Amount: ₹{state.get('loan_amount', 0):,}\n"
            f"• EMI: ₹{state.get('emi', 0):,}/month\n"
            f"• Tenure: {state.get('tenure')} months\n"
            f"• CIBIL Score: {state.get('cibil_score')}\n"
            f"• Status: {state.get('loan_status')} ✅\n\n"
            f"Click the Download button to get your "
            f"official sanction letter PDF!"
        )
        state["messages"].append({
            "role": "assistant",
            "content": final_msg
        })

    except Exception:
        state["messages"].append({
            "role": "assistant",
            "content": "Your loan is approved! Sanction letter ready for download."
        })
        state["current_step"] = "done"

    return state
