from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm, mm
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table,
    TableStyle, HRFlowable, KeepTogether, Image as RLImage
)
from datetime import date, timedelta
import calendar
import os
from PIL import Image as PILImage

from financials import calculate_loan_to_income, calculate_npa_risk, get_score_band


# ── Brand colors ─────────────────────────────────────
NAVY        = colors.HexColor('#0a0a1a')
NAVY_LIGHT  = colors.HexColor('#161625')
LIME        = colors.HexColor('#b8ff4f')
PURPLE      = colors.HexColor('#6d5ce7')
SUCCESS     = colors.HexColor('#22c55e')
GRAY_DARK   = colors.HexColor('#1e1e2e')
GRAY_MID    = colors.HexColor('#8a8a9a')
GRAY_LIGHT  = colors.HexColor('#f0f0f0')
GRAY_BG     = colors.HexColor('#f8f9fa')
WHITE       = colors.white
AMBER       = colors.HexColor('#f59e0b')
RISK_RED    = colors.HexColor('#ef4444')


def fmt_inr(amount):
    """Format number as Indian currency: 300000 → ₹3,00,000"""
    try:
        amount = int(amount)
        s = str(amount)
        if len(s) <= 3:
            return f"₹{s}"
        last3 = s[-3:]
        rest = s[:-3]
        groups = []
        while len(rest) > 2:
            groups.append(rest[-2:])
            rest = rest[:-2]
        if rest:
            groups.append(rest)
        groups.reverse()
        return f"₹{','.join(groups)},{last3}"
    except Exception:
        return f"₹{amount}"


def mask_aadhaar(aadhaar):
    a = str(aadhaar).replace('-', '').replace(' ', '')
    return f"XXXX-XXXX-{a[-4:]}" if len(a) >= 4 else "XXXX-XXXX-XXXX"


def mask_pan(pan):
    p = str(pan).upper().strip()
    return f"{p[:3]}{'*' * 4}{p[-3:]}" if len(p) >= 6 else "XXXXXXXXXX"


def add_months(dt, months):
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


def build_signature_image(signature_image, max_width, max_height):
    if not signature_image:
        return None

    try:
        with PILImage.open(BytesIO(signature_image)) as image:
            normalized = image.convert("RGBA")
            white_bg = PILImage.new("RGBA", normalized.size, (255, 255, 255, 255))
            white_bg.alpha_composite(normalized)
            flattened = white_bg.convert("RGB")

            width, height = flattened.size
            if width <= 0 or height <= 0:
                return None

            scale = min(max_width / width, max_height / height, 1.0)
            output = BytesIO()
            flattened.save(output, format="PNG")
            output.seek(0)
            return RLImage(output, width=width * scale, height=height * scale)
    except Exception:
        return None


