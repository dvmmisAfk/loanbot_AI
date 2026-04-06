import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

from state import get_initial_state
from pipeline import pipeline

TEST_AADHAAR_IMAGE = os.getenv("TEST_AADHAAR_IMAGE")
TEST_LIVE_VIDEO = os.getenv("TEST_LIVE_VIDEO")


def maybe_run_video_kyc(state):
    if state.get("current_step") != "video_kyc":
        return state, False

    if not TEST_AADHAAR_IMAGE or not TEST_LIVE_VIDEO:
        print("Video eKYC handoff reached.")
        print("Set TEST_AADHAAR_IMAGE and TEST_LIVE_VIDEO to exercise the full post-KYC flow.")
        print()
        return state, False

    if not os.path.exists(TEST_AADHAAR_IMAGE) or not os.path.exists(TEST_LIVE_VIDEO):
        print("Video eKYC test assets not found.")
        print(f"TEST_AADHAAR_IMAGE={TEST_AADHAAR_IMAGE}")
        print(f"TEST_LIVE_VIDEO={TEST_LIVE_VIDEO}")
        print()
        return state, False

    with open(TEST_AADHAAR_IMAGE, "rb") as aadhaar_file:
        state["aadhaar_image"] = aadhaar_file.read()
    with open(TEST_LIVE_VIDEO, "rb") as live_video_file:
        state["video_frames"] = live_video_file.read()

    state["user_name"] = state.get("name")
    state["current_step"] = "video_kyc"
    state = pipeline.invoke(state)

    print(f"Step: {state['current_step']}")
    print(f"Video KYC Status: {state.get('video_kyc_status', 'not set')}")
    print(f"Bot: {state['messages'][-1]['content'][:100]}...")
    print()

    return state, True


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

    state, attempted_video_kyc = maybe_run_video_kyc(state)

    print(f"CIBIL Score: {state.get('cibil_score', 'not set')}")
    print(f"Loan Status: {state.get('loan_status', 'not set')}")
    print()

    print("=" * 50)

    if attempted_video_kyc:
        if state.get("loan_status") in ["APPROVED", "REVIEW"]:
            print("✅ Full pipeline working correctly!")
        else:
            print("❌ Video eKYC did not advance into credit/sanction. Check outputs above.")
    elif state.get("current_step") == "video_kyc":
        print("✅ Core conversation flow working correctly through video eKYC handoff!")
    else:
        print("❌ Something went wrong — check agent outputs above")


if __name__ == "__main__":
    simulate_conversation()
