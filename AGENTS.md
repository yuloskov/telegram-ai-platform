# AGENTS.md - AI Agent Guidelines

Guidelines for AI agents working on this codebase.

---

## Before You Start

### Required Reading
1. `CLAUDE.md` - Project context and architecture
2. `PROGRESS.md` - What's built vs what's pending
3. `requirements.md` - Full requirements document

### Verify Understanding
- This is a **Turborepo monorepo** with pnpm workspaces
- Main user app is Next.js 15 with **Pages Router** (not App Router)
- Bot uses **Grammy** (not Telegraf or node-telegram-bot-api)
- Database is **Prisma** with PostgreSQL
- Background jobs use **BullMQ** with Redis

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

// From telegram package
import { sendMessage, getBot } from "@repo/telegram/bot";
import { t } from "@repo/telegram/i18n";

// From ai package
import { generateFromPrompt } from "@repo/ai";
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

### 2. Module Extensions
```typescript
// WRONG - Don't use .js extensions in imports
import { foo } from "./bar.js";

// CORRECT - No extensions
import { foo } from "./bar";
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
1. Create file: `apps/user-app/src/pages/api/your-feature/index.ts`
2. Add types to `packages/shared/src/types/`
3. Use `withAuth` wrapper
4. Follow ApiResponse format

### New Bot Command
1. Create handler: `packages/telegram/src/bot/commands/yourcommand.ts`
2. Add translations: `packages/telegram/src/i18n/en.ts` and `ru.ts`
3. Export from: `packages/telegram/src/bot/commands/index.ts`
4. Register in: `packages/telegram/src/bot/setup.ts`
5. Add to menu in `setCommands()`

### New Worker Job
1. Add job type: `packages/shared/src/queues/types.ts`
2. Create handler: `apps/worker/src/jobs/yourjob.ts`
3. Register in: `apps/worker/src/index.ts`
4. Enqueue from API or another job

### New Database Table
1. Update schema: `packages/database/prisma/schema.prisma`
2. Run: `pnpm db:push` (dev) or `pnpm db:migrate` (production)
3. Regenerate client: `pnpm db:generate`

---

## File Locations Quick Reference

| What | Where |
|------|-------|
| API routes | `apps/user-app/src/pages/api/` |
| React pages | `apps/user-app/src/pages/` |
| React components | `apps/user-app/src/components/` |
| React hooks | `apps/user-app/src/hooks/` |
| Bot commands | `packages/telegram/src/bot/commands/` |
| Bot translations | `packages/telegram/src/i18n/` |
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
6. **Does this need translations?** Add to both en.ts and ru.ts

---

## Update These Files

When you complete work:
1. Update `PROGRESS.md` with new completion status
2. Update `CLAUDE.md` if architecture changes
3. Keep this file current with new patterns/conventions
