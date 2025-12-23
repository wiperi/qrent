import os
from tools.rag_tool import search_qrent_knowledge
from tools.coverletter_tool import generate_rental_cover_letter

# 统一注册所有工具
ALL_TOOLS = [
    search_qrent_knowledge,
    generate_rental_cover_letter,
]

TOOLS_BY_NAME = {t.name: t for t in ALL_TOOLS}
