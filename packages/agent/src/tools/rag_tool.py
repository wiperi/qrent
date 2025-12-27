import os
import dotenv

from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.settings import Settings
from llama_index.embeddings.dashscope import DashScopeEmbedding
from langchain_core.tools import tool
from src.config.path import PATHS

dotenv.load_dotenv()

# ================================================================
# 1. 加载百炼 API Key（用于创建向量查询模型）
# ================================================================
API_KEY = os.getenv("BAILIAN_API_KEY")
if not API_KEY:
    raise ValueError("❌ 错误：未找到 BAILIAN_API_KEY，请检查 .env 文件")

# ================================================================
# 2. 配置 LlamaIndex 使用 DashScopeEmbedding
#    ——必须与构建索引时使用的 embedding 模型一致
# ================================================================
Settings.embed_model = DashScopeEmbedding(
    model_name="text-embedding-v2",  # 与构建向量库的模型保持一致
    api_key=API_KEY
)

# ================================================================
# 3. 加载已构建的向量数据库（Persisted Vector Index）
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
# 4. 内部查询函数 —— 不暴露给外部，仅做核心检索逻辑
# ================================================================
def _internal_search(query: str) -> str:
    """
    执行实际的向量检索请求。

    参数:
        query (str): 自然语言问题
    返回:
        str: 查询结果或错误信息
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
