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

from rag_tool import search_qrent_knowledge
from frontParse import parse_user_survey

class ChatbotState(TypedDict): 
    messages: Annotated[Sequence[BaseMessage], add_messages]
def create_chatbot(model, tools,system_prompt: str,task_name: str):
    model = model.bind_tools(tools)
    tools_by_name = {t.name: t for t in tools}
    async def tool_node(state: ChatbotState):
        last_msg = state["messages"][-1]
        outputs = []
        for call in last_msg.tool_calls:
            tool = tools_by_name[call["name"]]
            args = call["args"]
            try:
                print(f"[{task_name}] 正在调用工具: {call['name']}...")
                result = await tool.ainvoke(args)
            except Exception as e:
                result = f"Tool Error: {e}"
            outputs.append(
                ToolMessage(
                    content=str(result),
                    tool_call_id=call.get("id"),
                    name=call["name"]
                )
            )
        return {"messages": outputs}
    async def call_model(state: ChatbotState, config: RunnableConfig):
        sys = SystemMessage(content=system_prompt)
        resp = await model.ainvoke([sys] + state["messages"])
        return {"messages": [resp]}
    def should_continue(state: ChatbotState):
        last = state["messages"][-1]
        tool_calls = getattr(last, "tool_calls", None)
        if tool_calls:
            return "continue"
        else:
            return "end"
    graph = StateGraph(ChatbotState)
    graph.add_node("tool", tool_node)
    graph.add_node("agent", call_model)
    graph.set_entry_point("agent")
    graph.add_conditional_edges("agent", should_continue, {
        "continue": "tool", "end": END})
    graph.add_edge("tool", "agent")
    return graph.compile()

llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.2).with_config({"async": True})
TOOLS = [search_qrent_knowledge]
CONSULTANT_PROMPT = """
你是专业的租房咨询顾问。你的任务是根据用户的需求，查询知识库并给出专业建议。

请严格遵循以下步骤：
1. **必须先调用工具** `search_qrent_knowledge` 查询与用户需求（如区域、预算、设施等）相关的最新房源政策,市场信息,法律法规等信息。
2. 根据查询到的事实信息，判断用户的需求是否合理。
3. 如果用户提出租房相关问题，请先查询知识库，如果知识库中存在相关信息，将相关信息返回给用户，并结束回答。
4. 如果用户提出租房相关问题，请先查询知识库，如果知识库中没有相关信息，告诉用户我们无法回答这个问题，并结束回答。
5. 如果用户提出其他问题,告诉用户我们无法回答这个问题,并结束回答。

注意：如果用户需求明显违背知识库中的常识（如预算过低），请礼貌指出并给出合理范围。
"""
consultant_agent = create_chatbot(
    llm, 
    TOOLS, 
    system_prompt=CONSULTANT_PROMPT, 
    task_name="Consultant"
)
async def arun_chatbot(req: str):
    final_response = ""
    async for event in consultant_agent.astream(
        {"messages": [HumanMessage(content=req)]},
        stream_mode="values"
    ):  
        msgs = event.get("messages")
        if not msgs:
            continue
        last_message = msgs[-1]
        if isinstance(last_message, AIMessage) and not getattr(last_message, "tool_calls", None):
            final_response = last_message.content
    return final_response

async def run_multiple_requests(requests: list[str]):
    tasks = [arun_chatbot(req) for req in requests]
    results = await asyncio.gather(*tasks)
    return results

async def stream_chatbot(req: str):
    async for event in consultant_agent.astream(
        {"messages": [HumanMessage(content=req)]},
        stream_mode="values"
    ):
        yield event

if __name__ == "__main__":
    try:
        with open("user_test.json", "r", encoding="utf-8") as f:
            user_json_data = json.load(f)
        req_text = parse_user_survey(user_json_data)
    except FileNotFoundError:
        
            requests = [
        "租房前必须支付哪些费用？",
        "如何提高申请通过率，让房东更愿意选你?",
        "想提前退租怎么办？会不会被罚钱？"
    ]

    results = asyncio.run(run_multiple_requests(requests))
    for i, res in enumerate(results):
        print(f"\n==== RESPONSE {i} ====")
        print(res)
