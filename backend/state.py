from typing import Any, List, Optional, TypedDict

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
    user_name: Optional[str]
    aadhaar_image: Optional[Any]
    video_frames: Optional[Any]
    video_kyc_status: Optional[str]
    face_match_score: Optional[float]
    liveness_passed: Optional[bool]
    ocr_name: Optional[str]
    ocr_aadhaar: Optional[str]
    kyc_confidence: Optional[float]
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
        "user_name": None,
        "aadhaar_image": None,
        "video_frames": None,
        "video_kyc_status": None,
        "face_match_score": None,
        "liveness_passed": None,
        "ocr_name": None,
        "ocr_aadhaar": None,
        "kyc_confidence": None,
        "cibil_score": None,
        "loan_status": None,
        "pdf_path": None,
    }
