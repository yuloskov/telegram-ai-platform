# CLAUDE.md - AI Assistant Context

This file provides context for AI assistants (Claude, etc.) working on this project.

---

## Project Overview

**AI Telegram Channels Platform** - A web-based platform for managing AI-powered Telegram channels. Users can automate content creation, scraping, and publishing for their Telegram channels.

### Core Value Proposition
- Scrape content from similar channels for inspiration
- Generate original posts using AI (OpenRouter/Gemini)
- Manage scheduling and publishing
- Authenticate via Telegram bot (no email/password)

---

## Architecture

### Monorepo Structure (Turborepo + pnpm)

```
telegram-ai-channels-platform/
├── apps/
│   ├── user-app/           # Next.js 15 (Pages Router) - User interface
│   ├── admin-app/          # Next.js 15 - Admin interface (minimal)
│   └── worker/             # Node.js BullMQ worker for background jobs
├── packages/
│   ├── database/           # Prisma ORM, schema, client
│   ├── shared/             # Shared types, utilities, queue definitions
│   ├── telegram/           # Grammy bot, MTProto client (future)
│   └── ai/                 # OpenRouter integration
├── docker/
│   └── docker-compose.yml  # PostgreSQL, Redis, MinIO
```

### Key Technologies

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS v4 |
| Forms | react-hook-form + zod |
| State | Zustand (client), React Query (server) |
| Database | PostgreSQL 15 + Prisma ORM |
| Queue | BullMQ + Redis |
| Bot | Grammy (Telegram Bot API) |
| AI | OpenRouter (OpenAI-compatible API) |
| Storage | MinIO (S3-compatible) |

---

## Important Files

### Configuration
- `package.json` - Root workspace config
- `turbo.json` - Build pipeline
- `docker/docker-compose.yml` - Development services
- `.env` - Environment variables (see `.env.example`)

### Database
- `packages/database/prisma/schema.prisma` - Database schema
- Run migrations: `pnpm db:push` or `pnpm db:migrate`

### Bot
- `packages/telegram/src/bot/index.ts` - Bot singleton and utilities
- `packages/telegram/src/bot/setup.ts` - Command registration
- `packages/telegram/src/bot/commands/` - Individual command handlers

### API Routes (user-app)
- `src/pages/api/auth/` - Authentication (code, verify, me)
- `src/pages/api/channels/` - Channel CRUD
- `src/pages/api/posts/` - Post CRUD
- `src/pages/api/generate/` - AI generation

### Worker Jobs
- `apps/worker/src/jobs/publish.ts` - Publishing to Telegram
- `apps/worker/src/jobs/notify.ts` - Bot notifications

---

## Common Commands

```bash
# Start development
pnpm install
docker compose -f docker/docker-compose.yml up -d
pnpm db:push
pnpm dev              # All apps in parallel
pnpm dev:user         # User app only (port 3000)
pnpm dev:worker       # Worker only

# Database
pnpm db:studio        # Prisma Studio
pnpm db:push          # Push schema changes
pnpm db:generate      # Generate Prisma client

# Build
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
```

---

## Authentication Flow

1. User clicks "Login with Telegram" on web app
2. API generates 6-char code (expires 5 min)
3. User sends code to platform bot
4. Bot verifies code, creates/links user
5. Web app polls `/api/auth/verify`, receives JWT
6. JWT stored in HTTP-only cookie

**Key files:**
- `apps/user-app/src/pages/api/auth/code.ts` - Generate code
- `apps/user-app/src/pages/api/auth/verify.ts` - Poll for verification
- `packages/telegram/src/bot/commands/auth.ts` - Bot verification

---

## Publishing Flow

1. User creates/generates post (status: `draft`)
2. User clicks "Publish"
3. API creates BullMQ job, status → `publishing`
4. Worker sends via Bot API
5. Success: status → `published`, notification sent
6. Failure: status → `failed`, error notification sent

**Key files:**
- `apps/user-app/src/pages/api/posts/[id]/publish.ts`
- `apps/worker/src/jobs/publish.ts`
- `packages/telegram/src/bot/index.ts` - `sendMessage()`

---

## Bot Commands

| Command | Handler | Description |
|---------|---------|-------------|
| `/start` | `handleStart` | Welcome message |
| `/help` | `handleHelp` | Command reference |
| `/login` | `handleLogin` | Auth instructions |
| `/status` | `handleStatus` | Channel overview |
| `/channels` | `handleChannels` | List channels |
| `/pending` | `handlePending` | Posts for review |
| `/lang` | `handleLang` | Language switcher |

All handlers in `packages/telegram/src/bot/commands/`

---

## Environment Variables

Required in `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/telegram_platform

# Redis
REDIS_URL=redis://localhost:6379

# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token

# AI
OPENROUTER_API_KEY=your_key

# Auth
JWT_SECRET=your_secret

# App
NEXT_PUBLIC_USER_APP_URL=http://localhost:3000
```

---

## Code Conventions

### File Length
- Keep files under ~200 lines
- If a file exceeds this limit, split it into smaller components/functions
- Extract reusable components to `components/` directory
- Pages should primarily compose components, not contain large JSX blocks

### TypeScript
- Strict mode enabled
- Use `type` imports: `import type { Foo } from './foo'`
- Prefer interfaces for object shapes

### Prisma
- Access via `import { prisma } from '@repo/database'`
- Use BigInt for Telegram IDs (`telegramId: BigInt(ctx.from.id)`)

### API Routes
- Use `withAuth` wrapper for protected routes
- Return `{ success: true, data: ... }` or `{ success: false, error: ... }`

### React
- Use React Query for server state
- Use Zustand for client state
- Forms with react-hook-form + zod validation

### Bot
- Use Grammy context typing: `BotContext`
- Access session via `ctx.session.language`
- Translations via `t(lang, 'key')`

---

## Known Issues / TODOs

See `PROGRESS.md` for detailed implementation status.

### Not Yet Implemented
- Web app i18n (only bot has translations)
- MTProto scraping
- Scheduled publishing
- Media upload
- Admin panel
- Channel style analysis (new feature in requirements)

### Technical Debt
- No Dockerfiles for apps yet (dev only)
- Basic error handling in some places
- No tests

---

## Debugging Tips

### Bot not responding
1. Check `TELEGRAM_BOT_TOKEN` is set
2. Bot must be started: check worker logs
3. Webhook may not be set (use polling for dev)

### Publishing fails
1. Verify bot is admin of channel with posting rights
2. Check worker is running: `pnpm dev:worker`
3. Check Redis is running: `docker ps`

### Permissions error
1. Use `/api/channels/verify` to check bot permissions
2. Bot needs `can_post_messages` = true
3. Grammy requires `bot.init()` before accessing `bot.botInfo`

---

## Adding New Features

### New API Route
1. Create file in `apps/user-app/src/pages/api/`
2. Use `withAuth` wrapper if authentication required
3. Define request/response types
4. Add to API types in `packages/shared/src/types/`

### New Bot Command
1. Create handler in `packages/telegram/src/bot/commands/`
2. Export from `commands/index.ts`
3. Register in `setup.ts`
4. Add to `setCommands()` for menu

### New Worker Job
1. Define job type in `packages/shared/src/queues/`
2. Create handler in `apps/worker/src/jobs/`
3. Register processor in `apps/worker/src/index.ts`

---

## Related Documentation

- `requirements.md` - Full requirements document
- `PROGRESS.md` - Implementation status tracker
- `AGENTS.md` - Guidelines for AI agents
