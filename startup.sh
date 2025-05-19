#!/bin/sh

# Wait for database to be ready
echo "Waiting for database to be ready..."
until nc -z db 3306; do
  echo "Database not ready yet - waiting..."
  sleep 2
done
echo "Database is ready!"

# Run database migrations if needed
echo "Running database migrations..."
cd packages/shared
pnpm db:push

# Start the application
echo "Starting the application..."
exec pnpm --filter @qrent/backend start
