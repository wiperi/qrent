import os
import shutil
import dotenv
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.settings import Settings
from llama_index.embeddings.dashscope import DashScopeEmbedding
from llama_index.readers.dashscope.base import DashScopeParse
from llama_index.readers.dashscope.utils import ResultType
from src.config.path import PATHS

# ================================================================
# 1. 加载环境变量（用于读取百炼 API Key）
# ================================================================
dotenv.load_dotenv()

API_KEY = os.getenv("BAILIAN_API_KEY")
if not API_KEY:
    raise ValueError("❌ BAILIAN_API_KEY 未设置，请检查 .env 文件！")

# ================================================================
# 2. 配置 LlamaIndex（嵌入模型 + 文本切分器）
# ================================================================

# 设置 DashScope（阿里云百炼）embedding 模型
Settings.embed_model = DashScopeEmbedding(
    model_name="text-embedding-v2",  # 通常比 text-embedding-v1 表现更强
    api_key=API_KEY
)

# 文本切分器，用于将文档拆成更小的 chunk
# chunk_size: 每块最大 tokens/字符数量
# chunk_overlap: 块之间的重叠（用于保持语义连续性）
Settings.text_splitter = SentenceSplitter(
    chunk_size=1024,
    chunk_overlap=256
)

# DocMind PDF/Word/Markdown 专用解析器（效果优于普通 parser）
# ResultType.DASHSCOPE_DOCMIND：结构化理解全文内容
parse = DashScopeParse(
    result_type=ResultType.DASHSCOPE_DOCMIND,
    api_key=API_KEY
)

# ================================================================
# 3. 加载本地文档（支持 .pdf / .md / .docx）
# ================================================================

documents = SimpleDirectoryReader(
    PATHS["DOCS_DIR"],
    file_extractor={
        ".pdf": parse,
        ".md": parse,
        ".docx": parse
    }
).load_data()

# ================================================================
# 4. 创建或清空向量数据库持久化目录
# ================================================================
PERSIST_DIR = PATHS["KNOWLEDGE_BASE_DIR"]

# 为确保新的构建不会叠加旧的数据，每次都删除重建
if os.path.exists(PERSIST_DIR):
    shutil.rmtree(PERSIST_DIR)

os.makedirs(PERSIST_DIR, exist_ok=True)

# ================================================================
# 5. 使用文档构建向量索引（VectorStoreIndex）
# ================================================================
# show_progress=True 会打印出 embedding 进度
index = VectorStoreIndex.from_documents(
    documents,
    embed_model=Settings.embed_model,
    show_progress=True
)

# ================================================================
# 6. 持久化向量索引到磁盘（方便在 RAG 中加载）
# ================================================================
index.storage_context.persist(PERSIST_DIR)

print(f"✅ 完成！成功写入向量库。文档总数: {len(index.docstore.docs)}")
