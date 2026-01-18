import { customAlphabet } from "nanoid";
import { AUTH_CODE_EXPIRY_MINUTES, AUTH_CODE_LENGTH } from "../constants";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateCode = customAlphabet(alphabet, AUTH_CODE_LENGTH);

export function createAuthCode(): string {
  return generateCode();
}

export function getAuthCodeExpiry(): Date {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + AUTH_CODE_EXPIRY_MINUTES);
  return expiry;
}

export function isAuthCodeExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

export function normalizeAuthCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
