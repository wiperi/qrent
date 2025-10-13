from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, Literal
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

# ---- CORS ----
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app = FastAPI(title="Rental Survey Backend")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],  # 开发阶段可放开
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- 环境变量：Dify ----
DIFY_MODE: Literal["chat", "workflow"] = os.getenv("DIFY_MODE", "chat")  # chat / workflow
DIFY_API_URL = os.getenv("DIFY_API_URL", "").rstrip("/")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")
DIFY_USER_ID = os.getenv("DIFY_USER_ID", "ui-user-001")
DIFY_WORKFLOW_APP_ID = os.getenv("DIFY_WORKFLOW_APP_ID")  # workflow 模式可能需要

if not DIFY_API_URL or not DIFY_API_KEY:
    raise RuntimeError("DIFY_API_URL / DIFY_API_KEY 未配置。请在 .env 中设置。")

# ---- Pydantic 数据模型（和前端 questionnaire.js 对齐）----
class Survey(BaseModel):
    budgetMin: Optional[str] = ""
    budgetMax: Optional[str] = ""
    billsIncluded: Optional[bool | Literal["unknown"]] = None
    furnished: Optional[bool | Literal["unknown"]] = None
    weeklyTotal: Optional[str] = ""
    propertyType: Optional[str] = None
    coRent: Optional[Literal["yes", "no", "maybe"]] = None
    commute: Optional[Literal["15", "30", "45", "60", ">60", "none"]] = None
    moveIn: Optional[str] = None    # ISO 日期字符串
    leaseMonths: Optional[str] = None
    acceptOverpriced: Optional[Literal["yes", "no", "depends"]] = None
    acceptSmall: Optional[Literal["yes", "no", "depends"]] = None

# ---- 将问卷数据转换成 Dify 需要的 payload ----
def build_dify_payload(s: Survey) -> dict:
    if DIFY_MODE == "chat":
        # Chat App：常见字段
        # 你可以把问卷变成一段系统提示或用户消息
        message = (
            "请根据以下租房问卷数据生成摘要/存档：\n"
            f"- 预算范围(周)：{s.budgetMin or '未填'} - {s.budgetMax or '未填'}\n"
            f"- Bills：{s.billsIncluded}\n"
            f"- 家具：{s.furnished}\n"
            f"- 总开销(周)：{s.weeklyTotal or '未填'}\n"
            f"- 房型：{s.propertyType or '未选'}；合租：{s.coRent}\n"
            f"- 通勤：{s.commute}\n"
            f"- 入住：{s.moveIn}；租期(月)：{s.leaseMonths}\n"
            f"- 溢价房源：{s.acceptOverpriced}；小房间：{s.acceptSmall}\n"
            "请输出 JSON 结构化结果，包含可搜索的字段。"
        )
        return {
            "inputs": {},                 # 可传给 Dify 的输入变量
            "query": message,             # 用户消息
            "response_mode": "blocking",  # 同步返回
            "user": DIFY_USER_ID,
        }

    # Workflow App：传入 inputs，自定义节点里消费
    inputs = s.model_dump()
    payload = {
        "inputs": inputs,
        "response_mode": "blocking",
        "user": DIFY_USER_ID,
    }
    # 有的部署需要 app_id
    if DIFY_WORKFLOW_APP_ID:
        payload["app_id"] = DIFY_WORKFLOW_APP_ID
    return payload

# ---- 与 Dify 通信 ----
async def post_to_dify(payload: dict) -> dict:
    headers = {
        "Authorization": f"Bearer {DIFY_API_KEY}",
        "Content-Type": "application/json",
    }
    timeout = httpx.Timeout(25.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(DIFY_API_URL, headers=headers, json=payload)
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.json()

# ---- 健康检查 ----
@app.get("/health")
async def health():
    return {"ok": True, "mode": DIFY_MODE}

# ---- 接收前端问卷，转发到 Dify ----
@app.post("/surveys")
async def receive_survey(survey: Survey):
    payload = build_dify_payload(survey)
    try:
        dify_resp = await post_to_dify(payload)
    except HTTPException as e:
        # 透传 Dify 的错误信息给前端
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "status": "ok",
        "forward_to": DIFY_API_URL,
        "dify": dify_resp,
    }
