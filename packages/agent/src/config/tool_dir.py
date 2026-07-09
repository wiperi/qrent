import os
from src.tools.rag_tool import search_qrent_knowledge
from src.tools.cover_letter import generate_rental_cover_letter
from src.tools.parents_letter import generate_parent_letter

# 统一注册所有工具
ALL_TOOLS = [
    search_qrent_knowledge,
    generate_rental_cover_letter,
    generate_parent_letter,
]

TOOLS_BY_NAME = {t.name: t for t in ALL_TOOLS}
