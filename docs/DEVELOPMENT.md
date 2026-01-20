# Development Guide

Quick start guide for running the Festival Platform locally.

## Prerequisites

- **Node.js** 20+ and npm
- **Docker Desktop** (for database and services)
- Optional: `kubectl` + `minikube`/`kind` for Kubernetes mode

## Quick Start

```bash
# 1. Clone and install
git clone <repository>
cd festival
npm install

# 2. Setup environment
cp .env.example .env.development

# 3. Start everything (interactive menu)
./scripts/start.sh

# Or directly:
./scripts/start.sh docker   # Docker Compose mode
./scripts/start.sh local    # Local dev servers
```

## Start Script Commands

| Command                          | Description                                        |
| -------------------------------- | -------------------------------------------------- |
| `./scripts/start.sh`             | Interactive menu                                   |
| `./scripts/start.sh docker`      | Start core services (PostgreSQL, Redis, MinIO)     |
| `./scripts/start.sh docker full` | Start all services including Prometheus + Grafana  |
| `./scripts/start.sh k8s`         | Start with Kubernetes (uses Skaffold if available) |
| `./scripts/start.sh local`       | Start local dev servers via NX (fastest iteration) |
| `./scripts/start.sh status`      | Show service status dashboard                      |
| `./scripts/start.sh stop`        | Stop all services                                  |
| `./scripts/start.sh logs`        | Tail service logs                                  |
| `./scripts/start.sh help`        | Show help message                                  |

## Port Reference

| Service         | Port | URL                             |
| --------------- | ---- | ------------------------------- |
| API (NestJS)    | 3333 | http://localhost:3333/api/docs  |
| Web (Next.js)   | 3000 | http://localhost:3000           |
| Admin (Next.js) | 4201 | http://localhost:4201           |
| Mobile (Expo)   | 8081 | exp://localhost:8081            |
| PostgreSQL      | 5432 | -                               |
| Redis           | 6379 | -                               |
| MinIO Storage   | 9000 | http://localhost:9001 (console) |
| MailHog         | 8025 | http://localhost:8025           |
| Prometheus      | 9090 | http://localhost:9090           |
| Grafana         | 3001 | http://localhost:3001           |

## Development Modes

### Docker Compose (Recommended for full stack)

Starts all infrastructure in containers:

```bash
./scripts/start.sh docker

# With monitoring (Prometheus + Grafana)
./scripts/start.sh docker full
```

### Local Dev (Fastest iteration)

Runs Node servers locally with Docker for databases:

```bash
./scripts/start.sh local
```

This starts:

- Docker containers for PostgreSQL, Redis, MinIO
- NX serve for API, Web, and Admin apps

### Kubernetes (Production-like)

For testing Kubernetes deployments locally:

```bash
./scripts/start.sh k8s
```

Supports: Minikube, Kind, Docker Desktop Kubernetes.
Uses Skaffold for hot-reload if available.

## Manual Commands

If you prefer running services individually:

```bash
# Start infrastructure
docker compose up -d postgres redis minio

# Run migrations
npx prisma generate
npx prisma db push

# Start individual apps
npx nx serve api      # API on :3333
npx nx serve web      # Web on :3000
npx nx serve admin    # Admin on :4201

# Mobile
cd apps/mobile && npx expo start
```

## Troubleshooting

### Docker not running

```
[ERROR] Docker is not running!
```

Start Docker Desktop and try again.

### Port already in use

Check what's using the port:

```bash
lsof -i :3333   # Replace with the port number
```

Kill the process or stop the conflicting service.

### Database connection failed

Ensure PostgreSQL is running:

```bash
docker compose ps
docker compose up -d postgres
```

Check your `.env.development` has correct `DATABASE_URL`.

### Prisma issues

Regenerate the client:

```bash
npx prisma generate
npx prisma db push --accept-data-loss  # Dev only!
```

### Services not starting

Check the status dashboard:

```bash
./scripts/start.sh status
```

View logs for specific errors:

```bash
./scripts/start.sh logs
docker compose logs api
```

### Kubernetes port-forward issues

Kill existing port-forwards:

```bash
pkill -f "kubectl port-forward"
```

Then restart:

```bash
./scripts/start.sh k8s
```

## Test Credentials

After seeding (`npx prisma db seed`):

| Role      | Email                    | Password      |
| --------- | ------------------------ | ------------- |
| Admin     | admin@festival.fr        | Festival2025! |
| Organizer | organisateur@festival.fr | Festival2025! |
| User      | user@festival.fr         | Festival2025! |

## Verification

After starting, verify services are running:

```bash
# API health check
curl -s http://localhost:3333/api/health

# Web
curl -s http://localhost:3000 | head -1

# Admin
curl -s http://localhost:4201 | head -1
```

## See Also

- [API Documentation](./api/API_GUIDE.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Kubernetes Deployment](./KUBERNETES_DEPLOYMENT.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
