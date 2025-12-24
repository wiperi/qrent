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
agent/
│── src/            # Core agent logic
│── tools/          # Agent tools (RAG, generation, APIs)
│── knowledge/      # Knowledge base for RAG
│── config/         # Configuration files
│── docs/           # Documentation
│── tests/          # Tests
│── app.py          # Application entrypoint
│── langgraph.json  # LangGraph configuration
│── Dockerfile
│── requirements.txt
└── README.md
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

