import type { BotContext } from "../index";
import { t, type Language } from "../../i18n/index";
import { prisma } from "@repo/database";
import { normalizeAuthCode, isAuthCodeExpired } from "@repo/shared/auth";

export async function handleAuthCode(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const telegramId = ctx.from?.id;
  const text = ctx.message?.text;

  if (!telegramId || !text) {
    return;
  }

  // Normalize the code (uppercase, remove spaces)
  const code = normalizeAuthCode(text.trim());

  // Check if it looks like an auth code (6 alphanumeric characters)
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return; // Not an auth code, let other handlers process it
  }

  // Look up the auth code
  const authCode = await prisma.authCode.findUnique({
    where: { code },
  });

  if (!authCode) {
    await ctx.reply(t(lang, "loginFailed"));
    return;
  }

  if (authCode.used) {
    await ctx.reply(t(lang, "loginAlreadyUsed"));
    return;
  }

  if (isAuthCodeExpired(authCode.expiresAt)) {
    await ctx.reply(t(lang, "loginExpired"));
    return;
  }

  // Get or create user
  let user = await prisma.user.findUnique({
    where: { telegramId: BigInt(telegramId) },
  });

  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        telegramId: BigInt(telegramId),
        username: ctx.from?.username,
        displayName: ctx.from?.first_name,
        language: lang,
      },
    });
  } else {
    // Update existing user info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        username: ctx.from?.username,
        displayName: ctx.from?.first_name,
      },
    });
  }

  // Mark auth code as used and link to user
  await prisma.authCode.update({
    where: { id: authCode.id },
    data: {
      used: true,
      userId: user.id,
    },
  });

  // Update session language to user's preference
  ctx.session.language = user.language;

  await ctx.reply(t(user.language as Language, "loginSuccess"));
}

export async function handleLogin(ctx: BotContext): Promise<void> {
  const lang = (ctx.session.language ?? "en") as Language;
  const appUrl = process.env.NEXT_PUBLIC_USER_APP_URL ?? "http://localhost:3000";

  await ctx.reply(
    `To login, please visit:\n\n${appUrl}/login\n\n${t(lang, "loginPrompt")}`,
    { parse_mode: "HTML" }
  );
}
