#!/bin/sh
echo "Running database migrations..."
cd packages/shared
pnpm prisma db push --accept-data-loss

# Start the application
echo "Starting the application..."
exec pnpm --filter @qrent/backend start
