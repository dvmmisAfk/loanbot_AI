import os
import sys
sys.stdout.reconfigure(encoding='utf-8')
from pdf_gen import generate_pdf

state = {
    "name": "Divyam Sharma",
    "loan_amount": 300000,
    "tenure": 24,
    "income": 40000,
    "emi": 13913,
    "aadhaar": "123456789012",
    "pan": "ABCDE1234F",
    "cibil_score": 718,
    "loan_status": "APPROVED",
    "kyc_status": "VERIFIED",
    "current_step": "done"
}

os.makedirs("pdfs", exist_ok=True)
path = generate_pdf(state, "pdfs/test_sanction.pdf")
print(f"✅ PDF generated: {path}")
print(f"📄 Open: {os.path.abspath(path)}")
