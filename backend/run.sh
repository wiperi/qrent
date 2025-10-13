#!/usr/bin/env bash
export PYTHONUNBUFFERED=1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
