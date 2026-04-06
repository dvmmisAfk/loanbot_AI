import sys
sys.stdout.reconfigure(encoding='utf-8')

from state import get_initial_state
from pipeline import pipeline


def simulate_conversation():
    print("🤖 Testing full loan conversation pipeline...")
    print("=" * 50)

    state = get_initial_state()

    # Turn 1 — user asks for loan
    state["messages"].append({
        "role": "user",
        "content": "Mujhe 3 lakh ka loan chahiye"
    })
    state = pipeline.invoke(state)
    print(f"Step: {state['current_step']}")
    print(f"Bot: {state['messages'][-1]['content'][:100]}...")
    print()

    # Turn 2 — user gives tenure
    state["messages"].append({
        "role": "user",
        "content": "24 mahine"
    })
    state = pipeline.invoke(state)
    print(f"Step: {state['current_step']}")
    print(f"Bot: {state['messages'][-1]['content'][:100]}...")
    print()

    # Turn 3 — user gives income
    state["messages"].append({
        "role": "user",
        "content": "Meri salary 40000 hai"
    })
    state = pipeline.invoke(state)
    print(f"Step: {state['current_step']}")
    loan_amount = state.get('loan_amount', 'not set')
    emi = state.get('emi', 'not set')
    print(f"Loan Amount: ₹{loan_amount:,}" if isinstance(loan_amount, int) else f"Loan Amount: {loan_amount}")
    print(f"EMI: ₹{emi}" if isinstance(emi, int) else f"EMI: {emi}")
    print(f"Bot: {state['messages'][-1]['content'][:100]}...")
    print()

    # Turn 4 — KYC name
    state["messages"].append({
        "role": "user",
        "content": "Divyam Sharma"
    })
    state = pipeline.invoke(state)
    print(f"Step: {state['current_step']}")
    print(f"Bot: {state['messages'][-1]['content'][:100]}...")
    print()

    # Turn 5 — KYC Aadhaar
    state["messages"].append({
        "role": "user",
        "content": "1234-5678-9012"
    })
    state = pipeline.invoke(state)
    print(f"Step: {state['current_step']}")
    print(f"Bot: {state['messages'][-1]['content'][:100]}...")
    print()

    # Turn 6 — KYC PAN
    state["messages"].append({
        "role": "user",
        "content": "ABCDE1234F"
    })
    state = pipeline.invoke(state)
    print(f"Step: {state['current_step']}")
    print(f"KYC Status: {state.get('kyc_status', 'not set')}")
    print(f"Bot: {state['messages'][-1]['content'][:100]}...")
    print()

    print(f"CIBIL Score: {state.get('cibil_score', 'not set')}")
    print(f"Loan Status: {state.get('loan_status', 'not set')}")
    print()

    print("=" * 50)

    if state.get("loan_status") in ["APPROVED", "REVIEW"]:
        print("✅ Pipeline working correctly!")
    else:
        print("❌ Something went wrong — check agent outputs above")


if __name__ == "__main__":
    simulate_conversation()
