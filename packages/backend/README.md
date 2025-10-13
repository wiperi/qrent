# Backend Setup with Docker Compose

This guide will help you set up the backend services using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git repository cloned to your local machine

## Setup Steps

1. Navigate to the backend directory:
   ```bash
   cd packages/backend
   ```

2. Create a `.env.docker` file based on the example:
   ```bash
   cp .env.docker.example .env.docker
   ```

3. Update the environment variables in `.env.docker`:
   - Set a secure `JWT_SECRET` value
   - Set your `API_KEY` value
   - Modify other variables as needed

   Example `.env.docker` file:
   ```
   # Database configuration
   DATABASE_URL="mysql://root:1234@db:3306/qrent"

   # Server configuration
   BACKEND_LISTEN_HOST="0.0.0.0"
   BACKEND_LISTEN_PORT="3200"

   # Security
   JWT_SECRET="your-secure-jwt-secret"
   API_KEY="your-api-key"

   # Node environment
   NODE_ENV="production"
   ```

4. Start the services using Docker Compose:
   ```bash
   docker-compose up -d
   ```

5. Verify the services are running:
   ```bash
   docker-compose ps
   ```

6. Access the backend API at `http://localhost:3200`

## Troubleshooting

- If the database connection fails, ensure the database service is running and the `DATABASE_URL` is correctly configured
- Check container logs for errors:
  ```bash
  docker-compose logs -f
  ```

## Stopping the Services

To stop the Docker Compose services:
