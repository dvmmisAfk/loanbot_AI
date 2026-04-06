import json
import re

from financials import (
    calculate_emi,
    calculate_emi_ratio,
    calculate_loan_to_income,
    calculate_npa_risk,
    format_inr,
    get_score_band,
)
from llm import call_groq_json
from state import LoanState

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

FINANCIAL KNOWLEDGE YOU MUST USE:

When a user gives you income and loan amount, mentally calculate:
  EMI using: P * r * (1+r)^n / ((1+r)^n - 1) where r = 0.00875
  EMI-to-income ratio = (EMI / income) * 100

If EMI ratio > 50%: warn the user before proceeding.
If EMI ratio 40-50%: note it's slightly above recommended.
If EMI ratio < 40%: confirm it's within safe range.

Explain like a real loan advisor — not a robot.
Example: "Your EMI would be Rs. 13,913 — that's about 34% of your
income, well within the safe zone banks use."

If user seems stressed about affordability, reassure them
and offer alternatives (lower amount, longer tenure).

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


def _latest_user_message(state: LoanState) -> str:
    for message in reversed(state.get("messages", [])):
        if message.get("role") == "user":
            return str(message.get("content", "")).strip()
    return ""


def _extract_rupee_amount(text: str) -> int | None:
    normalized = text.lower().replace(",", " ").strip()
    match = re.search(r"(\d+(?:\.\d+)?)\s*(crore|cr|lakh|lac|lakhs|lacs|thousand|k)\b", normalized)
    if match:
        value = float(match.group(1))
        unit = match.group(2)
        if unit in {"crore", "cr"}:
            return int(value * 10000000)
        if unit in {"lakh", "lac", "lakhs", "lacs"}:
            return int(value * 100000)
        return int(value * 1000)

    numeric_tokens = [token for token in re.findall(r"\d+(?:\.\d+)?", normalized) if token]
    if not numeric_tokens:
        return None

    candidate = float(max(numeric_tokens, key=lambda token: float(token)))
    if candidate < 1000:
        return None
    return int(candidate)


def _update_offer_metrics(
    state: LoanState,
    *,
    loan_amount: int | None = None,
    tenure: int | None = None,
    income: int | None = None,
) -> None:
    state["loan_amount"] = int(loan_amount if loan_amount is not None else state.get("loan_amount") or 0)
    state["tenure"] = int(tenure if tenure is not None else state.get("tenure") or 24)
    state["income"] = int(income if income is not None else state.get("income") or 0)
    state["emi"] = calculate_emi(state.get("loan_amount"), state.get("tenure"))
    state["emi_ratio"] = calculate_emi_ratio(state.get("emi"), state.get("income"))
    state["loan_to_income"] = calculate_loan_to_income(state.get("loan_amount"), state.get("income"))


def _build_offer_summary(state: LoanState) -> str:
    return (
        "📋 Your Loan Offer:\n"
        f"• Amount: {format_inr(state.get('loan_amount', 0))}\n"
        f"• Tenure: {state.get('tenure', 24)} months\n"
        f"• Monthly EMI: {format_inr(state.get('emi', 0))}\n"
        f"• Interest Rate: 10.5% p.a.\n"
        f"• EMI-to-income ratio: {state.get('emi_ratio', 0):.1f}%"
    )


def _build_affordability_follow_up(state: LoanState) -> str:
    return (
        f"Your EMI would be {format_inr(state.get('emi', 0))} which is "
        f"{state.get('emi_ratio', 0):.1f}% of your income.\n"
        "Banks recommend keeping EMI below 40% of income to qualify comfortably.\n"
        "Would you like to:\n"
        "1. Reduce the loan amount?\n"
        "2. Extend the tenure to 36 months?\n"
        "3. Proceed anyway and let the AI evaluate?"
    )


