# Festival Management Platform

[![CI](https://github.com/mimi6060/festival/actions/workflows/ci.yml/badge.svg)](https://github.com/mimi6060/festival/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

> A comprehensive, multi-tenant festival management platform designed to handle events from 10,000 to 500,000+ attendees. Built with modern technologies and best practices for scalability, security, and reliability.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Ticketing System**: Multiple ticket categories, QR code generation, real-time validation
- **Payment Processing**: Secure Stripe integration, refunds, invoicing
- **Cashless Payments**: Digital wallet, NFC wristband support, real-time balance
- **Access Control**: Zone management, capacity tracking, staff scanning
- **Staff Management**: Shift scheduling, check-in/out, badge generation
- **Program Management**: Artists, stages, performances, favorites
- **Camping/Accommodation**: Zone booking, spot assignment, vehicle management
- **Vendor Management**: Food & merchandise, inventory, sales tracking
- **Real-time Notifications**: Push notifications, in-app messaging, email
- **Analytics Dashboard**: KPIs, revenue tracking, attendance metrics
- **Multi-language Support**: French, English (extensible)

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend Web** | Next.js 15, React 19, Tailwind CSS, next-intl |
| **Admin Dashboard** | Next.js, React, Recharts, DataTables |
| **Mobile App** | React Native, Expo, AsyncStorage |
| **Backend API** | NestJS, Prisma, PostgreSQL, Redis |
| **Authentication** | JWT, Passport.js, RBAC |
| **Payments** | Stripe Checkout, Webhooks |
| **Real-time** | WebSocket, Socket.io |
| **Email** | Nodemailer, Handlebars templates |
| **PDF Generation** | PDFKit |
| **Monitoring** | Prometheus, Sentry |
| **CI/CD** | GitHub Actions |
| **Infrastructure** | Docker, Kubernetes-ready |

## Architecture

```
festival/
├── apps/
│   ├── api/                 # NestJS Backend API
│   ├── web/                 # Next.js Public Website
│   ├── admin/               # Next.js Admin Dashboard
│   ├── mobile/              # React Native Mobile App
│   └── api-e2e/             # End-to-end tests
├── libs/
│   └── shared/
│       ├── types/           # TypeScript types
│       ├── utils/           # Utility functions
│       ├── constants/       # Shared constants
│       ├── i18n/            # Internationalization
│       ├── validation/      # Zod schemas
│       ├── hooks/           # React hooks
│       └── api-client/      # API client
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── docs/
│   ├── api/                 # API documentation
│   ├── security/            # Security documentation
│   └── compliance/          # GDPR, PCI-DSS docs
└── docker-compose.yml       # Local development
```

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+ (recommended) or npm
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/festival-platform.git
cd festival-platform/festival

# Install dependencies
pnpm install
# or
npm install
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env.development

# Edit .env.development with your values
# Required: DATABASE_URL, JWT_SECRET, STRIPE_SECRET_KEY
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and MailDev
docker-compose up -d

# Verify services are running
docker-compose ps
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with sample data
npx prisma db seed
```

### 5. Start Development Servers

```bash
# Start API server (port 3333)
npx nx serve api

# In another terminal, start web app (port 3000)
npx nx serve web

# In another terminal, start admin dashboard (port 4200)
npx nx serve admin
```

### 6. Access Applications

| Application | URL | Description |
|-------------|-----|-------------|
| API | http://localhost:3333/api | Backend API |
| API Docs | http://localhost:3333/api/docs | Swagger documentation |
| Web | http://localhost:3000 | Public website |
| Admin | http://localhost:4200 | Admin dashboard |
| MailDev | http://localhost:1080 | Email testing UI |

## API Documentation

### Interactive Documentation

The API is fully documented with Swagger/OpenAPI:

- **Swagger UI**: http://localhost:3333/api/docs
- **OpenAPI JSON**: http://localhost:3333/api/docs-json

### API Guide

See [docs/api/API_GUIDE.md](docs/api/API_GUIDE.md) for:
- Authentication flow
- Rate limiting
- Error codes
- Code examples (JavaScript, Python, cURL)

### Webhooks

See [docs/api/WEBHOOKS.md](docs/api/WEBHOOKS.md) for:
- Stripe webhook setup
- Event types and payloads
- Security and signature verification

### Postman Collection

Import the Postman collection for easy API testing:
- Collection: [docs/api/festival-api.postman_collection.json](docs/api/festival-api.postman_collection.json)
- Environment: [docs/api/festival-api.postman_environment.json](docs/api/festival-api.postman_environment.json)

## Main API Endpoints

### Authentication

```
POST /api/auth/register     # Register new user
POST /api/auth/login        # Login, get JWT tokens
POST /api/auth/refresh      # Refresh access token
GET  /api/auth/me           # Get current user
POST /api/auth/logout       # Logout
```

### Festivals

```
GET    /api/festivals           # List festivals
POST   /api/festivals           # Create festival
GET    /api/festivals/:id       # Get festival
PUT    /api/festivals/:id       # Update festival
DELETE /api/festivals/:id       # Delete festival
GET    /api/festivals/:id/stats # Get statistics
```

### Tickets

```
GET  /api/tickets/categories    # List ticket types
POST /api/tickets/purchase      # Buy tickets
GET  /api/tickets/me            # My tickets
POST /api/tickets/validate      # Validate QR code
```

### Cashless

```
GET  /api/cashless/account      # Get balance
POST /api/cashless/topup        # Add funds
POST /api/cashless/pay          # Make payment
GET  /api/cashless/transactions # Transaction history
```

## Environment Variables

Key environment variables (see `.env.example` for full list):

```bash
# Application
NODE_ENV=development
PORT=3333
API_URL=http://localhost:3333

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/festival_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT Authentication
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_REFRESH_EXPIRES_IN=7d

# Stripe Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=localhost
SMTP_PORT=1025

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:4200
```

## Scripts

```bash
# Development
npx nx serve api          # Start API dev server
npx nx serve web          # Start web dev server
npx nx serve admin        # Start admin dev server

# Building
npx nx build api          # Build API for production
npx nx build web          # Build web for production
npx nx build admin        # Build admin for production
npx nx build-all          # Build all apps

# Testing
npx nx test api           # Run API unit tests
npx nx e2e api-e2e        # Run E2E tests
npx nx test --all         # Run all tests

# Database
npx prisma generate       # Generate Prisma client
npx prisma migrate dev    # Run migrations (dev)
npx prisma migrate deploy # Run migrations (prod)
npx prisma db seed        # Seed database
npx prisma studio         # Open Prisma Studio

# Code Quality
npx nx lint --all         # Lint all projects
npx nx format:check       # Check formatting
npx nx format:write       # Fix formatting

# Docker
docker-compose up -d      # Start services
docker-compose down       # Stop services
docker-compose logs -f    # View logs
```

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `ADMIN` | Platform administrator | Full access |
| `ORGANIZER` | Festival organizer | Manage own festivals |
| `STAFF` | Event staff | Scan tickets, zone access |
| `VENDOR` | Food/merch vendor | Manage products, view sales |
| `ATTENDEE` | Festival attendee | Buy tickets, use cashless |

## Security

- **Authentication**: JWT with access/refresh token rotation
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: GDPR compliant, data encryption
- **Payment Security**: PCI-DSS compliant via Stripe
- **API Security**: Rate limiting, CORS, Helmet headers
- **Audit Logging**: All sensitive operations logged

See [docs/security/](docs/security/) for security documentation.

## Deployment

### Docker

```bash
# Build production image
docker build -t festival-api -f Dockerfile .

# Run container
docker run -p 3333:3333 \
  -e DATABASE_URL=... \
  -e REDIS_URL=... \
  festival-api
```

### Kubernetes

Kubernetes manifests are available in `k8s/` directory:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/
```

### Cloud Platforms

- **Vercel**: Web and Admin dashboards
- **Railway/Render**: API server
- **AWS/GCP**: Full infrastructure

## Roadmap

### Q1 2026
- [x] Multi-tenant festival management
- [x] Complete ticketing system with QR codes
- [x] Cashless payment integration
- [x] Admin dashboard with analytics
- [x] Mobile app (iOS/Android)

### Q2 2026
- [ ] Dark/light mode toggle
- [ ] Enhanced offline mode for mobile
- [ ] Multi-currency support
- [ ] Additional language translations (ES, DE, IT)
- [ ] Storybook design system

### Q3 2026
- [ ] AI-powered crowd forecasting
- [ ] Fraud detection system
- [ ] NLP chatbot support
- [ ] Real-time zone heatmaps
- [ ] Artist recommendation engine

### Q4 2026
- [ ] SaaS model with pricing tiers
- [ ] Plugin marketplace
- [ ] White-label customization
- [ ] Advanced reporting and BI

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and write tests
4. Run linting and tests (`npm run lint && npm test`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Code refactoring
- `chore:` - Maintenance

## Testing

```bash
# Unit tests
npx nx test api

# E2E tests
npx nx e2e api-e2e

# Test coverage
npx nx test api --coverage
```

## Monitoring

- **Health Checks**: `/api/health`, `/api/health/live`, `/api/health/ready`
- **Metrics**: `/metrics` (Prometheus format)
- **Error Tracking**: Sentry integration

## Support

- **Documentation**: [docs/](docs/)
- **API Reference**: http://localhost:3333/api/docs
- **Issues**: GitHub Issues

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with NestJS, Next.js, and React Native
