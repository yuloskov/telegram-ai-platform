import * as jose from "jose";
import type { JWTPayload } from "../types";
import { JWT_ADMIN_EXPIRY, JWT_EXPIRY } from "../constants";

let secretKey: Uint8Array | null = null;

function getSecretKey(): Uint8Array {
  if (secretKey) return secretKey;

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  secretKey = new TextEncoder().encode(secret);
  return secretKey;
}

export async function signJWT(
  payload: Omit<JWTPayload, "iat" | "exp">,
  options?: { expiresIn?: string }
): Promise<string> {
  const expiry = options?.expiresIn ?? (payload.type === "admin" ? JWT_ADMIN_EXPIRY : JWT_EXPIRY);

  const token = await new jose.SignJWT(payload as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(getSecretKey());

  return token;
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getSecretKey());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function decodeJWT(token: string): Promise<JWTPayload | null> {
  try {
    const decoded = jose.decodeJwt(token);
    return decoded as unknown as JWTPayload;
  } catch {
    return null;
  }
}
