<div align="center">
  <img alt="QRent logo" src="./packages/frontend/public/qrent-logo.svg" height="128">
  <h1>QRent</h1>

<a href="https://www.qrent.rent"><img alt="Website" src="https://img.shields.io/badge/website-qrent.rent-blue?style=for-the-badge"></a>
<a href="https://github.com/wiperi/qrent/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/license-NCL%201.0-orange?style=for-the-badge"></a>
<a href="https://github.com/wiperi/qrent/issues"><img alt="Issues" src="https://img.shields.io/github/issues/wiperi/qrent?style=for-the-badge"></a>

</div>

English | [简体中文](./README_CN.md)

## About QRent

QRent is an AI-powered rental platform built for international students in Australia. It helps students find housing smarter and faster by analyzing commute time, budget, and area data to recommend the most suitable rentals — all in one place.

## Our Growth

This year, we achieved **4.2K active users** and over **10K page views**. During peak rental season, our DAU reached **200+** and MAU reached **1,500+**.

<div align="center">
<img src="./doc/dau-google-analytics.png" alt="Daily Active Users" width="800">

<img src="./doc/mau-cloud-flare.png" alt="Monthly Active Users" width="800">
</div>

## Key Features

- **AI-Driven Recommendation System**: From an international student's perspective, we score and recommend properties based on commute time, budget, lifestyle, and rental success rate. Next, we'll focus on building an agentic-assisted rental experience to minimize housing difficulties caused by information asymmetry.

- **Tailored Experience**: We specialize in providing customized information services for international students in Australia, ensuring every user finds the most suitable accommodation. We will continue to expand our service offerings with the goal of providing end-to-end solutions.

- **Smart Filtering**: Through intelligent search and filtering options, users can quickly narrow down property listings based on their school location and find the most suitable options.

- **All-in-One Experience**: We aggregate quality rental listings from across the web, allowing users to compare, filter, and book on a single platform without switching between multiple websites. We will continue to expand property sources to enhance user experience.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 20 or higher
- **pnpm** 8 or higher
- **Docker** (optional, for running backend dependent services)

You have two main options for development based on your needs.

### Option 1: Frontend Development Only

This option uses the production backend API, perfect for frontend-only development.

1. **Configure environment**:
   Create a `.env` file in the project root and fill in. So frontend will use the online backend API.:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=https://api.qrent.rent
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Build the frontend**:
   ```bash
   pnpm --filter packages/frontend build # same effect as cd packages/frontend && pnpm build
   ```

   > This will first generate Prisma client code, build the backend project, then build the frontend to obtain the tRPC type information.

4. **Run the development server**:
   ```bash
   pnpm --filter packages/frontend dev
   ```

### Option 2: Full Stack Development

This option runs both frontend and backend locally.

1. **Configure environment**:
   Create a `.env` file in the project root and configure backend-related fields. See `.env.example` for reference:
   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and fill in database, backend and redis related fields at minimum.

2. **Start backend services**:

   **With Docker**:
   ```bash
   docker compose up -d db redis
   ```

   > Start all services except the backend service itself, those are backend dependent services.

   **Without Docker**:
   Manually install and start all services defined in `docker-compose.yml` except the backend service, then configure their connection details in `.env`.

3. **Install dependencies**:
   ```bash
   pnpm install
   ```

4. **Generate Prisma client**:
   ```bash
   pnpm --filter packages/shared db:generate # Generate Prisma client code and type definitions
   pnpm --filter packages/shared db:push # Synchronize schema to database
   ```

5. **Run the backend**:
   ```bash
   pnpm --filter packages/backend dev
   ```

   If successful, you should see:
   ```
   > @qrent/backend@1.0.0 dev /home/wiperi/qrent/packages/backend
   > NODE_ENV=development ts-node-dev -r tsconfig-paths/register -T src/server.ts

   [INFO] 00:19:50 ts-node-dev ver. 2.0.0 (using ts-node ver. 10.9.2, typescript ver. 5.8.2)
   🔄 Loading: /home/wiperi/qrent/.env
   ⚡️ Server started on port 3201 at 0.0.0.0
   You have 0 users in your database
   You have 0 properties in your database
   ```

6. **Run the frontend** (in a new terminal):
   ```bash
   pnpm --filter packages/frontend dev
   ```

Check out terminal outputs for port numbers of both backend and frontend.

## Documentation

- **[API Documentation](https://0gqqgjlydk.apifox.cn)** - Backend API reference (REST Version, Same effect as tRPC)

## Community

We welcome contributions and discussions from the community!

- **Report Issues**: Found a bug? [Open an issue](https://github.com/wiperi/qrent/issues)
- **Discussions**: Have questions or ideas? Start a [discussion](https://github.com/wiperi/qrent/discussions)
- **Email**: For partnership or general inquiries, contact us at this [email](mailto:solidtreepassing@gmail.com)

## Contributing

Contributions to QRent are welcome! We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages.

### Commit Message Format

Each commit message consists of a **type**, **scope** (optional), and **subject**:

```
<type>(<scope>): <subject>

Examples:
feat(frontend): add property comparison feature
fix(backend): resolve JWT token expiration issue
docs: update README with new setup instructions
chore(deps): update dependencies
```

### Common Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks, dependency updates

### Good First Issues

New to the project? Check out issues labeled [`good first issue`](https://github.com/wiperi/qrent/labels/good%20first%20issue) - these are great starting points for newcomers to get familiar with the codebase.

Before contributing, please:
1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes following the commit message format
4. Push to your branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## Tech Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS v4, tRPC
- **Backend**: Node.js, Express, tRPC, Prisma ORM
- **Database**: MySQL 8.0
- **Cache**: Redis
- **Scraper**: Python with Playwright
- **Monorepo**: pnpm workspaces

## License

This project is licensed under the **Non-Commercial License (NCL 1.0)**.

You may use, copy, modify, and distribute the code for non-commercial purposes. Any commercial use requires a separate commercial license from the maintainers. See [LICENSE](./LICENSE) for details.


---

<div align="center">
Made with ❤️ for international students in Australia
</div>
