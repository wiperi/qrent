# QRent Agent 模块

## 概述

QRent Agent 模块是一个基于 LangGraph 和 LlamaIndex 构建的智能租房咨询系统，专为在澳洲留学生提供租房决策支持。该模块通过 RAG（检索增强生成）技术，结合澳洲租房知识库，为用户提供合规审查、需求优化建议和租房分析报告。

## 核心功能

### 1. 多智能体协作系统

系统采用三个专业智能体协同工作：

- **合规审查专家（Compliance Agent）**: 识别租房需求中的不合理项，确保需求符合澳洲租房市场实际情况
- **租房需求优化顾问（Inquiry Agent）**: 基于知识库提供优化建议，帮助用户改善租房需求
- **报告专家（Reporting Agent）**: 生成结构化的 Markdown 格式租房分析报告

### 2. RAG 知识检索

- 基于 LlamaIndex 构建的向量数据库
- 使用 DashScope 嵌入模型（text-embedding-v2）进行文本向量化
- 支持澳洲租房流程、法律条款、区域信息、价格风险等知识检索

### 3. FastAPI 流式接口

- 提供 SSE（Server-Sent Events）流式响应
- 实时返回智能体处理过程和结果
- RESTful API 设计，易于集成

## 项目结构

```
packages/agent/
├── agent.py                    # 核心智能体定义和工作流程
├── rag_tool.py                 # RAG 知识检索工具
├── build_knowledge_base.py     # 知识库构建脚本
├── frontParse.py               # 前端数据解析器
├── app.py                      # FastAPI 应用入口
├── requirements.txt            # Python 依赖
├── .gitignore                  # Git 忽略配置
├── knowledge/                  # 租房知识库源文件
│   ├── 常识资料.md
│   ├── 租房前期：信息与渠道.md
│   ├── 看房与申请.md
│   ├── 租约与法律.md
│   ├── 租金与预算.md
│   └── 入住与居住期.md
└── Qrent_knowledge_base/       # 向量数据库（自动生成，已忽略）
```

## 技术栈

### 核心依赖

- **LangGraph 1.0.3**: 多智能体工作流编排
- **LangChain 1.0.8**: LLM 应用开发框架
- **LlamaIndex 0.14.8**: RAG 框架和向量数据库
- **FastAPI 0.121.3**: 高性能 Web 框架
- **OpenAI GPT-4o-mini**: 大语言模型
- **DashScope**: 阿里云文本嵌入服务

### 主要功能库

- `langchain-openai`: OpenAI 模型集成
- `llama-index-embeddings-dashscope`: DashScope 嵌入集成
- `llama-index-readers-dashscope`: 文档解析器
- `python-dotenv`: 环境变量管理

## 安装与配置

### 1. 安装依赖

```bash
cd packages/agent
pip install -r requirements.txt
```

### 2. 环境变量配置

创建 `.env` 文件并配置以下环境变量：

```bash
# OpenAI API Key（用于 GPT-4o-mini）
OPENAI_API_KEY=your_openai_api_key

# 阿里云百炼 API Key（用于文本嵌入和文档解析）
BAILIAN_API_KEY=your_bailian_api_key
```

### 3. 构建知识库

首次使用前需要构建向量数据库：

```bash
python build_knowledge_base.py
```

该脚本会：
- 读取 `knowledge/` 目录下的所有 Markdown 文档
- 使用 DashScope 解析和分块文档（chunk_size=512, overlap=50）
- 生成向量嵌入并保存到 `Qrent_knowledge_base/` 目录

## 使用方法

### 方式一：FastAPI 服务（推荐）

1. 启动服务：

```bash
python app.py
# 或使用 uvicorn
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

2. 调用流式接口：

```bash
curl -X POST http://localhost:8000/qrent/stream \
  -H "Content-Type: application/json" \
  -d '{
    "requirements": "我想在悉尼租房，预算每周400澳元，希望离UNSW近，通勤时间不超过30分钟"
  }'
```

响应为 SSE 格式的流式数据，实时返回智能体的处理过程。

### 方式二：直接调用（用于测试）

```python
from agent import run_qrent_flow

# 直接输入租房需求文本
requirements = "我是悉尼大学的学生，预算每周500澳元，想租一个带家具的公寓"
run_qrent_flow(requirements)
```

### 方式三：使用前端数据解析器

如果有来自前端的 JSON 格式用户调研数据：

```python
import json
from frontParse import parse_user_survey
from agent import run_qrent_flow

# 读取前端 JSON 数据
with open("user_survey.json", "r", encoding="utf-8") as f:
    user_data = json.load(f)

# 解析为自然语言描述
requirements = parse_user_survey(user_data)

