import sys

sys.stdout.reconfigure(encoding="utf-8")

from agents import credit_agent
from financials import calculate_emi, calculate_emi_ratio, calculate_loan_to_income, calculate_npa_risk, get_score_band
from state import get_initial_state


PROFILES = [
    {
        "name": "Profile 1 — Ideal borrower",
        "income": 75000,
        "loan": 300000,
        "tenure": 24,
        "expected": {
            "score_min": 800,
            "score_max": 900,
            "status": {"APPROVED"},
            "emi_ratio_min": 18,
            "emi_ratio_max": 19.5,
            "npa_risk": {"LOW"},
        },
    },
    {
        "name": "Profile 2 — Average borrower",
        "income": 40000,
        "loan": 300000,
        "tenure": 24,
        "expected": {
            "score_min": 700,
            "score_max": 750,
            "status": {"APPROVED"},
            "emi_ratio_min": 34,
            "emi_ratio_max": 35.5,
            "npa_risk": {"LOW", "MEDIUM"},
        },
    },
    {
        "name": "Profile 3 — Borderline borrower",
        "income": 30000,
        "loan": 500000,
        "tenure": 36,
        "expected": {
            "score_min": 620,
            "score_max": 660,
            "status": {"REVIEW", "APPROVED"},
            "emi_ratio_min": 50,
            "emi_ratio_max": 60,
            "npa_risk": {"MEDIUM", "HIGH"},
        },
    },
    {
        "name": "Profile 4 — Risky borrower",
        "income": 20000,
        "loan": 400000,
        "tenure": 12,
        "expected": {
            "score_min": 300,
            "score_max": 599,
            "status": {"REVIEW", "DECLINED"},
            "emi_ratio_min": 100,
            "emi_ratio_max": 200,
            "npa_risk": {"HIGH"},
        },
    },
    {
        "name": "Profile 5 — Premium borrower",
        "income": 150000,
        "loan": 1000000,
        "tenure": 36,
        "expected": {
            "score_min": 850,
            "score_max": 900,
            "status": {"APPROVED"},
            "emi_ratio_min": 20,
            "emi_ratio_max": 25,
            "npa_risk": {"LOW"},
        },
    },
]


def build_state(income: int, loan: int, tenure: int):
    state = get_initial_state()
    emi = calculate_emi(loan, tenure)
    emi_ratio = calculate_emi_ratio(emi, income)
    state["income"] = income
    state["loan_amount"] = loan
    state["tenure"] = tenure
    state["emi"] = emi
    state["emi_ratio"] = emi_ratio
    state["loan_to_income"] = calculate_loan_to_income(loan, income)
    state["affordability_warning"] = emi_ratio > 40
    return state


def in_range(value: float, minimum: float, maximum: float) -> bool:
    return minimum <= value <= maximum


def evaluate_profile(profile: dict) -> bool:
    state = build_state(profile["income"], profile["loan"], profile["tenure"])
    result = credit_agent(state)
    npa_risk = calculate_npa_risk(result.get("cibil_score"), result.get("emi_ratio"))
    score_band = get_score_band(result.get("cibil_score"))

    score_ok = in_range(result["cibil_score"], profile["expected"]["score_min"], profile["expected"]["score_max"])
    status_ok = result["loan_status"] in profile["expected"]["status"]
    emi_ratio_ok = in_range(result["emi_ratio"], profile["expected"]["emi_ratio_min"], profile["expected"]["emi_ratio_max"])
    npa_ok = npa_risk in profile["expected"]["npa_risk"]
    passed = score_ok and status_ok and emi_ratio_ok and npa_ok

    print("=" * 72)
    print(profile["name"])
    print(f"Income / Loan / Tenure : ₹{profile['income']:,} / ₹{profile['loan']:,} / {profile['tenure']} months")
    print(f"CIBIL Score + Band     : {result['cibil_score']} ({score_band})")
    print(f"EMI + EMI Ratio        : ₹{result['emi']:,} / {result['emi_ratio']:.2f}%")
    print(f"Loan-to-Income         : {result['loan_to_income']:.2f}x")
    print(f"Loan Status            : {result['loan_status']}")
    print(f"Risk Factors           : {result.get('risk_factors', [])}")
    print(f"NPA Risk Level         : {npa_risk}")
    print(f"Result                 : {'PASS' if passed else 'FAIL'}")
    return passed


def main():
    all_passed = all(evaluate_profile(profile) for profile in PROFILES)
    print("=" * 72)
    print("OVERALL:", "PASS" if all_passed else "FAIL")
    raise SystemExit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
