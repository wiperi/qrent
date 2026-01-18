import os

def get_project_root():
    return os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROJECT_ROOT = get_project_root()
PATHS = {
    "PROJECT_ROOT": PROJECT_ROOT,
    "DOCS_DIR": os.path.join(PROJECT_ROOT, "docs"),
    "KNOWLEDGE_BASE_DIR": os.path.join(PROJECT_ROOT, "knowledge"),
    "PROMPTS_DIR": os.path.join(PROJECT_ROOT, "src", "prompts"),
}