def generate_pdf(state: dict, path: str) -> str:
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)

    # ── Extract state ────────────────────────────────
    name        = state.get('name', 'Applicant')
    loan_amount = int(state.get('loan_amount', 0))
    tenure      = int(state.get('tenure', 24))
    income      = int(state.get('income', 0))
    emi         = int(state.get('emi', 0))
    cibil       = int(state.get('cibil_score', 0))
    loan_status = state.get('loan_status', 'APPROVED')
    kyc_status  = state.get('kyc_status', 'VERIFIED')
    aadhaar     = state.get('aadhaar', '')
    pan         = state.get('pan', '')
    signature_image = state.get('signature_image')
    today       = date.today()
    maturity    = add_months(today, tenure)
    total_pay   = emi * tenure
    total_int   = total_pay - loan_amount
    emi_ratio   = float(state.get('emi_ratio', round((emi / income * 100), 1) if income else 0))
    loan_to_income = float(state.get('loan_to_income') or calculate_loan_to_income(loan_amount, income))
    remaining_income = income - emi
    npa_risk = state.get('npa_risk') or calculate_npa_risk(cibil, emi_ratio)
    approval_reasoning = state.get('approval_reasoning') or "Affordability and income stability supported the decision."
    top_reason = approval_reasoning.split(" | ")[0] if approval_reasoning else "AI affordability and credit fit"
    score_band = get_score_band(cibil)
    if emi_ratio <= 40:
        affordability = "Within Safe Limits ✓"
    elif emi_ratio <= 50:
        affordability = "Above Recommended ⚠"
    else:
        affordability = "High EMI Burden ✕"
    ref_no      = f"QL/{name[:2].upper()}/{today.strftime('%Y%m%d')}/{str(loan_amount)[-4:]}"
    status_color = SUCCESS if loan_status == 'APPROVED' else AMBER
    npa_color = SUCCESS if npa_risk == 'LOW' else AMBER if npa_risk == 'MEDIUM' else RISK_RED

    # ── Document ──────────────────────────────────────
    doc = SimpleDocTemplate(
        path, pagesize=A4,
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.2*cm, bottomMargin=1.0*cm
    )

    def ps(name, **kw):
        return ParagraphStyle(name, **kw)

    S = {
        'h1':       ps('h1', fontSize=20, fontName='Helvetica-Bold',
                       textColor=WHITE, leading=24),
        'h1sub':    ps('h1sub', fontSize=8, fontName='Helvetica',
                       textColor=colors.HexColor('#a0a0b0'), leading=11),
        'ref':      ps('ref', fontSize=8, fontName='Helvetica',
                       textColor=colors.HexColor('#a0a0b0'),
                       alignment=TA_RIGHT, leading=12),
        'sec':      ps('sec', fontSize=8, fontName='Helvetica-Bold',
                       textColor=PURPLE, leading=10, spaceBefore=4, spaceAfter=3),
        'body':     ps('body', fontSize=8.5, fontName='Helvetica',
                       textColor=NAVY, leading=13),
        'bodysm':   ps('bodysm', fontSize=7.5, fontName='Helvetica',
                       textColor=colors.HexColor('#3a3a4a'), leading=11),
        'approve':  ps('approve', fontSize=11, fontName='Helvetica-Bold',
                       textColor=WHITE, alignment=TA_CENTER, leading=14),
        'stamp_sub':ps('stamp_sub', fontSize=7.5, fontName='Helvetica',
                       textColor=colors.HexColor('#d0ffd0'),
                       alignment=TA_CENTER, leading=10),
    }

    story = []
    W = A4[0] - 3.0*cm

    # ══════════════════════════════════════════════════
    # BLOCK 1 — HEADER BAND
    # ══════════════════════════════════════════════════
    header = Table([[
        Table([
            [Paragraph("QuickLoan NBFC", S['h1'])],
            [Paragraph(
                "RBI Registered NBFC  •  CIN: U65100MH2020PTC123456  •  ISO 9001:2015",
                S['h1sub']
            )],
        ], colWidths=[W * 0.62]),
        Table([
            [Paragraph(
                f"LOAN SANCTION LETTER<br/>"
                f"<font size=7>Ref: {ref_no}</font><br/>"
                f"<font size=7>Date: {today.strftime('%d %B %Y')}</font>",
                S['ref']
            )],
        ], colWidths=[W * 0.38]),
    ]], colWidths=[W * 0.62, W * 0.38])
    header.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), NAVY),
        ('TOPPADDING',    (0, 0), (-1, -1), 14),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 14),
        ('LEFTPADDING',   (0, 0), (0, -1),  14),
        ('RIGHTPADDING',  (-1, 0), (-1, -1), 14),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(header)

    # ══════════════════════════════════════════════════
    # BLOCK 2 — APPROVAL BAND + 3 KEY METRICS
    # ══════════════════════════════════════════════════
    def metric_cell(value, label, col_w):
        return Table([
            [Paragraph(value, ps(f'mv_{label}', fontSize=14,
                                 fontName='Helvetica-Bold',
                                 textColor=WHITE, alignment=TA_CENTER))],
            [Paragraph(label,  ps(f'ml_{label}', fontSize=6.5,
                                  fontName='Helvetica',
                                  textColor=colors.HexColor('#a0ffa0'),
                                  alignment=TA_CENTER))],
        ], colWidths=[col_w])

    mc = W * 0.21
    metrics = Table([[
        Table([
            [Paragraph(
                "LOAN APPROVED" if loan_status == 'APPROVED' else "UNDER REVIEW",
                S['approve']
            )],
            [Paragraph(
                f"Personal Loan  •  {today.strftime('%d %b %Y')}  •  Digital Approval",
                S['stamp_sub']
            )],
        ], colWidths=[W * 0.34]),
        Table([[
            metric_cell(fmt_inr(loan_amount), "SANCTIONED AMOUNT", mc),
            metric_cell(fmt_inr(emi) + "/mo",  "MONTHLY EMI",       mc),
            metric_cell(f"{tenure} Months",    "LOAN TENURE",       mc),
        ]], colWidths=[mc, mc, mc]),
    ]], colWidths=[W * 0.35, W * 0.65])
    metrics.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), status_color),
        ('TOPPADDING',    (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING',   (0, 0), (0, -1),  14),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('LINEAFTER',     (0, 0), (0, -1),  1, colors.HexColor('#1a8a3a')),
    ]))
    story.append(metrics)
    story.append(Spacer(1, 5))

    # ══════════════════════════════════════════════════
    # BLOCK 3 — SALUTATION
    # ══════════════════════════════════════════════════
    story.append(Paragraph(
        f"Dear <b>{name}</b>,  We are pleased to inform you that your personal loan application "
        f"submitted via QuickLoan NBFC's AI-powered digital lending portal has been "
        f"<b>{loan_status}</b> in accordance with RBI Digital Lending Guidelines 2023-24. "
        f"Loan details are as follows:",
        S['body']
    ))
    story.append(Spacer(1, 6))

    # ══════════════════════════════════════════════════
    # BLOCK 4 — TWO COLUMN TABLES
    # ══════════════════════════════════════════════════
    def sec_hdr(txt, color=NAVY):
        return Paragraph(txt, ps('sh_' + txt[:4],
                                 fontSize=7.5, fontName='Helvetica-Bold',
                                 textColor=WHITE))

    LW = W * 0.49

    loan_rows = [
        [sec_hdr("LOAN FINANCIAL DETAILS"), ""],
        ["Principal Amount",      fmt_inr(loan_amount)],
        ["Rate of Interest",      "10.50% p.a. (Reducing)"],
        ["Loan Tenure",           f"{tenure} Months"],
        ["Monthly EMI",           fmt_inr(emi)],
        ["Total Amount Payable",  fmt_inr(total_pay)],
        ["Total Interest",        fmt_inr(total_int)],
        ["Processing Fee",        "Rs. 999 (incl. GST)"],
        ["Disbursement Date",     today.strftime('%d %b %Y')],
        ["Loan Maturity",         maturity.strftime('%d %b %Y')],
        ["Repayment Mode",        "ECS / NACH / UPI"],
    ]
    loan_table = Table(loan_rows, colWidths=[LW * 0.56, LW * 0.44])
    loan_table.setStyle(TableStyle([
        ('BACKGROUND',     (0, 0), (-1, 0),  NAVY),
        ('SPAN',           (0, 0), (-1, 0)),
        ('TOPPADDING',     (0, 0), (-1, 0),  6),
        ('BOTTOMPADDING',  (0, 0), (-1, 0),  6),
        ('LEFTPADDING',    (0, 0), (-1, 0),  8),
        ('FONTNAME',       (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE',       (0, 1), (-1, -1), 7.5),
        ('TEXTCOLOR',      (0, 1), (-1, -1), NAVY),
        ('TOPPADDING',     (0, 1), (-1, -1), 4),
        ('BOTTOMPADDING',  (0, 1), (-1, -1), 4),
        ('LEFTPADDING',    (0, 1), (-1, -1), 8),
        ('RIGHTPADDING',   (0, 1), (-1, -1), 6),
        ('FONTNAME',       (0, 1), (0, -1),  'Helvetica-Bold'),
        ('ALIGNMENT',      (1, 1), (1, -1),  'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, GRAY_BG]),
        ('BACKGROUND',     (0, 4), (-1, 4),  colors.HexColor('#f0fdf4')),
        ('TEXTCOLOR',      (1, 4), (1, 4),   SUCCESS),
        ('FONTNAME',       (1, 4), (1, 4),   'Helvetica-Bold'),
        ('GRID',           (0, 1), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BOX',            (0, 0), (-1, -1), 1, NAVY),
    ]))

    borrower_rows = [
        [sec_hdr("BORROWER & KYC DETAILS", PURPLE), ""],
        ["Full Name",            name],
        ["Aadhaar Number",       mask_aadhaar(aadhaar)],
        ["PAN Number",           mask_pan(pan)],
        ["Monthly Income",       fmt_inr(income)],
        ["Employment",           "Salaried / Self-Employed"],
        ["KYC Status",           f"{kyc_status} (Verified)"],
        ["CIBIL Score",          f"{cibil} — {score_band.title()}"],
        ["EMI / Income Ratio",   f"{emi_ratio:.1f}% (RBI limit: 50%)"],
        ["Loan-to-Income",       f"{loan_to_income:.1f}x annual income"],
        ["Income After EMI",     f"{fmt_inr(remaining_income)}/month"],
        ["NPA Risk Assessment",  npa_risk],
        ["Affordability",        affordability],
        ["Loan Status",          loan_status],
    ]
    borrower_idx = {row[0]: index for index, row in enumerate(borrower_rows) if index > 0}
    borrower_table = Table(borrower_rows, colWidths=[LW * 0.52, LW * 0.48])
    borrower_table.setStyle(TableStyle([
        ('BACKGROUND',     (0, 0), (-1, 0),   PURPLE),
        ('SPAN',           (0, 0), (-1, 0)),
        ('TOPPADDING',     (0, 0), (-1, 0),   6),
        ('BOTTOMPADDING',  (0, 0), (-1, 0),   6),
        ('LEFTPADDING',    (0, 0), (-1, 0),   8),
        ('FONTNAME',       (0, 1), (-1, -1),  'Helvetica'),
        ('FONTSIZE',       (0, 1), (-1, -1),  7.5),
        ('TEXTCOLOR',      (0, 1), (-1, -1),  NAVY),
        ('TOPPADDING',     (0, 1), (-1, -1),  4),
        ('BOTTOMPADDING',  (0, 1), (-1, -1),  4),
        ('LEFTPADDING',    (0, 1), (-1, -1),  8),
        ('RIGHTPADDING',   (0, 1), (-1, -1),  6),
        ('FONTNAME',       (0, 1), (0, -1),   'Helvetica-Bold'),
        ('ALIGNMENT',      (1, 1), (1, -1),   'RIGHT'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1),  [WHITE, GRAY_BG]),
        ('TEXTCOLOR',      (1, borrower_idx["KYC Status"]), (1, borrower_idx["KYC Status"]), SUCCESS),
        ('FONTNAME',       (1, borrower_idx["KYC Status"]), (1, borrower_idx["KYC Status"]), 'Helvetica-Bold'),
        ('TEXTCOLOR',      (1, borrower_idx["CIBIL Score"]), (1, borrower_idx["CIBIL Score"]), SUCCESS if cibil >= 700 else AMBER),
        ('FONTNAME',       (1, borrower_idx["CIBIL Score"]), (1, borrower_idx["CIBIL Score"]), 'Helvetica-Bold'),
        ('TEXTCOLOR',      (1, borrower_idx["NPA Risk Assessment"]), (1, borrower_idx["NPA Risk Assessment"]), npa_color),
        ('FONTNAME',       (1, borrower_idx["NPA Risk Assessment"]), (1, borrower_idx["NPA Risk Assessment"]), 'Helvetica-Bold'),
        ('TEXTCOLOR',      (1, borrower_idx["Affordability"]), (1, borrower_idx["Affordability"]), SUCCESS if emi_ratio <= 40 else AMBER if emi_ratio <= 50 else RISK_RED),
        ('FONTNAME',       (1, borrower_idx["Affordability"]), (1, borrower_idx["Affordability"]), 'Helvetica-Bold'),
        ('TEXTCOLOR',      (1, borrower_idx["Loan Status"]), (1, borrower_idx["Loan Status"]), status_color),
        ('FONTNAME',       (1, borrower_idx["Loan Status"]), (1, borrower_idx["Loan Status"]), 'Helvetica-Bold'),
        ('GRID',           (0, 1), (-1, -1),  0.5, colors.HexColor('#e2e8f0')),
        ('BOX',            (0, 0), (-1, -1),  1, PURPLE),
    ]))

    two_col = Table(
        [[loan_table, Spacer(W * 0.02, 1), borrower_table]],
        colWidths=[LW, W * 0.02, LW]
    )
    two_col.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING',    (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('LEFTPADDING',   (0, 0), (-1, -1), 0),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 0),
    ]))
    story.append(two_col)
    story.append(Spacer(1, 6))

    # ══════════════════════════════════════════════════
    # BLOCK 5 — CREDIT ANALYSIS SUMMARY
    # ══════════════════════════════════════════════════
    story.append(Paragraph("CREDIT ANALYSIS SUMMARY", S['sec']))
    story.append(Paragraph(
        "This loan was evaluated using an AI-powered credit scoring model aligned with RBI "
        "Digital Lending Guidelines 2023-24. The model analyzed payment capacity (30% net "
        "income rule), credit utilization proxy (loan-to-income ratio), and EMI affordability. "
        f"The final CIBIL-equivalent score of {cibil} places this applicant in the "
        f"{score_band} category.",
        S['body']
    ))
    story.append(Spacer(1, 4))

    def analysis_cell(label, value, width):
        cell = Table([
            [Paragraph(label, ps(f"label_{label[:4]}", fontSize=6.8, fontName='Helvetica-Bold', textColor=PURPLE, leading=9))],
            [Paragraph(value, ps(f"value_{label[:4]}", fontSize=8.2, fontName='Helvetica-Bold', textColor=NAVY, leading=11))],
        ], colWidths=[width])
        cell.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), WHITE),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#d6d9ef')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ]))
        return cell

    emi_burden_label = "Safe Zone" if emi_ratio <= 40 else "Elevated" if emi_ratio <= 50 else "High Risk"
    cell_width = (W - 8) / 2
    analysis_grid = Table([
        [
            analysis_cell("Score Band", score_band, cell_width),
            analysis_cell("Key Factor", top_reason, cell_width),
        ],
        [
            analysis_cell("EMI Burden", f"{emi_ratio:.1f}% — {emi_burden_label}", cell_width),
            analysis_cell("Loan Validity", "30 days from sanction date", cell_width),
        ],
    ], colWidths=[cell_width, cell_width], rowHeights=[None, None])
    analysis_grid.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(analysis_grid)
    story.append(Spacer(1, 4))

    # ══════════════════════════════════════════════════
    # BLOCK 6 — CIBIL SCORE BAR
    # ══════════════════════════════════════════════════
    score_ranges = [
        ("300-549", "VERY POOR", colors.HexColor('#ef4444')),
        ("550-649", "POOR",      colors.HexColor('#f59e0b')),
        ("650-699", "FAIR",      colors.HexColor('#facc15')),
        ("700-749", "GOOD",      colors.HexColor('#84cc16')),
        ("750-900", "EXCELLENT", colors.HexColor('#22c55e')),
    ]

    def in_range(label):
        return (
            (label == "VERY POOR" and cibil < 550) or
            (label == "POOR"      and 550 <= cibil <= 649) or
            (label == "FAIR"      and 650 <= cibil <= 699) or
            (label == "GOOD"      and 700 <= cibil <= 749) or
            (label == "EXCELLENT" and cibil >= 750)
        )

    score_cells = []
    bg_colors = []
    for rng, label, color in score_ranges:
        active = in_range(label)
        txt = f"<b>{rng}</b><br/>{label}" + (" ◀ YOURS" if active else "")
        score_cells.append(Paragraph(txt, ps(
            f'sc_{label}', fontSize=7, fontName='Helvetica',
            textColor=WHITE if active else color,
            alignment=TA_CENTER, leading=10
        )))
        bg_colors.append(color if active else colors.HexColor('#f0f0f0'))

    score_col_width = W * 0.16
    score_table = Table(
        [[Paragraph(
            f"<b>CIBIL Score: {cibil}</b>",
            ps('csl', fontSize=8, fontName='Helvetica-Bold', textColor=NAVY)
        )] + score_cells],
        colWidths=[W * 0.2] + [score_col_width] * len(score_ranges)
    )
    score_styles = [
        ('TOPPADDING',    (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('VALIGN',        (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX',           (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('GRID',          (1, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
    ]
    for index, bg_color in enumerate(bg_colors, start=1):
        score_styles.append(('BACKGROUND', (index, 0), (index, 0), bg_color))
    score_table.setStyle(TableStyle(score_styles))
    story.append(score_table)
    story.append(Spacer(1, 6))

    # ══════════════════════════════════════════════════
    # BLOCK 6 — TERMS (2 columns)
    # ══════════════════════════════════════════════════
    story.append(Paragraph("TERMS & CONDITIONS", S['sec']))
    terms = [
        "Sanction valid for 30 days from date of issue.",
        f"EMI of {fmt_inr(emi)} due on 5th of every month via auto-debit.",
        "Disbursement subject to executed Loan Agreement and NACH mandate.",
        "Pre-closure permitted after 6 EMIs with zero foreclosure charges.",
        "Late payment attracts 2% penal interest per month on overdue amount.",
        "Disbursement directly to KYC-linked bank account within 2 working days.",
    ]

    def terms_col(items):
        t = Table([[Paragraph(f"  {i}. {t}", S['bodysm'])] for i, t in items],
                  colWidths=[W * 0.49])
        t.setStyle(TableStyle([
            ('TOPPADDING',    (0, 0), (-1, -1), 2),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ]))
        return t

    terms_2col = Table(
        [[terms_col(list(enumerate(terms[:3], 1))),
          terms_col(list(enumerate(terms[3:], 4)))]],
        colWidths=[W * 0.49, W * 0.51]
    )
    terms_2col.setStyle(TableStyle([
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('BOX',           (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('BACKGROUND',    (0, 0), (-1, -1), GRAY_BG),
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING',   (0, 0), (-1, -1), 4),
    ]))
    story.append(terms_2col)
    story.append(Spacer(1, 6))

    # ══════════════════════════════════════════════════
    # BLOCK 7 — SIGNATURES
    # ══════════════════════════════════════════════════
    sig_s  = ps('sig',  fontSize=7.5, fontName='Helvetica',
                textColor=NAVY, alignment=TA_CENTER, leading=11)
    sig_b  = ps('sigb', fontSize=7.5, fontName='Helvetica-Bold',
                textColor=NAVY, alignment=TA_CENTER, leading=11)

    def sig_cell(line1, line2, line3, col_w, signature_flowable=None):
        rows = []
        if signature_flowable is not None:
            rows.append([signature_flowable])
            rows.append([Spacer(1, 2)])
        else:
            rows.append([Paragraph("_" * 28, sig_s)])

        rows.extend([
            [Paragraph(line1, sig_b)],
            [Paragraph(line2, sig_s)],
            [Paragraph(line3, sig_s)],
        ])
        return Table(rows, colWidths=[col_w])

    borrower_signature = build_signature_image(signature_image, W * 0.24, 18 * mm)

    sig_table = Table([[
        sig_cell("Borrower Signature", name,
                 f"Date: {today.strftime('%d/%m/%Y')}", W * 0.33, borrower_signature),
        sig_cell("Branch Manager", "QuickLoan NBFC",
                 "(Authorized Signatory)", W * 0.33),
        sig_cell("Chief Credit Officer", "QuickLoan NBFC",
                 "(Final Approval)", W * 0.34),
    ]], colWidths=[W * 0.33, W * 0.33, W * 0.34])
    sig_table.setStyle(TableStyle([
        ('TOPPADDING',    (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('ALIGN',         (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN',        (0, 0), (-1, -1), 'TOP'),
        ('BOX',           (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('LINEAFTER',     (0, 0), (1, -1),  0.5, colors.HexColor('#e2e8f0')),
        ('BACKGROUND',    (0, 0), (-1, -1), WHITE),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 5))

    # ══════════════════════════════════════════════════
    # BLOCK 8 — FOOTER BAND
    # ══════════════════════════════════════════════════
    footer = Table([[Paragraph(
        "QuickLoan NBFC  |  14th Floor, One BKC, Bandra Kurla Complex, Mumbai 400051  |  "
        "support@quickloan.in  |  1800-103-9876  |  "
        f"Generated by LoanBot AI  •  {today.strftime('%d-%b-%Y')}  •  "
        "Zero human intervention  •  Page 1 of 1",
        ps('fall', fontSize=6.5, fontName='Helvetica',
           textColor=WHITE, alignment=TA_CENTER, leading=10)
    )]], colWidths=[W])
    footer.setStyle(TableStyle([
        ('BACKGROUND',    (0, 0), (-1, -1), NAVY),
        ('TOPPADDING',    (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING',   (0, 0), (-1, -1), 10),
        ('RIGHTPADDING',  (0, 0), (-1, -1), 10),
    ]))
    story.append(footer)

    doc.build(story)
    return path
