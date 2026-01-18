# AGENTS.md - AI Agent Guidelines

Guidelines for AI agents working on this codebase.

---

## Before You Start

### Required Reading
1. `CLAUDE.md` - Project context and architecture
2. `PROGRESS.md` - What's built vs what's pending
3. `requirements.md` - Full requirements document
4. `DESIGN.md` - UI design system and patterns

### Verify Understanding
- This is a **Turborepo monorepo** with pnpm workspaces
- Main user app is Next.js 15 with **Pages Router** (not App Router)
- Bot uses **Grammy** (not Telegraf or node-telegram-bot-api)
- Database is **Prisma** with PostgreSQL
- Background jobs use **BullMQ** with Redis

---

## CRITICAL: File Length & Decomposition

**This is the #1 rule.** All code must be kept short and focused.

### Hard Limits
- **Maximum ~200 lines per file** - Never exceed this
- **Maximum ~50 lines per function** - Extract if longer
- **Maximum ~100 lines of JSX** - Split into components

### Decomposition Strategies

**For Components:**
```typescript
// BAD: Large monolithic component
export function ChannelPage() {
  // 400 lines of hooks, state, handlers, JSX...
}

// GOOD: Composed from focused pieces
export function ChannelPage() {
  const { channel, posts } = useChannelData();
  return (
    <PageLayout>
      <ChannelHeader channel={channel} />
      <PostList posts={posts} />
      <GeneratorModal />
    </PageLayout>
  );
}
```

**For Functions:**
```typescript
// BAD: One function doing everything
async function handlePublish(postId: string) {
  // 80 lines of validation, API calls, state updates...
}

// GOOD: Split into focused helpers
async function handlePublish(postId: string) {
  const post = await validatePost(postId);
  await submitToQueue(post);
  await notifyUser(post);
}
```

**For API Routes:**
```typescript
// BAD: Everything in one handler
export default async function handler(req, res) {
  // 150 lines handling GET, POST, PUT, DELETE...
}

// GOOD: Separate handlers, composed at export
async function handleGet(req, res) { /* 30 lines */ }
async function handlePost(req, res) { /* 40 lines */ }

export default function handler(req, res) {
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);
}
```

### When to Split
- File approaching 150 lines → Start thinking about splitting
- Function longer than 30 lines → Extract helpers
- Component has multiple responsibilities → Split into sub-components
- Repeated code in 2+ places → Extract to shared utility

---

## Internationalization (i18n)

**ALL user-facing text must be translated.** Never hardcode strings.

### Web App i18n

**Pattern:** Nested messages with React Context

```typescript
// 1. Add translation in messages.ts (BOTH languages!)
// apps/user-app/src/i18n/messages.ts
export const messages = {
  en: {
    channels: {
      title: "Channels",
      addChannel: {
        title: "Add Channel",
        description: "Enter your channel username",
      },
    },
  },
  ru: {
    channels: {
      title: "Каналы",
      addChannel: {
        title: "Добавить канал",
        description: "Введите username канала",
      },
    },
  },
} as const;

// 2. Use in component with useI18n hook
import { useI18n } from "~/i18n";

export function ChannelHeader() {
  const { t } = useI18n();

  return (
    <div>
      <h1>{t("channels.title")}</h1>
      <p>{t("channels.addChannel.description")}</p>
    </div>
  );
}

// 3. With parameters
// messages.ts: postCount: "You have {count} posts"
<span>{t("posts.postCount", { count: 5 })}</span>
```

### Bot i18n

**Pattern:** Flat messages with `t()` function

```typescript
// packages/telegram/src/i18n/index.ts
const messages = {
  en: {
    welcome: "Welcome to the platform!",
    channelAdded: "Channel {name} has been added",
  },
  ru: {
    welcome: "Добро пожаловать на платформу!",
    channelAdded: "Канал {name} добавлен",
  },
} as const;

// Usage in bot commands
import { t, type Language } from "../../i18n/index";

export async function handleStart(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  await ctx.reply(t(lang, "welcome"));
}
```

