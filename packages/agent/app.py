import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from chatbot import stream_chatbot

app = FastAPI()

class RentRequest(BaseModel):
    requirements: str

def sse_format(data: str):
    return f"data: {data}\n\n"

async def qrent_streamer(requirements: str):
    for event in stream_chatbot(requirements):
        yield sse_format(str(event))

        await asyncio.sleep(0.01)

@app.post("/qrent/stream")
async def qrent_stream(req: RentRequest):
    return StreamingResponse(
        qrent_streamer(req.requirements),
        media_type="text/event-stream"
    )

@app.get("/")
def root():
    return {"status": "ok", "message": "success"}
