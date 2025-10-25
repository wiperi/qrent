Qrent

Website: www.qrent.rent

Qrent is an AI-powered rental platform built for international students in Australia.
It helps students find housing smarter and faster by analyzing commute time, budget, and area data to recommend the most suitable rentals — all in one place.

🌟 Key Features

AI-Based Recommendations: Personalized rental suggestions based on commute, budget, and lifestyle.

Smart Filters: Instantly narrow down listings with intelligent search and filter options.

All-in-One Experience: Compare, shortlist, and book — without switching platforms.

Local Insights: Understand each suburb’s pros and cons with data-driven summaries.

🚀 Mission

To make renting in Australia simple, transparent, and data-driven — empowering international students to find a real home faster.

——————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————————
# QRent Backend Setup Guide

## Overview
QRent is a rental property management system with a Node.js backend.

## Prerequisites
- Node.js (v16+)
- Docker and Docker Compose
- pnpm

## Installation

### Clone the Repository
```bash
git clone https://github.com/yourusername/qrent.git
cd qrent
```

### Environment Setup

1. Create your environment configuration:
   - Locate the `.env.example` file in the project root
   - Make a copy and rename it to `.env`
   - Update the following values according to your setup:
     - `DATABASE_URL`: Your MySQL connection string
     - `JWT_SECRET`: A secure random string for authentication
     - `PORT`: The port for the backend server (default: 3200)

### Development with Docker

1. **Setup Docker Environment**:
   - Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for your operating system
   - Install the Docker extension for VSCode for better container management
   - Ensure Docker Compose is installed (comes with Docker Desktop)

2. **Configure for Development Mode**:
   - Edit the `startup.sh` file in the project root
   - Replace the last line:
     ```sh
     # Change this line:
     exec pnpm --filter @qrent/backend start
     
     # To this for development mode with hot reloading:
     exec pnpm --filter @qrent/backend dev
     ```

3. **Start the Development Environment**:
   - In the project root directory, run:
     ```sh
     docker compose up
     ```
   - Alternatively, open the docker-compose.yml file in VSCode and click the "Run" button
   - The first build may take several minutes as it installs dependencies

4. **Monitor the Application**:
   - View logs in real-time with:
     ```sh
     docker logs -f qrent-backend
     ```
   - The backend will be available at http://localhost:3200

5. **Development Workflow**:
   - Any changes to your code will automatically trigger a restart of the server
   - The container mounts your local files, so changes are reflected immediately
   - API endpoints can be tested while the container is running

### Local Development (Without Docker)

1. **Database Setup**:
   - Install MySQL 8.0+ locally or run it in a Docker container:
     ```sh
     docker run --name mysql -e MYSQL_ROOT_PASSWORD=password -e MYSQL_DATABASE=qrent -p 3306:3306 -d mysql:8
     ```

2. **Install Dependencies**:
   - Navigate to the project root:
     ```sh
     cd qrent
     ```
   - Install all workspace packages:
     ```sh
     pnpm install
     ```
   - When prompted, allow post-install scripts to run

3. **Database Initialization**:
   - Generate Prisma client:
     ```sh
     cd packages/shared
     pnpm db:generate
     ```
   - Apply database schema:
     ```sh
     pnpm db:push
     ```

4. **Start the Development Server**:
   - From the project root:
     ```sh
     pnpm --filter @qrent/backend dev
     ```
   - The server will start on http://localhost:3200

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for our commit messages. This leads to more readable messages that are easy to follow when looking through the project history.

### Format

Each commit message consists of a **header**, a **body**, and a **footer**:

    