### Translation Rules
1. **Always add both languages** - Never leave a translation incomplete
2. **Use parameters for dynamic values** - `{count}`, `{name}`, etc.
3. **Group related translations** - Use nesting for organization
4. **Keep keys semantic** - `channels.addChannel.title` not `button1`

---

## Code Style

### TypeScript
```typescript
// Use type imports
import type { Channel, Post } from "@repo/database";
import { prisma } from "@repo/database";

// Prefer interfaces for objects
interface CreatePostRequest {
  channelId: string;
  content: string;
}

// Use explicit return types for public functions
export async function createPost(data: CreatePostRequest): Promise<Post> {
  // ...
}
```

### API Routes
```typescript
// Always use withAuth for protected routes
import { withAuth, type AuthenticatedRequest } from "~/lib/auth";
import type { ApiResponse } from "@repo/shared/types";

async function handler(
  req: AuthenticatedRequest,
  res: NextApiResponse<ApiResponse<YourType>>
) {
  // req.user is available (contains id, telegramId)

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    // Your logic
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

export default withAuth(handler);
```

### Bot Commands
```typescript
import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";

export async function handleYourCommand(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const telegramId = ctx.from?.id;

  if (!telegramId) {
    await ctx.reply(t(lang, "errorOccurred"));
    return;
  }

  // Your logic here
  await ctx.reply("Your message", { parse_mode: "HTML" });
}
```

---

## Package Dependencies

### When Adding Dependencies

**User App** (`apps/user-app/package.json`):
- UI components: Add to `dependencies`
- Build tools: Add to `devDependencies`

**Shared Package** (`packages/shared/package.json`):
- Types and utilities used across apps
- Queue definitions

**If you need BullMQ in user-app:**
```json
"dependencies": {
  "bullmq": "^5.34.8",
  "ioredis": "^5.4.2"
}
```

### Package Imports
```typescript
// From shared package
import { JobType, QueueName } from "@repo/shared/queues";
import type { ApiResponse } from "@repo/shared/types";

// From database package
import { prisma } from "@repo/database";
import type { Channel, Post } from "@repo/database";

// From telegram-bot package (lightweight - grammy only)
import { sendMessage, getBot, t } from "@repo/telegram-bot";

// From telegram-mtproto package (heavy - for scraping, worker only)
// import { getMTProtoClient, scrapeChannelMessages } from "@repo/telegram-mtproto";

// From ai package
import { generateFromPrompt } from "@repo/ai";

// From i18n (web app)
import { useI18n } from "~/i18n";
```

---

## Common Pitfalls

### 1. BigInt for Telegram IDs
```typescript
// WRONG - Telegram IDs can exceed Number.MAX_SAFE_INTEGER
const user = await prisma.user.findUnique({
  where: { telegramId: ctx.from.id }  // Might work, might not
});

// CORRECT - Always use BigInt
const user = await prisma.user.findUnique({
  where: { telegramId: BigInt(ctx.from.id) }
});
```

### 2. Hardcoded Strings
```typescript
// WRONG - Not translatable
<button>Save Changes</button>

// CORRECT - Uses translation
const { t } = useI18n();
<button>{t("common.saveChanges")}</button>
```

### 3. API Response Format
```typescript
// WRONG - Inconsistent format
res.json({ data: result });
res.json({ error: "Something failed" });

// CORRECT - Always use ApiResponse format
res.json({ success: true, data: result });
res.json({ success: false, error: "Something failed" });
```

### 4. Large Files
```typescript
// WRONG - Single file with everything
// components/channel-page.tsx (500 lines)

// CORRECT - Split into focused components
// components/channels/channel-page.tsx (100 lines)
// components/channels/channel-header.tsx (50 lines)
// components/channels/channel-stats.tsx (60 lines)
// components/posts/post-list.tsx (80 lines)
```

---

## Testing Changes