# 运行工作流
run_qrent_flow(requirements)
```

前端 JSON 数据格式示例：

```json
{
  "meta": {},
  "survey": {
    "budget": {
      "weekly_min": 400,
      "weekly_max": 600,
      "weekly_total": 500,
      "bills_included": true
    },
    "property": {
      "type": "Apartment",
      "furnished": true,
      "co_rent": "愿意",
      "accept_overpriced": false,
      "accept_small": true
    },
    "lifestyle": {
      "university": "UNSW",
      "commute": 30,
      "move_in": "2025-02-01",
      "lease_months": 12,
      "flexibility": ["通勤时间", "预算"]
    }
  }
}
```

## 工作流程详解

### 整体流程

```
用户需求输入
    ↓
Task 1: 合规审查
    ├─ 调用 search_qrent_knowledge 工具
    └─ 输出合规意见
    ↓
Task 2: 需求优化
    ├─ 结合原始需求和合规意见
    ├─ 调用 search_qrent_knowledge 工具
    └─ 输出优化建议
    ↓
Task 3: 生成报告
    ├─ 综合所有信息
    └─ 输出结构化 Markdown 报告
```

### 智能体内部机制

每个智能体都基于 `create_streaming_agent` 创建，采用 ReAct 模式：

1. **Agent 节点**: 接收消息，决定是否需要调用工具
2. **Tools 节点**: 执行工具调用（如知识库检索）
3. **条件路由**: 根据是否有工具调用决定继续或结束

```python
# 智能体状态图
StateGraph:
  agent → [has tool_calls?]
    ├─ Yes → tools → agent
    └─ No  → END
```

### RAG 工具机制

`search_qrent_knowledge` 工具的工作流程：

1. 接收自然语言查询
2. 使用 DashScope 嵌入模型将查询向量化
3. 在向量数据库中检索相似度最高的 Top-3 文档块
4. 返回检索结果供 LLM 参考

## API 接口文档

### POST /qrent/stream

流式生成租房分析报告。

**请求体：**

```json
{
  "requirements": "string"  // 租房需求描述
}
```

**响应：**

- Content-Type: `text/event-stream`
- 格式: SSE（Server-Sent Events）

**SSE 事件示例：**

```
data: {"messages": [...], "task": "compliance"}

data: {"messages": [...], "task": "inquiry"}

data: {"messages": [...], "task": "reporting"}
```

### GET /

健康检查接口。

**响应：**

```json
{
  "status": "ok",
  "message": "success"
}
```

## 知识库内容

当前知识库涵盖澳洲租房的以下主题：

1. **租房前期：信息与渠道**
   - 学生公寓 vs 社会房源
   - 租房平台和渠道
   - 房源类型介绍

2. **看房与申请**
   - 看房注意事项
   - 申请流程和材料
   - 房东筛选标准

3. **租约与法律**
   - 租赁合同条款
   - 租客权利和义务
   - 法律风险防范

4. **租金与预算**
   - 租金构成
   - 预算规划
   - 隐藏费用

5. **入住与居住期**
   - 入住检查清单
   - 维修和投诉
   - 退租流程

6. **常识资料**
   - 综合租房攻略
   - 常见问题解答

## 配置说明

### 模型配置

在 `agent.py` 中可以调整：

```python
llm = ChatOpenAI(
    model="gpt-4o-mini",    # 可选: gpt-4, gpt-3.5-turbo 等
    temperature=0.2          # 控制输出的随机性，0-1 之间
)
```

### RAG 配置

在 `rag_tool.py` 中可以调整：

```python
query_engine = index.as_query_engine(
    similarity_top_k=3  # 返回最相似的文档数量
)
```

在 `build_knowledge_base.py` 中可以调整：

```python
Settings.text_splitter = SentenceSplitter(
    chunk_size=512,     # 文档分块大小
    chunk_overlap=50    # 相邻块的重叠大小
)
```

### 系统提示词

每个智能体的行为由 `system_prompt` 控制，可以在 `agent.py` 中自定义：

```python
compliance_agent = create_streaming_agent(
    llm, TOOLS,
    system_prompt="你是合规审查专家，必须识别租房需求中的不合理项，并使用知识库工具验证。",
    task_name="task1_compliance"
)
```

## 开发与调试

### 日志输出

系统在运行过程中会打印详细的日志：

```
[task1_compliance][AGENT] 正在分析租房需求...
[task1_compliance][TOOL RESULT] search_qrent_knowledge: ...
[task2_inquiry][AGENT] 基于合规意见提供优化建议...
[task3_reporting][AGENT] 生成最终报告...
```

### 添加新工具

1. 在 `rag_tool.py` 或新文件中定义工具函数：

```python
from langchain_core.tools import tool

