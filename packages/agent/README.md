? Qrent Agent
Overview

Qrent Agent is an LLM-powered agent built on the LangGraph framework for the Qrent platform.
It supports retrieval-augmented generation (RAG) over a rental knowledge base and automatic rental cover letter generation.

Features

LangGraph-based multi-step agent workflow

Retrieval-augmented generation (RAG)

Automated rental cover letter generation

API-ready architecture (FastAPI compatible)

Docker-based deployment support

Project Structure
agent/
©À©¤©¤ src/            
©À©¤©¤ tools/          
©À©¤©¤ knowledge/      
©À©¤©¤ config/         
©À©¤©¤ docs/           
©À©¤©¤ tests/          
©À©¤©¤ app.py         
©À©¤©¤ langgraph.json  
©À©¤©¤ Dockerfile
©À©¤©¤ requirements.txt
©¸©¤©¤ README.md

Environment Variables

Create a .env file in the project root and configure the following variables:

OPENAI_API_KEY=your_openai_api_key
BAILIAN_API_KEY=your_bailian_api_key

LANGSMITH_TRACING=true
LANGSMITH_API_KEY=your_langsmith_api_key


Notes

OPENAI_API_KEY
API key for OpenAI models.

BAILIAN_API_KEY
API key for Alibaba Bailian / DashScope services.

LANGSMITH_TRACING (optional)
Enables LangSmith tracing for agent execution.

LANGSMITH_API_KEY (optional)
Required when LangSmith tracing is enabled.

Setup
pip install -r requirements.txt

Run
python app.py


Or with FastAPI:

uvicorn app:app --host 0.0.0.0 --port 8000

Docker
docker build -t qrent-agent .
docker run -p 8000:8000 --env-file .env qrent-agent

License

MIT License.