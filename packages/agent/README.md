# Qrent Agent

## Overview
**Qrent Agent** is an LLM-powered agent built on the **LangGraph** framework for the Qrent platform.  

It supports **retrieval-augmented generation (RAG)** over a rental knowledge base and **automatic rental cover letter generation**.

## Features
- LangGraph-based multi-step agent workflow  
- Retrieval-augmented generation (RAG)  
- Automated rental cover letter generation  
- API-ready architecture (FastAPI compatible)  
- Docker-based deployment support  

## Project Structure
```text
## Project Structure

```text
agent/
├── __pycache__/                  # Python bytecode cache
├── .github/                      # GitHub workflows and configurations
├── .langgraph_api/               # LangGraph API-related configuration
├── aivenv/                       # Local Python virtual environment (not committed)
├── config/                       # Global configuration modules
│   ├── __pycache__/
│   ├── __init__.py
│   ├── config.py                 # Centralized configuration (models, keys, params)
│   └── path.py                   # Path and directory management
├── docs/                         # Documentation and knowledge source files
├── knowledge/                    # Persisted RAG knowledge base (vector stores)
├── src/
│   └── agent/                    # Core agent implementation (LangGraph logic)
├── static/                       # Static assets
├── tests/                        # Test suite
│   ├── integration_tests/        # Integration-level tests
│   ├── unit_tests/               # Unit tests
│   └── conftest.py               # Pytest global fixtures
├── tools/                        # Agent tool implementations
│   ├── __pycache__/
│   ├── __init__.py
│   ├── build_knowledge_base.py   # Knowledge base construction script
│   ├── coverletter_tool.py       # Rental cover letter generation tool
│   └── rag_tool.py               # RAG retrieval tool
├── __init__.py                   # Package initializer
├── .env.example                  # Environment variable template
├── app.py                        # Application entrypoint (FastAPI / Agent server)
├── Dockerfile                    # Docker image build definition
├── langgraph.json                # LangGraph workflow configuration
├── LICENSE                       # License information
├── Makefile                      # Common development commands
├── pyproject.toml                # Python project metadata and tooling config
├── README.md                     # Project documentation
├── requirements.txt              # Python dependencies
└── uv.lock                       # Dependency lock file

```

## Environment Variables
Create a `.env` file in the project root and configure the following variables:
```env
OPENAI_API_KEY=your_openai_api_key
BAILIAN_API_KEY=your_bailian_api_key
LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_langsmith_api_key
```

### Notes
- **OPENAI_API_KEY**  
  API key for OpenAI models.
- **BAILIAN_API_KEY**  
  API key for Alibaba Bailian / DashScope services.
- **LANGSMITH_TRACING** *(optional)*  
  Enables LangSmith tracing for agent execution.
- **LANGSMITH_API_KEY** *(optional)*  
  Required when LangSmith tracing is enabled.
> ⚠️ Do not commit the `.env` file to the repository.  
> Make sure `.env` is listed in `.gitignore`.

## Setup

Install dependencies:
```bash
pip install -r requirements.txt
```

## Run

Run locally:
```bash
python app.py
```

Or start as a FastAPI service:
```bash
uvicorn app:app --host 0.0.0.0 --port 8000
```
---
## Docker

Build the image:
```bash
docker build -t qrent-agent .
```

Run the container:
```bash
docker run -p 8000:8000 --env-file .env qrent-agent
```