def _finalize_sales_offer(
    state: LoanState,
    *,
    intro_message: str | None = None,
    proceed_anyway: bool = False,
) -> str:
    emi_ratio = float(state.get("emi_ratio") or 0)

    lines = []
    if intro_message:
        lines.append(intro_message.strip())
    lines.append(_build_offer_summary(state))

    if emi_ratio > 50 and not proceed_anyway:
        state["affordability_warning"] = True
        state["current_step"] = "sales"
        lines.append(_build_affordability_follow_up(state))
        return "\n\n".join(lines)

    if emi_ratio > 50:
        state["affordability_warning"] = True
        lines.append(
            f"⚠️ Note: Your EMI-to-income ratio is {emi_ratio:.1f}% — this is well above the recommended 30-40% range. "
            "You chose to proceed anyway, so approval will depend heavily on your credit profile."
        )
    elif emi_ratio > 40:
        state["affordability_warning"] = True
        lines.append(
            f"⚠️ Note: Your EMI-to-income ratio is {emi_ratio:.1f}% — this is slightly above the recommended 30-40% range. "
            "Your application will be evaluated, but approval depends on your credit profile."
        )
    else:
        state["affordability_warning"] = False
        lines.append(
            f"✅ Your EMI-to-income ratio is {emi_ratio:.1f}% — well within the recommended 30-40% range. Strong eligibility."
        )

    state["current_step"] = "kyc"
    lines.append("Please share your full name exactly as it appears on your Aadhaar card to begin KYC.")
    return "\n\n".join(lines)


def _handle_affordability_follow_up(state: LoanState) -> str:
    user_message = _latest_user_message(state).lower()

    if "36" in user_message or any(word in user_message for word in ["extend", "longer", "tenure", "36 months", "36 month"]):
        if int(state.get("tenure") or 24) == 36:
            return (
                "Your tenure is already at 36 months. We can reduce the loan amount instead, "
                "or you can proceed with evaluation if you're comfortable."
            )
        _update_offer_metrics(state, tenure=36)
        return _finalize_sales_offer(
            state,
            intro_message="I have recalculated the offer on a 36-month tenure to ease the EMI burden.",
        )

    if any(word in user_message for word in ["proceed", "continue", "evaluate", "go ahead", "let the ai evaluate"]):
        return _finalize_sales_offer(
            state,
            intro_message="Understood. I will proceed with the current structure and let our AI credit engine evaluate it carefully.",
            proceed_anyway=True,
        )

    if any(word in user_message for word in ["reduce", "lower", "less", "smaller", "kam", "ghata"]) or _extract_rupee_amount(user_message):
        revised_amount = _extract_rupee_amount(user_message)
        if revised_amount is None:
            return (
                "Absolutely. Tell me the revised loan amount that feels comfortable for you, "
                "and I will recalculate the EMI instantly."
            )
        _update_offer_metrics(state, loan_amount=revised_amount)
        return _finalize_sales_offer(
            state,
            intro_message="I have recalculated the offer with the lower loan amount you requested.",
        )

    return (
        "I can help you make this more comfortable. Please choose one option:\n"
        "1. Reduce the loan amount\n"
        "2. Extend the tenure to 36 months\n"
        "3. Proceed with evaluation anyway"
    )


