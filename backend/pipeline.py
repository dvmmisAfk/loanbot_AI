from langgraph.graph import StateGraph, END
from state import LoanState
from agents import sales_agent, kyc_agent, credit_agent, sanction_agent
from video_kyc_agent import video_kyc_agent


def after_kyc_router(state: LoanState) -> str:
    """After KYC runs: route into video eKYC once assets are ready."""
    if state.get("current_step") == "video_kyc":
        return "video_kyc_agent"
    if state.get("current_step") == "credit":
        return "credit_agent"
    return END


def after_video_kyc_router(state: LoanState) -> str:
    """Only verified video KYC applications can proceed to credit."""
    if state.get("current_step") == "credit":
        return "credit_agent"
    return END


def after_credit_router(state: LoanState) -> str:
    """After credit runs: always chain straight to sanction."""
    return "sanction_agent"


def entry_router(state: LoanState) -> str:
    step = state.get("current_step", "greeting")

    if step in ["greeting", "sales"]:
        return "sales_agent"
    elif step == "kyc":
        return "kyc_agent"
    elif step == "video_kyc":
        return "video_kyc_agent"
    elif step == "credit":
        return "credit_agent"
    elif step == "sanction":
        return "sanction_agent"
    else:
        return END


def build_pipeline():
    graph = StateGraph(LoanState)

    graph.add_node("sales_agent", sales_agent)
    graph.add_node("kyc_agent", kyc_agent)
    graph.add_node("video_kyc_agent", video_kyc_agent)
    graph.add_node("credit_agent", credit_agent)
    graph.add_node("sanction_agent", sanction_agent)

    graph.set_conditional_entry_point(
        entry_router,
        {
            "sales_agent": "sales_agent",
            "kyc_agent": "kyc_agent",
            "video_kyc_agent": "video_kyc_agent",
            "credit_agent": "credit_agent",
            "sanction_agent": "sanction_agent",
            END: END
        }
    )

    # Sales waits for next user message
    graph.add_edge("sales_agent", END)

    # KYC: if verified → chain to credit automatically, else wait
    graph.add_conditional_edges("kyc_agent", after_kyc_router, {
        "video_kyc_agent": "video_kyc_agent",
        "credit_agent": "credit_agent",
        END: END
    })

    graph.add_conditional_edges("video_kyc_agent", after_video_kyc_router, {
        "credit_agent": "credit_agent",
        END: END
    })

    # Credit always chains straight to sanction (no user input needed)
    graph.add_conditional_edges("credit_agent", after_credit_router, {
        "sanction_agent": "sanction_agent"
    })

    graph.add_edge("sanction_agent", END)

    return graph.compile()


pipeline = build_pipeline()
