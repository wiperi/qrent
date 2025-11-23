🏠 Qrent AI — RAG 租房智能助手

一个基于 LangGraph + LlamaIndex + 阿里云百炼（DashScope）的多智能体租房分析系统
（Renting AI Assistant with Multi-Agent Workflow）

📌 项目简介

Qrent AI 是一个面向澳大利亚（尤其是 NSW 地区）学生与新移民的 租房智能分析系统。
它结合 多智能体（LangGraph）+ RAG 知识检索（LlamaIndex）+ 百炼 DocMind 文档解析，实现以下功能：

合规审查：识别用户租房需求中不合理或与澳洲政策冲突的条目

需求优化：基于事实提供可执行建议（预算、交通、区域选择）

知识库检索：从本地构建的向量知识库中获取租房法规、流程、风险等信息

自动报告：生成结构化 Markdown 租房建议报告

整个 pipeline 分为 3 个阶段：

Compliance Agent（合规检查）

Inquiry Agent（优化建议）

Reporting Agent（报告输出）

📂 项目结构说明

项目的主要目录如下：

packages/
└── agent/
    ├── aivenv/                  # 虚拟环境
    ├── knowledge/               # 手动放置的知识库文档（PDF/MD/DOCX）
    ├── Qrent_knowledge_base/    # 持久化后的向量数据库（自动生成）
    ├── .env                     # API Key 配置（需手动创建）
    ├── .gitignore               # Git 忽略规则
    ├── agent.py                 # 多智能体（LangGraph）主流程
    ├── app.py                   # FastAPI 接口入口（若使用）
    ├── build_knowledge_base.py  # 构建 RAG 向量知识库脚本
    ├── frontParse.py            # 解析前端问卷，转成自然语言需求
    └── rag_tool.py              # RAG 检索工具（LangChain Tool 格式）

🔑 环境变量配置（.env）

在 packages/agent/.env 内配置阿里云百炼 API Key 与 OPENAI API KEY：

BAILIAN_API_KEY=你的APIKey
OPENAI API KEY = 你的APIKey

📘 安装依赖

确保你处于 agent 目录下：

cd packages/agent
pip install -r requirements.txt


如果你使用虚拟环境（推荐）：

python -m venv aivenv
source aivenv/bin/activate   # macOS / Linux
aivenv\Scripts\activate      # Windows

📚 构建本地租房知识库（RAG）

将你的 PDF / DOCX / Markdown 文件放进：

packages/agent/knowledge/


然后运行：

python build_knowledge_base.py


该脚本会：

使用 DocMind 解析文件内容（精准识别 PDF/图片/表格）

自动切分 chunk（512 tokens）

使用 DashScope Embedding v2 进行向量化

构建并保存 RAG 向量库到：

packages/agent/Qrent_knowledge_base/


成功后输出：

✅ 完成！文档数: X

🤖 运行多智能体主流程

你可以对用户问卷模拟运行：

python agent.py


内部逻辑包括：

调用 parse_user_survey() 生成自然语言需求

依次调用 3 个 LangGraph Agent

流式打印合规检查 / 优化建议 / 最终报告

🔍 RAG 工具（rag_tool.py）

search_qrent_knowledge 是提供给智能体的工具函数：

@tool
def search_qrent_knowledge(query: str) -> str:


它会：

加载本地 Qrent_knowledge_base

使用向量检索

返回最接近的 3 个知识块

供智能体调用验证事实

典型用途：

租房流程是什么？

NSW 的法律允许宠物吗？

Ashfield 的安全性如何？

出租房的常见骗局？

⚙️ Agent 架构（LangGraph）

主要核心代码在 agent.py：

自定义 create_streaming_agent()

支持 LLM 工具调用

使用 StateGraph 控制 agent → tools → agent 循环

完整三阶段 pipeline：

Agent	功能说明
Task1 Compliance	检查需求是否合规
Task2 Inquiry	给出可执行建议
Task3 Reporting	生成 Markdown 报告
🌐 启动 API 服务（如使用 FastAPI）

如果 app.py 使用 FastAPI：

uvicorn app:app --reload

📦 依赖列表

请参考：

packages/agent/requirements.txt


包含：

langchain

langgraph

llama-index

dashscope

fastapi（如需）

uvicorn（如需）

🗃️ 数据路径说明
路径	作用
knowledge/	原始文档（手动放置）
Qrent_knowledge_base/	构建后的向量数据库（自动生成）
.env	API Key
agent.py	主流程
rag_tool.py	RAG 工具
🚀 项目亮点

高质量文档理解（阿里 DocMind）

精准检索（DashScope embedding v2）

多智能体协作（LangGraph）

结构化 RAG 输出

可扩展 FastAPI 服务