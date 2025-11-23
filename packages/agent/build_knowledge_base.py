import os
import shutil
import dotenv
from llama_index.core import SimpleDirectoryReader, VectorStoreIndex
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.settings import Settings
from llama_index.embeddings.dashscope import DashScopeEmbedding
from llama_index.readers.dashscope.base import DashScopeParse
from llama_index.readers.dashscope.utils import ResultType

dotenv.load_dotenv()

API_KEY = os.getenv("BAILIAN_API_KEY")
Settings.embed_model = DashScopeEmbedding(
    model_name="text-embedding-v2",
    api_key=API_KEY
)
Settings.text_splitter = SentenceSplitter(chunk_size=512, chunk_overlap=50)
parse = DashScopeParse(result_type=ResultType.DASHSCOPE_DOCMIND, api_key=API_KEY)
documents = SimpleDirectoryReader(
    "knowledge",
    file_extractor={".pdf": parse, ".md": parse,".docx": parse}
).load_data()

PERSIST_DIR = "Qrent_knowledge_base"
if os.path.exists(PERSIST_DIR):
    shutil.rmtree(PERSIST_DIR)
os.makedirs(PERSIST_DIR, exist_ok=True)

index = VectorStoreIndex.from_documents(
    documents,
    embed_model=Settings.embed_model,
    show_progress=True
)

# 保存索引
index.storage_context.persist(PERSIST_DIR)
print(f"✅ 完成！文档数: {len(index.docstore.docs)}")