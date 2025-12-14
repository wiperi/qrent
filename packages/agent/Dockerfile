FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

COPY . .
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "127.0.0.1", "--port", "8000"]

