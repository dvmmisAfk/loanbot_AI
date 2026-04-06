import os
import sys
from io import BytesIO

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding='utf-8')
from pdf_gen import generate_pdf


def make_signature_bytes() -> bytes:
    image = Image.new("RGBA", (420, 140), (255, 255, 255, 0))
    draw = ImageDraw.Draw(image)
    points = [
        (20, 92), (60, 68), (96, 82), (132, 54), (176, 74),
        (226, 46), (278, 88), (330, 58), (392, 80),
    ]
    draw.line(points, fill=(12, 28, 84, 255), width=6, joint="curve")
    draw.line([(305, 103), (390, 103)], fill=(12, 28, 84, 255), width=4)

    output = BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()

state = {
    "name": "Divyam Sharma",
    "loan_amount": 300000,
    "tenure": 24,
    "income": 40000,
    "emi": 13913,
    "aadhaar": "123456789012",
    "pan": "ABCDE1234F",
    "signature_image": make_signature_bytes(),
    "signature_filename": "signature.png",
    "cibil_score": 718,
    "loan_status": "APPROVED",
    "kyc_status": "VERIFIED",
    "current_step": "done"
}

os.makedirs("pdfs", exist_ok=True)
path = generate_pdf(state, "pdfs/test_sanction.pdf")
print(f"✅ PDF generated: {path}")
print(f"📄 Open: {os.path.abspath(path)}")
