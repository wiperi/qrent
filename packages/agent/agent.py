import json
from typing import Annotated, Sequence, TypedDict

from langgraph.graph.message import add_messages
from langchain_core.messages import (
    BaseMessage, HumanMessage, SystemMessage, ToolMessage, AIMessage
)
from langchain_core.runnables import RunnableConfig
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END

from rag_tool import search_qrent_knowledge
from frontParse import parse_user_survey

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]


def create_streaming_agent(model, tools, system_prompt: str, task_name: str):

    tools_by_name = {t.name: t for t in tools}

    def tool_node(state: AgentState):
        last_msg = state["messages"][-1]
        outputs = []

        for call in last_msg.tool_calls:
            tool = tools_by_name[call["name"]]
            args = call["args"]

            try:
                result = tool.invoke(args)
            except Exception as e:
                result = f"Tool Error: {e}"

            print(f"[{task_name}][TOOL RESULT] {call['name']}: {result}")

            outputs.append(
                ToolMessage(
                    content=str(result),
                    name=call["name"],
                    tool_call_id=call["id"],
                )
            )

        return {"messages": outputs}

    def call_model(state: AgentState, config: RunnableConfig):
        sys = SystemMessage(content=system_prompt)
        resp = model.invoke([sys] + state["messages"])

        print(f"[{task_name}][AGENT] {resp.content}")

        return {"messages": [resp]}

    def should_continue(state: AgentState):
        last = state["messages"][-1]
        tool_calls = getattr(last, "tool_calls", None)
        if tool_calls:
            return "continue"
        return "end"

    graph = StateGraph(AgentState)
    graph.add_node("agent", call_model)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("agent")

    graph.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "tools",
            "end": END
        }
    )

    graph.add_edge("tools", "agent")

    return graph.compile()


llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
TOOLS = [search_qrent_knowledge]

compliance_agent = create_streaming_agent(
    llm, TOOLS,
    system_prompt="你是合规审查专家，必须识别租房需求中的不合理项，并使用知识库工具验证。",
    task_name="task1_compliance"
)

inquiry_agent = create_streaming_agent(
    llm, TOOLS,
    system_prompt="你是租房需求优化顾问，需要基于事实提供可执行建议。",
    task_name="task2_inquiry"
)

reporting_agent = create_streaming_agent(
    llm, TOOLS,
    system_prompt="你是报告专家，必须生成结构化 Markdown 租房分析报告。",
    task_name="task3_reporting"
)


def run_qrent_flow(req: str):

    print("\n===== Task 1: 合规审查 =====")
    for _ in compliance_agent.stream(
        {"messages": [HumanMessage(content=req)]},
        stream_mode="values"
    ):
        pass

    r1 = compliance_agent.invoke(
        {"messages": [HumanMessage(content=req)]}
    )["messages"][-1].content

    print("\n===== Task 2: 优化建议 =====")
    t2_input = f"原始需求：{req}\n合规意见：{r1}\n请生成优化建议。"

    for _ in inquiry_agent.stream(
        {"messages": [HumanMessage(content=t2_input)]},
        stream_mode="values"
    ):
        pass

    r2 = inquiry_agent.invoke(
        {"messages": [HumanMessage(content=t2_input)]}
    )["messages"][-1].content

    print("\n===== Task 3: 最终报告 =====")
    t3_input = f"原始需求：{req}\n优化建议：{r2}\n请生成最终报告。"

    for _ in reporting_agent.stream(
        {"messages": [HumanMessage(content=t3_input)]},
        stream_mode="values"
    ):
        pass

    # r3 = reporting_agent.invoke(
    #     {"messages": [HumanMessage(content=t3_input)]}
    # )["messages"][-1].content
    # print(r3)


if __name__ == "__main__":
    with open("user_test.json", "r", encoding="utf-8") as f:
        user_json_data = json.load(f)
    req = parse_user_survey(user_json_data)
    run_qrent_flow(req)
