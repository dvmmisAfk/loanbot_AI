from decimal import Decimal, ROUND_HALF_UP
from typing import Optional

EMI_MONTHLY_RATE = Decimal("10.5") / (Decimal("12") * Decimal("100"))


def _to_decimal(value: Optional[float | int | str | Decimal]) -> Decimal:
    if value is None:
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _quantize(value: Decimal, pattern: str) -> Decimal:
    return value.quantize(Decimal(pattern), rounding=ROUND_HALF_UP)


def format_inr(amount: Optional[float | int | str | Decimal]) -> str:
    value = int(_quantize(_to_decimal(amount), "1"))
    sign = "-" if value < 0 else ""
    digits = str(abs(value))
    if len(digits) <= 3:
        grouped = digits
    else:
        grouped = digits[-3:]
        digits = digits[:-3]
        parts: list[str] = []
        while digits:
            parts.append(digits[-2:])
            digits = digits[:-2]
        grouped = ",".join(reversed(parts)) + f",{grouped}"
    return f"{sign}₹{grouped}"


def calculate_emi(loan_amount: Optional[int], tenure: Optional[int]) -> int:
    principal = _to_decimal(loan_amount)
    months = int(tenure or 0)
    if principal <= 0 or months <= 0:
        return 0

    growth = (Decimal("1") + EMI_MONTHLY_RATE) ** months
    emi = principal * EMI_MONTHLY_RATE * growth / (growth - Decimal("1"))
    return int(_quantize(emi, "1"))


def calculate_emi_ratio(emi: Optional[float | int], income: Optional[float | int]) -> float:
    income_value = _to_decimal(income)
    if income_value <= 0:
        return 100.0
    ratio = (_to_decimal(emi) / income_value) * Decimal("100")
    return float(_quantize(ratio, "0.01"))


def calculate_loan_to_income(loan_amount: Optional[int], income: Optional[int]) -> float:
    annual_income = _to_decimal(income) * Decimal("12")
    if annual_income <= 0:
        return 999.0
    ratio = _to_decimal(loan_amount) / annual_income
    return float(_quantize(ratio, "0.01"))


def get_score_band(cibil_score: Optional[int]) -> str:
    score = int(cibil_score or 0)
    if score >= 750:
        return "EXCELLENT"
    if score >= 700:
        return "GOOD"
    if score >= 650:
        return "FAIR"
    if score >= 550:
        return "POOR"
    return "VERY POOR"


def calculate_npa_risk(cibil_score: Optional[int], emi_ratio: Optional[float]) -> str:
    score = int(cibil_score or 0)
    ratio = float(emi_ratio or 0)
    if score >= 750 and ratio <= 35:
        return "LOW"
    if score >= 650 and ratio <= 45:
        return "MEDIUM"
    return "HIGH"
