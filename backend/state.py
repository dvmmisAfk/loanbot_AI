from typing import TypedDict, Optional, List

class LoanState(TypedDict):
    messages: List[dict]
    current_step: str
    name: Optional[str]
    loan_amount: Optional[int]
    tenure: Optional[int]
    income: Optional[int]
    emi: Optional[float]
    aadhaar: Optional[str]
    pan: Optional[str]
    kyc_status: Optional[str]
    cibil_score: Optional[int]
    loan_status: Optional[str]
    pdf_path: Optional[str]

def get_initial_state() -> LoanState:
    return {
        "messages": [],
        "current_step": "greeting",
        "name": None,
        "loan_amount": None,
        "tenure": None,
        "income": None,
        "emi": None,
        "aadhaar": None,
        "pan": None,
        "kyc_status": None,
        "cibil_score": None,
        "loan_status": None,
        "pdf_path": None,
    }
