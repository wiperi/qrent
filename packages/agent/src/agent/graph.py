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

import os

# ===== Resources (init once) =====
prompts = PromptRegistry()
CONSULTANT_SYSTEM = SystemMessage(content=prompts.get_system_prompt("consultant"))
COVER_LETTER_SYSTEM = SystemMessage(content=prompts.get_agent_prompt("cover_letter"))  

llm = ChatOpenAI(
    model="deepseek-chat",         
    temperature=0.2,
    api_key=os.getenv("OPENAI_API_KEY"),
    base_url=os.getenv("OPENAI_BASE_URL", "https://api.deepseek.com"),
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

# ===== Nodes =====
async def agent_node(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    resp = await tool_bound_llm.ainvoke([CONSULTANT_SYSTEM] + list(state.messages))
    return {"messages": [resp]}

async def tool_node(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    last_msg = state.messages[-1]
    outputs: list[ToolMessage] = []

    tool_calls = getattr(last_msg, "tool_calls", []) or []
    for call in tool_calls:
        tool_name = call["name"]
        args = call["args"]
        if tool_name == "generate_rental_cover_letter":
            ok, msg, args = validate_cover_letter_args(args)
            if not ok:
                outputs.append(
                    ToolMessage(
                        content=msg,
                        tool_call_id=call.get("id"),
                        name=tool_name,
                    )
                )
                continue 
        tool = TOOLS_BY_NAME[tool_name]

        try:
            result = await tool.ainvoke(args)
        except Exception as e:
            result = f"Tool Error: {e}"

        outputs.append(
            ToolMessage(
                content=str(result),
                tool_call_id=call.get("id"),
                name=tool_name,
            )
        )

    return {"messages": outputs}

def should_continue(state: State) -> bool:
    last = state.messages[-1]
    tool_calls = getattr(last, "tool_calls", None)
    if not tool_calls:
        return False

    tool_msg_count = sum(1 for m in state.messages if isinstance(m, ToolMessage))
    return tool_msg_count < MAX_LOOPS

# ===== Graph =====
graph = (
    StateGraph(State, context_schema=Context)
    .add_node("agent", agent_node)
    .add_node("tool", tool_node)
    .set_entry_point("agent")
    .add_conditional_edges("agent", should_continue, {True: "tool", False: END})
    .add_edge("tool", "agent")
    .compile(name="Qrent AI Agent")
)
