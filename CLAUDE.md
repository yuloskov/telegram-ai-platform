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
│   ├── bot/                # Telegram bot standalone app
│   └── worker/             # Node.js BullMQ worker for background jobs
├── packages/
│   ├── database/           # Prisma ORM, schema, client
│   ├── shared/             # Shared types, utilities, queue definitions
│   ├── telegram/           # Grammy bot, Telegram utilities
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

## Code Conventions

### CRITICAL: File Length & Decomposition

**This is the most important convention.** Keep all files short and focused:

- **Maximum ~200 lines per file** - This is a hard limit
- **Split large files immediately** - Don't wait until they're too big
- **Extract functions** - If a function is getting long, split it into smaller functions
- **Extract components** - Pages should compose components, not contain large JSX blocks
- **One responsibility per file** - If a file does multiple things, split it

**Why this matters:**
- Easier to understand and maintain
- Better for AI assistants to work with
- Clearer git diffs
- Encourages reusability

**How to decompose:**
```typescript
// BAD: One large component with everything
export function ChannelPage() {
  // 300 lines of JSX, hooks, handlers...
}

// GOOD: Composed from smaller pieces
export function ChannelPage() {
  return (
    <PageLayout>
      <ChannelHeader channel={channel} />
      <PostList posts={posts} onPublish={handlePublish} />
      <GeneratorModal isOpen={isOpen} onGenerate={handleGenerate} />
    </PageLayout>
  );
}
```

### TypeScript
- Strict mode enabled
- Use `type` imports: `import type { Foo } from './foo'`
- Prefer interfaces for object shapes
- Explicit return types for public functions

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

## Internationalization (i18n)

The platform supports English (en) and Russian (ru) with full i18n coverage.

### Web App i18n

**Location:** `apps/user-app/src/i18n/`

**Pattern:** Nested message structure with React Context + hooks

```typescript
// messages.ts - Nested message definitions
export const messages = {
  en: {
    common: { loading: "Loading...", error: "Error" },
    auth: { pageTitle: "Login", loginTitle: "Sign in" },
    channels: { title: "Channels", addChannel: { title: "Add Channel" } },
  },
  ru: { /* Russian translations */ },
} as const;

// context.tsx - Provider and hook
export function I18nProvider({ children }) {
  const router = useRouter();
  const language = (router.locale || "en") as Language;

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    // Returns translated string with parameter interpolation
  };

  return <I18nContext.Provider value={{ language, t, setLanguage }}>{children}</I18nContext.Provider>;
}

// Usage in components
const { t } = useI18n();
<h1>{t("channels.title")}</h1>
<p>{t("posts.noPostsDescription")}</p>
```

**Key files:**
- `apps/user-app/src/i18n/messages.ts` - All translations
- `apps/user-app/src/i18n/context.tsx` - Provider and `useI18n` hook
- `apps/user-app/src/i18n/index.ts` - Public exports

**Next.js i18n config in `next.config.js`:**
```javascript
i18n: {
  locales: ["en", "ru"],
  defaultLocale: "en",
},
```

### Bot i18n

**Location:** `packages/telegram/src/i18n/`

**Pattern:** Flat message object with `t()` function

```typescript
// packages/telegram/src/i18n/index.ts
const messages = {
  en: {
    welcome: "Welcome!",
    scrapingComplete: "Scraping complete: {count} posts found",
    reviewButtons: { approve: "Approve", edit: "Edit", reject: "Reject" },
  },
  ru: { /* Russian translations */ },
} as const;

export function t(lang: Language, key: MessageKey, params?: Record<string, string | number>): string {
  const message = messages[lang]?.[key] ?? messages.en[key];
  // Interpolate params: {count} -> value
  return interpolated;
}

// Usage in bot handlers
const lang = (ctx.session.language ?? "en") as Language;
await ctx.reply(t(lang, "welcome"));
await ctx.reply(t(lang, "scrapingComplete", { count: 5 }));
```

### Adding New Translations

1. **Web app:** Add to both `en` and `ru` objects in `messages.ts`
2. **Bot:** Add to both language objects in `packages/telegram/src/i18n/index.ts`
3. **Always add both languages** - Don't leave translations incomplete

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
- `src/pages/api/user/` - User settings (language)

### Worker Jobs
- `apps/worker/src/jobs/publish.ts` - Publishing to Telegram
- `apps/worker/src/jobs/notify.ts` - Bot notifications

### Web App Components
- `src/components/ui/` - Reusable UI primitives (Card, Button, Input, etc.)
- `src/components/layout/` - Page layouts, headers
- `src/components/channels/` - Channel-specific components
- `src/components/posts/` - Post-specific components
- `src/components/auth/` - Authentication components

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

## Established Patterns

### Component Decomposition Pattern

```
apps/user-app/src/components/
├── ui/                 # Primitives (Card, Button, Input, Modal, Spinner)
├── layout/             # PageLayout, Header, PageHeader, Section
├── telegram/           # MessageBubble, ChannelAvatar
├── auth/               # LoginCard, AuthCodeDisplay
├── channels/           # ChannelCard, ChannelList, ChannelForm
└── posts/              # PostList, PostEditor, PostPreview
```

### API Response Pattern

```typescript
// Always return this format
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

res.status(200).json({ success: true, data: result });
res.status(400).json({ success: false, error: "Validation failed" });
```

### Zod Validation Pattern

```typescript
const CreateChannelSchema = z.object({
  telegramId: z.union([z.string(), z.number()]).transform((val) => BigInt(val)),
  title: z.string().min(1),
  tone: z.enum(["professional", "casual", "humorous"]),
});

const parseResult = CreateChannelSchema.safeParse(req.body);
if (!parseResult.success) {
  return res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
}
```

### React Query + Zustand Pattern

```typescript
// Server state (React Query)
const { data: channels, isLoading } = useQuery({
  queryKey: ["channels"],
  queryFn: fetchChannels,
});

// Client state (Zustand)
const { user, setAuth, logout } = useAuthStore();
```

---

## Known Issues / TODOs

See `PROGRESS.md` for detailed implementation status.

### Not Yet Implemented
- MTProto scraping
- Scheduled publishing
- Media upload
- Admin panel
- Channel style analysis

### Technical Debt
- No Dockerfiles for apps yet (dev only)
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
5. **Add translations to both en and ru**

### New Worker Job
1. Define job type in `packages/shared/src/queues/`
2. Create handler in `apps/worker/src/jobs/`
3. Register processor in `apps/worker/src/index.ts`

### New UI Component
1. If reusable primitive → `src/components/ui/`
2. If feature-specific → `src/components/{feature}/`
3. **Keep under 200 lines**
4. Extract sub-components as needed

### Adding Translations
1. Add key to `apps/user-app/src/i18n/messages.ts` (both en and ru)
2. Use `const { t } = useI18n()` in component
3. Access via dot notation: `t("section.subsection.key")`

---

## Related Documentation

- `requirements.md` - Full requirements document
- `PROGRESS.md` - Implementation status tracker
- `AGENTS.md` - Guidelines for AI agents
- `DESIGN.md` - Design system and UI guidelines
