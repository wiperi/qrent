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


# -------------------------
# AgentState 定义：保存消息序列
# -------------------------
class AgentState(TypedDict):
    # add_messages 会自动把新消息 append 到 messages 序列
    messages: Annotated[Sequence[BaseMessage], add_messages]


# ================================================================
# create_streaming_agent —— 创建一个可流式输出的 LangGraph 智能体
# model: LLM 实例
# tools: 工具列表
# system_prompt: 角色设定
# task_name: 用于打印日志标记
# ================================================================
def create_streaming_agent(model, tools, system_prompt: str, task_name: str):

    # 方便在工具调用时快速检索
    tools_by_name = {t.name: t for t in tools}

    # -------------------------
    # 工具执行节点（Tool Node）
    # -------------------------
    def tool_node(state: AgentState):
        last_msg = state["messages"][-1]  # 最新一条消息应包含 tool_calls
        outputs = []

        for call in last_msg.tool_calls:
            tool = tools_by_name[call["name"]]  # 获取具体工具对象
            args = call["args"]                # 工具调用参数

            # 执行工具并捕获异常
            try:
                result = tool.invoke(args)
            except Exception as e:
                result = f"Tool Error: {e}"

            print(f"[{task_name}][TOOL RESULT] {call['name']}: {result}")

            # 把工具返回结果包装成 ToolMessage 让 Agent 再读取
            outputs.append(
                ToolMessage(
                    content=str(result),
                    name=call["name"],
                    tool_call_id=call["id"],
                )
            )

        return {"messages": outputs}

    # -------------------------
    # LLM 节点（Agent Node）
    # -------------------------
    def call_model(state: AgentState, config: RunnableConfig):
        # 每个步骤都重新注入系统提示，防止遗忘
        sys = SystemMessage(content=system_prompt)

        # 拼接系统消息 + 对话历史发送给模型
        resp = model.invoke([sys] + state["messages"])

        print(f"[{task_name}][AGENT] {resp.content}")

        return {"messages": [resp]}

    # -------------------------
    # 路由判断：是否继续执行工具
    # -------------------------
    def should_continue(state: AgentState):
        last = state["messages"][-1]

        # 如果模型输出含 tool_calls，则跳转到 tools 节点
        tool_calls = getattr(last, "tool_calls", None)
        if tool_calls:
            return "continue"

        # 否则结束流程
        return "end"

    # -------------------------
    # 构建状态机
    # -------------------------
    graph = StateGraph(AgentState)

    graph.add_node("agent", call_model)
    graph.add_node("tools", tool_node)

    graph.set_entry_point("agent")   # 从 agent 节点启动

    # agent → tools → agent 循环，直到没有工具调用
    graph.add_conditional_edges(
        "agent",
        should_continue,
        {
            "continue": "tools",
            "end": END
        }
    )

    graph.add_edge("tools", "agent")

    return graph.compile()  # 编译为可运行 graph


# ================================================================
# 初始化模型与工具
# ================================================================
llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2)
TOOLS = [search_qrent_knowledge]


# ================================================================
# 定义三个智能体（流水线）
# ================================================================
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


# ================================================================
# 主流程（三步流水线）
# ================================================================
def run_qrent_flow(req: str):

    # ---------------------
    # Task 1：合规审查
    # ---------------------
    print("\n===== Task 1: 合规审查 =====")
    for _ in compliance_agent.stream(
        {"messages": [HumanMessage(content=req)]},
        stream_mode="values"
    ):
        pass  # 流式输出，不做处理

    r1 = compliance_agent.invoke(
        {"messages": [HumanMessage(content=req)]}
    )["messages"][-1].content

    # ---------------------
    # Task 2：给出优化建议
    # ---------------------
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

    # ---------------------
    # Task 3：生成最终报告
    # ---------------------
    print("\n===== Task 3: 最终报告 =====")
    t3_input = f"原始需求：{req}\n优化建议：{r2}\n请生成最终报告。"

    for _ in reporting_agent.stream(
        {"messages": [HumanMessage(content=t3_input)]},
        stream_mode="values"
    ):
        pass

    # 如需打印最终报告
    # r3 = reporting_agent.invoke(
    #     {"messages": [HumanMessage(content=t3_input)]}
    # )["messages"][-1].content
    # print(r3)


# ================================================================
# 主程序入口：从 JSON 读取模拟用户数据
# ================================================================
if __name__ == "__main__":
    with open("user_test.json", "r", encoding="utf-8") as f:
        user_json_data = json.load(f)

    # 将用户问卷 JSON → 文本需求
    req = parse_user_survey(user_json_data)

    # 运行三阶段租房分析流水线
    run_qrent_flow(req)
