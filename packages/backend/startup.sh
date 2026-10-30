#!/bin/sh
set -eu

echo "Starting the application..."
exec pnpm --filter @qrent/backend start
