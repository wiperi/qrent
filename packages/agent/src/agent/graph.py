"""LangGraph single-node graph template.

Returns a predefined response. Replace logic and configuration as needed.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict

from langgraph.graph import StateGraph
from langgraph.runtime import Runtime
from typing_extensions import TypedDict

import json
import asyncio
from typing import Annotated, Sequence, TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import (
    BaseMessage, HumanMessage, SystemMessage, ToolMessage, AIMessage
)
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from config.config import ALL_TOOLS, TOOLS_BY_NAME


class Context(TypedDict):
    """Context parameters for the agent.

    Set these when creating assistants OR when invoking the graph.
    See: https://langchain-ai.github.io/langgraph/cloud/how-tos/configuration_cloud/
    """

    my_configurable_param: str


@dataclass
class State:
    """Input state for the agent.

    Defines the initial structure of incoming data.
    See: https://langchain-ai.github.io/langgraph/concepts/low_level/#state
    """

    messages: Annotated[Sequence[BaseMessage], add_messages]


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2).with_config({"async": True})
TOOLS = ALL_TOOLS
TOOLS_BY_NAME = TOOLS_BY_NAME
CONSULTANT_PROMPT = CONSULTANT_PROMPT = """
你是专业的租房咨询顾问。你的任务是根据用户的需求，查询知识库并给出专业建议，或为用户生成正式的租房申请信（cover letter）。

---
你可以使用以下两个工具：
1. `search_qrent_knowledge`：查询与用户需求相关的最新房源政策、市场信息、法律法规等。
2. `generate_rental_cover_letter`：用于根据用户信息生成中英双语的租房申请信。此工具需要一套完整且精确的个人信息参数，包括：【申请人姓名、出生日期、联系方式、身份类型（学生/工作）、目标房产地址、期望语言、财务/收入来源、可提供的财务证明、个人品质（如爱干净、安静、无宠物）、生活习惯、居住历史、房东信息、推荐人信息、入住时间与租期、城市、州/省、邮政编码等】才能调用。

---
严格使用规则：

1. **信息咨询模式**：
   - 如果用户问的是租房政策、市场信息、法规、合同条款等问题，你**必须**先调用 `search_qrent_knowledge`，并根据工具返回的内容作答。

2. **申请信模式 - 关键步骤**：
   a. **识别需求**：如果用户要求“帮我写/生成/优化租房申请信/cover letter”等，你将进入申请信模式。
   
   b. **信息校验与索要（高优先级）**：
      - **你绝不能在信息不全的情况下调用 `generate_rental_cover_letter`。**
      - 你必须仔细评估对话历史，确认是否已获得以下所有**八大类**关键信息：
         1. **基础信息**：姓名、出生日期、联系方式（电话和邮箱）。
         2. **身份核心**：身份类型（学生/工作人员）、若为学生，需提供学校和专业。
         3. **财务核心**：主要收入/资助来源、月度金额、可提供的财务证明文件列表。
         4. **房产目标**：目标房产的**具体地址**、**房东/中介姓名**、**房东联系地址**（城市、州/省、邮编）。
         5. **租约期望**：期望的**入住日期**、**租期**（如12个月）、方便**看房的时间段**。
         6. **个人描述**：爱干净、不吸烟、不办Party等**个人品质**、**生活习惯**描述。
         7. **居住历史**：过去两年的居住历史。
         8. **担保与推荐**：是否需要父母担保人、前房东/学术导师的**推荐人信息**（姓名、联系方式、类别）。
         
      - **如果信息不全**：你必须礼貌地、清晰地、分点列出**缺失的关键信息**，并请用户提供。
      
      > **示例索要话术：** “没问题！为了确保信件专业并符合澳洲/海外房东要求，请您补充以下缺失的关键信息：1. **身份和学校信息**（如：留学生，UNSW），2. **财务支持细节**（如：父母资助，可提供银行证明），3. **目标房产信息**（如：Hurstville 31 Treacy St，以及房东姓名/中介地址），4. **期望的入住日期和租期**。”
      
   c. **如果信息齐全**：将所有完整、精确的用户信息作为参数，调用 `generate_rental_cover_letter`。

   d. **生成并结束**：工具调用成功后，直接向用户展示生成的信件内容，并结束回答。

3. **异常处理与拒绝**：
   - 如果知识库或工具没有相关信息，向用户说明“目前无法回答”，并结束回答。
   - 如果用户提出与租房无关的问题，说明你只负责租房相关问题，无法回答，并结束回答。
"""
tool_bound_llm = llm.bind_tools(TOOLS)


async def agent_node(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    """LLM 节点：根据对话 + system prompt 生成回复（可能带 tool_calls）。"""
    sys = SystemMessage(content=CONSULTANT_PROMPT)
    resp = await tool_bound_llm.ainvoke([sys] + list(state.messages))
    return {"messages": [resp]}

async def tool_node(state: State, runtime: Runtime[Context]) -> Dict[str, Any]:
    """工具节点：执行 search_qrent_knowledge，并返回 ToolMessage。"""
    last_msg = state.messages[-1]
    outputs: list[ToolMessage] = []

    # 安全地获取 tool_calls
    tool_calls = getattr(last_msg, "tool_calls", []) or []

    for call in tool_calls:
        tool_name = call["name"]
        args = call["args"]
        tool = TOOLS_BY_NAME[tool_name]

        try:
            #print(f"[Consultant] 正在调用工具: {tool_name}，参数: {args}")
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
    """判断 agent 节点之后是否要进入 tool 节点。"""
    last = state.messages[-1]
    tool_calls = getattr(last, "tool_calls", None)
    return bool(tool_calls)


# Define the graph
graph = (
    StateGraph(State, context_schema=Context)
    .add_node("agent", agent_node)
    .add_node("tool", tool_node)
    .set_entry_point("agent")
    .add_conditional_edges(
        "agent",
        should_continue,
        {
            True: "tool",
            False: END,
        },
    )
    .add_edge("tool", "agent")
    .compile(name="Qrent AI Agent")
)