### Before Committing
1. `pnpm typecheck` - No TypeScript errors
2. `pnpm build` - Builds successfully
3. Test the feature manually:
   - Start services: `docker compose -f docker/docker-compose.yml up -d`
   - Start apps: `pnpm dev`
   - Test in browser at `http://localhost:3000`

### Testing Bot Commands
1. Ensure worker is running: `pnpm dev:worker`
2. Send command to bot in Telegram
3. Check worker logs for errors

### Testing Publishing
1. Create/verify a test channel
2. Ensure bot is admin with posting rights
3. Create a post and publish
4. Check Telegram channel for message

---

## Adding New Features

### New API Endpoint
1. Create file in `apps/user-app/src/pages/api/`
2. Use `withAuth` wrapper
3. Follow ApiResponse format
4. **Keep under 200 lines** - split handlers if needed

### New Bot Command
1. Create handler in `packages/telegram/src/bot/commands/`
2. **Add translations to both en and ru** in `packages/telegram/src/i18n/index.ts`
3. Export from `commands/index.ts`
4. Register in `setup.ts`
5. Add to `setCommands()` for menu

### New Worker Job
1. Define job type in `packages/shared/src/queues/types.ts`
2. Create handler in `apps/worker/src/jobs/`
3. Register in `apps/worker/src/index.ts`
4. Enqueue from API or another job

### New Database Table
1. Update schema: `packages/database/prisma/schema.prisma`
2. Run: `pnpm db:push` (dev) or `pnpm db:migrate` (production)
3. Regenerate client: `pnpm db:generate`

### New UI Component
1. Determine location:
   - Reusable primitive → `src/components/ui/`
   - Feature-specific → `src/components/{feature}/`
2. **Keep under 200 lines**
3. **Add translations** for all user-facing text
4. Export from feature's `index.ts`

### Adding Translations
1. Add to `apps/user-app/src/i18n/messages.ts` (both en and ru)
2. Use `const { t } = useI18n()` in component
3. Access via dot notation: `t("section.key")`

---

## File Locations Quick Reference

| What | Where |
|------|-------|
| API routes | `apps/user-app/src/pages/api/` |
| React pages | `apps/user-app/src/pages/` |
| React components | `apps/user-app/src/components/` |
| React hooks | `apps/user-app/src/hooks/` |
| Web translations | `apps/user-app/src/i18n/messages.ts` |
| Bot commands | `packages/telegram/src/bot/commands/` |
| Bot translations | `packages/telegram/src/i18n/index.ts` |
| Worker jobs | `apps/worker/src/jobs/` |
| Shared types | `packages/shared/src/types/` |
| Queue definitions | `packages/shared/src/queues/` |
| Database schema | `packages/database/prisma/schema.prisma` |
| AI generation | `packages/ai/src/` |

---

## Debugging

### Check Logs
```bash
# All apps
pnpm dev

# Watch worker specifically
pnpm dev:worker

# Check Docker services
docker compose -f docker/docker-compose.yml logs -f
```

### Database Issues
```bash
# Reset database
pnpm db:push --force-reset

# Open Prisma Studio
pnpm db:studio
```

### Bot Issues
- Check `TELEGRAM_BOT_TOKEN` in `.env`
- Verify bot is started (check worker logs)
- Test with `/start` command first

---

## Questions to Ask Before Implementing

1. **Does this feature exist?** Check `PROGRESS.md`
2. **Is there a related requirement?** Check `requirements.md`
3. **What package should this go in?** See architecture in `CLAUDE.md`
4. **Does this need authentication?** Use `withAuth` wrapper
5. **Does this need background processing?** Use BullMQ job
6. **Does this need translations?** Add to both en and ru
7. **Is the file getting too long?** Split it before it exceeds 200 lines

---

## Update These Files

When you complete work:
1. Update `PROGRESS.md` with new completion status
2. Update `CLAUDE.md` if architecture changes
3. Keep this file current with new patterns/conventions
