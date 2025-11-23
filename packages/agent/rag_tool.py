import os
import dotenv
from typing import Optional

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.settings import Settings
from llama_index.embeddings.dashscope import DashScopeEmbedding

from langchain_core.tools import tool

dotenv.load_dotenv()

API_KEY = os.getenv("BAILIAN_API_KEY")

Settings.embed_model = DashScopeEmbedding(
    model_name="text-embedding-v2",
    api_key=API_KEY
)

PERSIST_DIR = "Qrent_knowledge_base"

storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
index = load_index_from_storage(storage_context)

query_engine = index.as_query_engine(similarity_top_k=3)


def _internal_search(query: str) -> str:
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
    - 查询租房流程
    - 查询法律条款
    - 查询区域信息
    - 查询价格、风险、条例等事实数据

    必须输入：query（自然语言问题）
    """
    return _internal_search(query)