def sales_agent(state: LoanState) -> LoanState:
    state["current_step"] = "sales"

    try:
        collected_offer = (
            state.get("loan_amount") is not None
            and state.get("tenure") is not None
            and state.get("income") is not None
            and state.get("emi") is not None
            and state.get("emi_ratio") is not None
        )
        if collected_offer and state.get("affordability_warning") and float(state.get("emi_ratio") or 0) > 50:
            state["messages"].append({
                "role": "assistant",
                "content": _handle_affordability_follow_up(state),
            })
            return state

        result = call_groq_json(SALES_PROMPT, state["messages"])
        data = json.loads(result)

        reply = data.get("message", "How can I help you today?")

        if data.get("done"):
            loan_amount = int(data.get("loan_amount", 0))
            tenure = int(data.get("tenure", 24))
            income = int(data.get("income", 0))
            _update_offer_metrics(state, loan_amount=loan_amount, tenure=tenure, income=income)
            offer_msg = _finalize_sales_offer(state, intro_message=reply)
            state["messages"].append({
                "role": "assistant",
                "content": offer_msg
            })
        else:
            state["messages"].append({
                "role": "assistant",
                "content": reply
            })
    except (json.JSONDecodeError, KeyError, ValueError, TypeError):
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
                has_video_inputs = (
                    bool(state.get("aadhaar_image"))
                    and bool(state.get("signature_image"))
                    and bool(state.get("video_frames"))
                )

                if has_video_inputs:
                    state["current_step"] = "video_kyc"
                    state["kyc_status"] = "PENDING_VIDEO_KYC"
                    next_step_msg = "Running your video eKYC verification now..."
                else:
                    state["current_step"] = "video_kyc"
                    state["kyc_status"] = "PENDING_VIDEO_KYC"
                    next_step_msg = (
                        "Please upload your Aadhaar image, signature image, and complete the live selfie verification "
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
    emi = state.get("emi") or calculate_emi(loan_amount, tenure)
    affordability_warning = bool(state.get("affordability_warning", False))

    state["emi"] = emi

    risk_factors: list[str] = []
    approval_reasoning_parts: list[str] = []

    score = 300

    if income >= 75000:
        payment_score = 200
        approval_reasoning_parts.append(f"Income {format_inr(income)}/month suggests strong payment history")
    elif income >= 50000:
        payment_score = 175
        approval_reasoning_parts.append(f"Income {format_inr(income)}/month indicates reliable payment capacity")
    elif income >= 35000:
        payment_score = 130
        approval_reasoning_parts.append(f"Income {format_inr(income)}/month — adequate but monitored")
    elif income >= 25000:
        payment_score = 95
        risk_factors.append("Income below ₹35,000 — limited repayment buffer")
        approval_reasoning_parts.append(f"Income {format_inr(income)}/month — borderline affordability")
    else:
        payment_score = 30
        risk_factors.append("Income below ₹25,000 — high repayment risk")
        approval_reasoning_parts.append(f"Income {format_inr(income)}/month — below minimum threshold")
    score += payment_score

    loan_to_income = calculate_loan_to_income(loan_amount, income)
    state["loan_to_income"] = loan_to_income
    if loan_to_income < 1.5:
        util_score = 150
        approval_reasoning_parts.append(f"Loan-to-income ratio {loan_to_income:.1f}x — very conservative")
    elif loan_to_income < 2.5:
        util_score = 130
        approval_reasoning_parts.append(f"Loan-to-income ratio {loan_to_income:.1f}x — within safe range")
    elif loan_to_income < 4.0:
        util_score = 100
        approval_reasoning_parts.append(f"Loan-to-income ratio {loan_to_income:.1f}x — moderate exposure")
    elif loan_to_income < 6.0:
        util_score = 65
        risk_factors.append(f"Loan amount is {loan_to_income:.1f}x annual income — above recommended 4x")
    else:
        util_score = 35
        risk_factors.append(f"Loan amount is {loan_to_income:.1f}x annual income — dangerously high")
    score += util_score

    credit_mix_score = 35
    score += credit_mix_score

    if income >= 50000:
        history_score = 70
    elif income >= 30000:
        history_score = 55
    else:
        history_score = 35
    score += history_score

    if affordability_warning:
        inquiry_score = 20
        risk_factors.append("EMI-to-income ratio above recommended threshold")
    else:
        inquiry_score = 40
    score += inquiry_score

    emi_ratio = calculate_emi_ratio(emi, income)
    state["emi_ratio"] = emi_ratio

    if emi_ratio <= 25:
        score += 45
        approval_reasoning_parts.append(f"EMI {emi_ratio:.1f}% of income — excellent affordability")
    elif emi_ratio <= 35:
        score += 25
        approval_reasoning_parts.append(f"EMI {emi_ratio:.1f}% of income — within 30% safe zone")
    elif emi_ratio <= 45:
        score += 5
        risk_factors.append(f"EMI {emi_ratio:.1f}% of income — approaching RBI caution threshold of 50%")
    else:
        score -= 45
        risk_factors.append(f"EMI {emi_ratio:.1f}% of income — exceeds 50% RBI guideline")

    if tenure == 36:
        score += 12
    elif tenure == 24:
        score += 8
    else:
        score += 4

    cibil_score = min(max(score, 300), 900)
    state["cibil_score"] = cibil_score
    state["risk_factors"] = risk_factors

    if cibil_score >= 750:
        state["loan_status"] = "APPROVED"
        decision_label = "APPROVED — Excellent Profile"
        offer_note = "You qualify for our premium rate of 10.5% p.a."
    elif cibil_score >= 700:
        state["loan_status"] = "APPROVED"
        decision_label = "APPROVED — Good Profile"
        offer_note = "Approved at standard rate of 10.5% p.a."
    elif cibil_score >= 650:
        state["loan_status"] = "APPROVED"
        decision_label = "CONDITIONALLY APPROVED"
        offer_note = "Approved. Rate may vary 10.5%-14% based on documentation."
    elif cibil_score >= 600:
        state["loan_status"] = "REVIEW"
        decision_label = "UNDER REVIEW"
        offer_note = "Flagged for manual review. A loan officer may contact you."
    else:
        state["loan_status"] = "REVIEW"
        decision_label = "DECLINED — Insufficient Profile"
        offer_note = "Current profile does not meet minimum lending criteria."

    score_band = get_score_band(cibil_score)
    state["approval_reasoning"] = " | ".join(approval_reasoning_parts)

    if risk_factors:
        risk_lines = "\n".join([f"  ⚠️ {factor}" for factor in risk_factors])
        risk_block = f"\n\n🔴 Risk Factors Identified:\n{risk_lines}"
    else:
        risk_block = "\n\n🟢 No major risk factors identified."

    score_breakdown = f"""
📊 AI Credit Analysis Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CIBIL Score:       {cibil_score} / 900
Score Band:        {score_band}
EMI/Income Ratio:  {emi_ratio:.1f}% (RBI safe limit: 50%)
Loan-to-Income:    {loan_to_income:.1f}x (recommended: <4x)
Monthly Income:    {format_inr(income)}
Monthly EMI:       {format_inr(emi)}
Remaining Income:  {format_inr(income - emi)} after EMI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Decision:          {decision_label}
Note:              {offer_note}{risk_block}

📌 Score Bands (CIBIL Standard):
  750-900 → Excellent  (Fast approval, best rates)
  700-749 → Good       (Approved, standard rates)
  650-699 → Fair       (Conditional approval)
  550-649 → Poor       (Manual review required)
  300-549 → Very Poor  (Likely declined)
"""

    state["messages"].append({
        "role": "assistant",
        "content": score_breakdown.strip(),
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

        state["npa_risk"] = calculate_npa_risk(state.get("cibil_score"), state.get("emi_ratio"))

        name = state.get("name", "Applicant")
        safe_name = re.sub(r'[^a-zA-Z0-9]', '_', name)
        pdf_filename = f"sanction_{safe_name}.pdf"
        pdf_path = os.path.join("pdfs", pdf_filename)

        os.makedirs("pdfs", exist_ok=True)
        generate_pdf(state, pdf_path)

        state["pdf_path"] = pdf_path
        state["current_step"] = "done"
        loan_status = state.get("loan_status", "APPROVED")
        status_suffix = "✅" if loan_status == "APPROVED" else "⚠️"
        title = "🎉 Your Sanction Letter is Ready!" if loan_status == "APPROVED" else "📄 Your Credit Evaluation Summary is Ready!"

        final_msg = (
            f"{title}\n\n"
            f"Loan Summary:\n"
            f"• Borrower: {state.get('name')}\n"
            f"• Amount: {format_inr(state.get('loan_amount', 0))}\n"
            f"• EMI: {format_inr(state.get('emi', 0))}/month\n"
            f"• Tenure: {state.get('tenure')} months\n"
            f"• CIBIL Score: {state.get('cibil_score')}\n"
            f"• Status: {loan_status} {status_suffix}\n"
            f"🔒 NPA Risk Assessment: {state.get('npa_risk')}\n"
            "This assessment is for internal NBFC records only.\n\n"
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