@tool
def your_new_tool(query: str) -> str:
    """
    工具描述（会被 LLM 看到，用于决定何时调用）
    """
    # 实现逻辑
    return result
```

2. 在 `agent.py` 中注册工具：

```python
from rag_tool import search_qrent_knowledge
from your_module import your_new_tool

TOOLS = [search_qrent_knowledge, your_new_tool]
```

### 添加新智能体

在 `agent.py` 中创建新的智能体：

```python
new_agent = create_streaming_agent(
    llm, TOOLS,
    system_prompt="你的角色和任务描述",
    task_name="task4_new"
)
```

并在工作流中调用：

```python
def run_qrent_flow(req: str):
    # ... 现有任务 ...
    
    print("\n===== Task 4: 新任务 =====")
    for _ in new_agent.stream(
        {"messages": [HumanMessage(content=t4_input)]},
        stream_mode="values"
    ):
        pass
```

## 常见问题

### Q1: 如何更新知识库？

1. 将新的 Markdown 或 PDF 文档放入 `knowledge/` 目录
2. 重新运行 `python build_knowledge_base.py`
3. 重启 FastAPI 服务

### Q2: 向量数据库存储在哪里？

向量数据库存储在 `Qrent_knowledge_base/` 目录，包含以下文件：
- `default__vector_store.json`: 向量索引
- `docstore.json`: 文档存储
- `index_store.json`: 索引元数据
- `graph_store.json`: 图存储（如有）

该目录已添加到 `.gitignore`，不会提交到版本控制。

### Q3: 如何切换嵌入模型？

修改 `rag_tool.py` 和 `build_knowledge_base.py` 中的嵌入模型配置：

```python
# 使用 OpenAI 嵌入
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.embed_model = OpenAIEmbedding(
    model="text-embedding-3-small"
)
```

注意：切换模型后需要重新构建知识库。

### Q4: 如何处理大文档？

对于大型文档，可以调整分块参数：

```python
Settings.text_splitter = SentenceSplitter(
    chunk_size=1024,      # 增大块大小
    chunk_overlap=100     # 增大重叠
)
```

### Q5: 如何提高检索精度？

1. **增加检索数量**: 调整 `similarity_top_k` 参数
2. **优化文档质量**: 确保知识库文档结构清晰、信息准确
3. **使用更好的嵌入模型**: 如 OpenAI 的 text-embedding-3-large
4. **添加重排序**: 使用 LlamaIndex 的 Reranker 功能

## 性能优化

### 缓存策略

可以添加 Redis 缓存来提升重复查询的响应速度：

```python
import redis
from functools import lru_cache

redis_client = redis.Redis(host='localhost', port=6379)

@lru_cache(maxsize=100)
def cached_search(query: str) -> str:
    cache_key = f"rag:{query}"
    cached = redis_client.get(cache_key)
    if cached:
        return cached.decode()
    
    result = _internal_search(query)
    redis_client.setex(cache_key, 3600, result)  # 1小时过期
    return result
```

### 并发处理

FastAPI 天然支持异步处理，可以添加并发限制：

```python
from fastapi import FastAPI
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter

# 限制每分钟最多 10 次请求
@app.post("/qrent/stream", dependencies=[Depends(RateLimiter(times=10, seconds=60))])
async def qrent_stream(req: RentRequest):
    # ...
```

## 部署建议

### Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 构建知识库（如果不在镜像中预构建，需要挂载卷）
RUN python build_knowledge_base.py

EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 环境变量管理

在生产环境中，建议使用 Kubernetes Secrets 或云服务商的密钥管理服务：

```bash
# Kubernetes ConfigMap
kubectl create configmap agent-config \
  --from-literal=OPENAI_API_KEY=xxx \
  --from-literal=BAILIAN_API_KEY=xxx
```

### 监控和日志

集成 Prometheus 和 ELK Stack 进行监控：

```python
from prometheus_fastapi_instrumentator import Instrumentator

app = FastAPI()
Instrumentator().instrument(app).expose(app)
```

## 贡献指南

欢迎贡献代码和知识库内容！

### 添加知识内容

1. 在 `knowledge/` 目录下创建或编辑 Markdown 文件
2. 确保内容准确、结构清晰
3. 重新构建知识库
4. 提交 Pull Request

### 代码贡献

1. Fork 仓库
2. 创建特性分支
3. 编写代码和测试
4. 提交 Pull Request

## 许可证

本项目采用 Non-Commercial License (NCL 1.0) 许可证。商业使用需要单独授权。

## 联系方式

- 项目网站: https://www.qrent.rent
- 问题反馈: GitHub Issues
- 小红书咨询: http://xhslink.com/a/unyymyXzR5y9

---

**注意**: 本模块仍在积极开发中，API 和功能可能会有变化。建议关注项目更新。
