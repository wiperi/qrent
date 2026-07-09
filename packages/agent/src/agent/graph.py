"""LangGraph single-node graph template."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Annotated, Sequence
from typing_extensions import TypedDict

from langgraph.graph import StateGraph, END
from langgraph.runtime import Runtime
from langgraph.graph.message import add_messages

from langchain_core.messages import BaseMessage, SystemMessage, ToolMessage
from langchain_openai import ChatOpenAI

from src.config.tool_dir import ALL_TOOLS, TOOLS_BY_NAME
from src.config.load_prompts import PromptRegistry
from src.utils.validators.cover_letter import validate_cover_letter_args
from src.utils.validators.parents_letter import validate_parent_letter_args
from src.tools.rag_tool import search_qrent_knowledge


import os

# ===== Resources (init once) =====
prompts = PromptRegistry()
CONSULTANT_SYSTEM = SystemMessage(content=prompts.get_system_prompt("consultant"))
COVER_LETTER_SYSTEM = SystemMessage(content=prompts.get_agent_prompt("cover_letter"))  

llm = ChatOpenAI(
    model="deepseek-chat",         
    temperature=0.2,
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
)
TOOLS = ALL_TOOLS
tool_bound_llm = llm.bind_tools(TOOLS)

MAX_LOOPS = 6

# ===== Context schema (optional) =====
class Context(TypedDict):
    my_configurable_param: str

# ===== State =====
@dataclass
class State:
    messages: Annotated[Sequence[BaseMessage], add_messages]
    retrieved_context: str = ""

# ===== Nodes =====
def to_text(content: Any) -> str:
    """Convert LangChain message content (str or list of blocks) to plain text."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for b in content:
            if isinstance(b, dict):
                # OpenAI-style content blocks: {"type":"text","text":"..."}
                if b.get("type") == "text" and isinstance(b.get("text"), str):
                    parts.append(b["text"])
                # fallback: any string-ish fields
                elif isinstance(b.get("text"), str):
                    parts.append(b["text"])
            elif isinstance(b, str):
                parts.append(b)
        return "\n".join(p.strip() for p in parts if p and p.strip()).strip()
    # fallback
    return str(content).strip()


async def retrieval_node(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    last_content = state.messages[-1].content if state.messages else ""
    user_text = to_text(last_content)

    if not user_text:
        return {}

    try:
        ctx = await search_qrent_knowledge.ainvoke({"query": user_text})
        ctx = str(ctx).strip()
    except Exception as e:
        ctx = f"(Retrieval Error: {type(e).__name__}: {e})"

    if not ctx:
        return {}

    return {
        "messages": [
            SystemMessage(
                content=(
                    "[RAG]\n"
                    "Reference knowledge (use if relevant; do not fabricate beyond this):\n\n"
                    f"{ctx}"
                )
            )
        ]
    }


async def agent_node(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    ctx = (state.retrieved_context or "").strip()

    ctx_msgs = []
    if ctx:
        ctx_msgs = [
            SystemMessage(
                content=(
                    "Reference knowledge (use if relevant). "
                    "Do not fabricate anything not supported by this context.\n\n"
                    f"{ctx}"
                )
            )
        ]

    resp = await tool_bound_llm.ainvoke([CONSULTANT_SYSTEM] + ctx_msgs + list(state.messages))
    return {"messages": [resp]}


async def tool_node(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    last_msg = state.messages[-1]
    outputs: list[ToolMessage] = []

    tool_calls = getattr(last_msg, "tool_calls", []) or []

    for idx, call in enumerate(tool_calls):
        tool_name = call.get("name")
        args = call.get("args") or {}
        tool_call_id = call.get("id")

        # 必须回应每个 tool_call_id：没有 id 也回一条（避免 400）
        if not tool_call_id:
            outputs.append(
                ToolMessage(
                    content=f"Tool Error: Missing tool_call_id for tool '{tool_name}' (index={idx}).",
                    tool_call_id=f"missing_id_{idx}",
                    name=tool_name or "unknown_tool",
                )
            )
            continue

        try:
            # --- validation gates ---
            if tool_name == "generate_rental_cover_letter":
                ok, msg, args = validate_cover_letter_args(args)
                if not ok:
                    outputs.append(ToolMessage(content=msg, tool_call_id=tool_call_id, name=tool_name))
                    continue

            if tool_name == "generate_parent_letter":
                ok, msg, args = validate_parent_letter_args(args)
                if not ok:
                    outputs.append(ToolMessage(content=msg, tool_call_id=tool_call_id, name=tool_name))
                    continue

            # --- safe tool lookup ---
            tool = TOOLS_BY_NAME.get(tool_name)
            if tool is None:
                outputs.append(
                    ToolMessage(
                        content=f"Tool Error: Unknown tool '{tool_name}'. Available: {list(TOOLS_BY_NAME.keys())}",
                        tool_call_id=tool_call_id,
                        name=tool_name or "unknown_tool",
                    )
                )
                continue

            result = await tool.ainvoke(args)

            LETTER_TOOL_NAMES = {
                "generate_rental_cover_letter",
                "generate_parent_letter",
            }

            # ...

            tool_output_text = str(result)

            if tool_name in LETTER_TOOL_NAMES:
                tool_output_text = (
                    "【请将下方信件正文原样完整输出给用户（不要总结、不要改写）】\n\n"
                    + tool_output_text
                )

            outputs.append(
                ToolMessage(
                    content=tool_output_text,
                    tool_call_id=call.get("id"),
                    name=tool_name,
                )
            )
        except Exception as e:
            outputs.append(
                ToolMessage(
                    content=f"Tool Error: {type(e).__name__}: {e}",
                    tool_call_id=tool_call_id,
                    name=tool_name or "unknown_tool",
                )
            )

    return {"messages": outputs}


def should_continue(state: State) -> bool:
    last = state.messages[-1]
    tool_calls = getattr(last, "tool_calls", None)
    return bool(tool_calls)


# ===== Graph =====
graph = (
    StateGraph(State, context_schema=Context)
    .add_node("retrieval", retrieval_node)   
    .add_node("agent", agent_node)
    .add_node("tool", tool_node)
    .set_entry_point("retrieval")            
    .add_edge("retrieval", "agent")         
    .add_conditional_edges("agent", should_continue, {True: "tool", False: END})
    .add_edge("tool", "agent")
    .compile(name="Qrent AI Agent")
)
