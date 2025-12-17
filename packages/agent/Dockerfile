FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app:app --host ${AGENT_HOST:-0.0.0.0} --port ${AGENT_PORT:-8000}"]


