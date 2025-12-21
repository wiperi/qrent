# app.py
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage
from src.agent.graph import graph, State
import os

app = FastAPI()

HOST = os.getenv("AGENT_HOST", "0.0.0.0")
PORT = int(os.getenv("AGENT_PORT", "8000"))

class ChatPayload(BaseModel):
    messages: list[dict]

@app.get("/health")
async def health():
    return {"status": "ok", "msg": f"Qrent AI Agent is running on {HOST}:{PORT}"}

@app.post("/invoke")
async def invoke_graph(payload: ChatPayload):
    """
    payload:
    {
        "messages": [
            {"role": "user", "content": "帮我生成cover letter"}
        ]
    }
    """
    human_messages = [
        HumanMessage(content=m["content"])
        for m in payload.messages
    ]
    state = State(messages=human_messages)

    result = await graph.ainvoke(state)
    return result


@app.post("/stream")
async def stream_graph(payload: ChatPayload):
    """
    流式输出接口（前端可实现 ChatGPT 打字机效果）
    """
    human_messages = [
        HumanMessage(content=m["content"])
        for m in payload.messages
    ]
    state = State(messages=human_messages)

    async def event_generator():
        async for event in graph.astream(state):
            yield f"data: {event}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


if __name__ == "__main__":
    uvicorn.run("app:app", host=HOST, port=PORT)
