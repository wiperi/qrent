import asyncio
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from agent import run_qrent_flow

app = FastAPI()

class RentRequest(BaseModel):
    requirements: str

def sse_format(data: str):
    return f"data: {data}\n\n"

async def qrent_streamer(requirements: str):
    for event in run_qrent_flow(requirements):
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
