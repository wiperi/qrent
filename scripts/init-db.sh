#!/bin/bash

# set up database

set -e

if [ ! -f "docker-compose.yml" ]; then
  echo "error"
  exit 1
fi

echo "connecting"
docker-compose up -d db

echo "waiting..."
sleep 10

cd packages/shared

pnpm db:push

pnpm db:generate

pnpm db:seed

echo "finish！"
echo ""
echo "  • Schools: UNSW (id: 1), USYD (id: 2)"
