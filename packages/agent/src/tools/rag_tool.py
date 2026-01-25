"""
RAG tool powered by LlamaIndex.

This module loads the persisted Qrent knowledge base index and exposes a
LangChain tool (`search_qrent_knowledge`) for retrieval-augmented generation.
"""

import os
import dotenv

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.settings import Settings
from llama_index.embeddings.dashscope import DashScopeEmbedding
from llama_index.llms.openai import OpenAI
# 引入 utils 以便注册新模型
from llama_index.llms.openai.utils import ALL_AVAILABLE_MODELS, CHAT_MODELS
from langchain_core.tools import tool
from src.config.path import PATHS

dotenv.load_dotenv()

# ================================================================
# 0. 修复 LlamaIndex 不识别 deepseek-chat 的问题
# ================================================================
# 手动注册 deepseek-chat 模型，防止 "Unknown model" 报错
ALL_AVAILABLE_MODELS["deepseek-chat"] = 32000  # 假设上下文窗口为 32k
CHAT_MODELS["deepseek-chat"] = 32000

# ================================================================
# 1. 配置 LLM (DeepSeek)
# ================================================================
# 显式配置 Settings.llm，确保 query_engine 使用正确的模型
Settings.llm = OpenAI(
    model="deepseek-chat",
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    api_base=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
    temperature=0.2,
)

# ================================================================
# 2. 加载百炼 API Key（用于创建向量查询模型）
# ================================================================
API_KEY = os.getenv("BAILIAN_API_KEY")
if not API_KEY:
    raise ValueError("❌ 错误：未找到 BAILIAN_API_KEY，请检查 .env 文件")

# ================================================================
# 3. 配置 LlamaIndex 使用 DashScopeEmbedding
#    ——必须与构建索引时使用的 embedding 模型一致
# ================================================================
Settings.embed_model = DashScopeEmbedding(
    model_name="text-embedding-v2",  # 与构建向量库的模型保持一致
    api_key=API_KEY
)

# ================================================================
# 4. 加载已构建的向量数据库（Persisted Vector Index）
# ================================================================
PERSIST_DIR = PATHS["KNOWLEDGE_BASE_DIR"]

# 构建存储上下文，从 persist_dir 中恢复 index
storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)

# 加载索引（必须对应你在 build_index 时保存的格式）
index = load_index_from_storage(storage_context)

# 创建 Query Engine（简单搜索接口）
# similarity_top_k=3 表示每次返回最相似的 3 段文本
query_engine = index.as_query_engine(similarity_top_k=3)

# ================================================================
# 5. 内部查询函数 —— 不暴露给外部，仅做核心检索逻辑
# ================================================================
def _internal_search(query: str) -> str:
    """
    执行实际的向量检索请求。
    """
    try:
        response = query_engine.query(query)
        return str(response)
    except Exception as e:
        return f"Error searching the Qrent KB: {e}"

@tool
def search_qrent_knowledge(query: str) -> str:
    """
    使用 Qrent 租房知识库进行检索。
    用途：
    - 查询澳洲租房流程
    - 查询租房法律条款（NSW）
    - 查询各区域信息（治安、交通、租金等）
    - 查询租房风险、注意事项
    - 查询租金结构与市场趋势
    - 查询合同中常见术语及合法性

    参数：
    - query (str): 自然语言问题（必须输入）

    返回：
    - str: 来自向量知识库的检索答案
    """
    return _internal_search(query)
    
