# Contributing to Festival Management Platform

Thank you for your interest in contributing! This guide will help you get started.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) to maintain a welcoming environment.

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+ (recommended) or npm
- Docker & Docker Compose
- Git

### Development Setup

1. **Fork and clone the repository**

```bash
git clone https://github.com/YOUR_USERNAME/festival.git
cd festival
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Setup environment**

```bash
cp .env.example .env.development
# Edit .env.development with your local settings
```

4. **Start infrastructure**

```bash
docker-compose up -d
```

5. **Setup database**

```bash
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

6. **Start development servers**

```bash
# Start API
npx nx serve api

# In another terminal, start web
npx nx serve web

# In another terminal, start admin
npx nx serve admin
```

## Development Workflow

### Branch Naming

Use descriptive branch names:

- `feature/add-dark-mode` - New feature
- `fix/ticket-validation-error` - Bug fix
- `docs/update-api-guide` - Documentation
- `refactor/optimize-queries` - Refactoring
- `test/add-cashless-tests` - Tests

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style (formatting, semicolons)
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance, dependencies

**Examples:**

```bash
feat(tickets): add bulk ticket purchase
fix(cashless): correct balance calculation
docs(api): update authentication guide
test(auth): add login service tests
```

### Code Style

- **TypeScript** - Strict mode enabled
- **ESLint** - Airbnb config with TypeScript
- **Prettier** - Default settings

Run before committing:

```bash
npm run lint
npm run format:check
```

### Testing

Write tests for all new features:

```bash
# Run unit tests
npx nx test api

# Run specific test file
npx nx test api --testFile=auth.service.spec.ts

# Run with coverage
npx nx test api --coverage

# Run E2E tests
npx nx e2e api-e2e
```

**Coverage requirements:**
- Minimum 80% overall
- Critical services (auth, tickets, cashless, payments): 85%

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run the test suite**
4. **Run linting**
5. **Update CHANGELOG.md** if applicable

### PR Guidelines

1. **Title**: Use conventional commit format
   - `feat(tickets): add bulk purchase feature`

2. **Description**: Include:
   - What changes were made
   - Why the changes were made
   - How to test the changes
   - Screenshots (if UI changes)

3. **Size**: Keep PRs small and focused
   - Aim for < 400 lines changed
   - Split large features into smaller PRs

### Review Process

1. At least one approval required
2. All CI checks must pass
3. No merge conflicts
4. Squash commits on merge

## Project Structure

```
festival/
├── apps/
│   ├── api/              # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/  # Feature modules
│   │   │   ├── common/   # Shared code
│   │   │   └── test/     # Test utilities
│   │   └── ...
│   ├── web/              # Next.js Public Site
│   ├── admin/            # Next.js Admin Dashboard
│   ├── mobile/           # React Native App
│   └── api-e2e/          # E2E Tests
├── libs/shared/
│   ├── types/            # TypeScript types
│   ├── utils/            # Utility functions
│   ├── constants/        # Shared constants
│   ├── validation/       # Zod schemas
│   └── hooks/            # React hooks
├── prisma/               # Database schema
├── docs/                 # Documentation
└── k8s/                  # Kubernetes configs
```

## API Development

### Creating a New Module

1. Create module structure:

```
apps/api/src/modules/your-module/
├── dto/
│   ├── create-item.dto.ts
│   ├── update-item.dto.ts
│   └── index.ts
├── your-module.controller.ts
├── your-module.service.ts
├── your-module.service.spec.ts
├── your-module.module.ts
└── index.ts
```

2. Add to app.module.ts imports
3. Add Swagger decorators
4. Write unit tests

### Database Changes

1. Modify `prisma/schema.prisma`
2. Create migration: `npx prisma migrate dev --name your-migration`
3. Update seed data if needed
4. Generate client: `npx prisma generate`

## Frontend Development

### Component Guidelines

- Use functional components with hooks
- TypeScript for all components
- Co-locate tests with components
- Use Tailwind CSS for styling

### Mobile Development

```bash
# Start Metro bundler
cd apps/mobile
npx expo start

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android
```

## Need Help?

- **Questions**: Open a GitHub Discussion
- **Bugs**: Create an Issue with reproduction steps
- **Ideas**: Open a Feature Request issue

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes

Thank you for contributing!
