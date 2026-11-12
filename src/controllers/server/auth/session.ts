import "server-only";
import { createHmac, createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const derive = promisify(scrypt);
export const SESSION_COOKIE = "tpt-owner-session";
export const SESSION_AGE = 60 * 60 * 24 * 30;
export const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export const ownerId = createHash("sha256").update("the-personalized-news-owner").digest("hex");
export function configured() { return !!(process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD_HASH && process.env.OWNER_SESSION_SECRET); }
function signature(value: string) {
  // Binding sessions to the credential hash also revokes them after a password change.
  return createHmac("sha256", process.env.OWNER_SESSION_SECRET!).update(`${value}:${process.env.OWNER_PASSWORD_HASH}`).digest("hex");
}
export async function isOwner() {
  if (!configured()) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  const match = /^(\d{10})\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const expires = Number(match[1]);
  const now = Math.floor(Date.now() / 1000);
  if (expires <= now || expires > now + SESSION_AGE) return false;
  return timingSafeEqual(Buffer.from(match[3], "hex"), Buffer.from(signature(`${match[1]}.${match[2]}`), "hex"));
}
export async function verifyCredentials(email: string, password: string) {
  if (!configured()) return false;
  const [salt, expected] = process.env.OWNER_PASSWORD_HASH!.split(":");
  if (!salt || !expected || !/^[a-f0-9]{128}$/.test(expected)) return false;
  const actual = await derive(password, salt, 64) as Buffer;
  const emailHash = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest();
  const emailMatches = timingSafeEqual(emailHash(email), emailHash(process.env.OWNER_EMAIL!));
  return timingSafeEqual(actual, Buffer.from(expected, "hex")) && emailMatches;
}
export async function startSession() {
  const value = `${Math.floor(Date.now() / 1000) + SESSION_AGE}.${randomBytes(16).toString("hex")}`;
  (await cookies()).set(SESSION_COOKIE, `${value}.${signature(value)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: SESSION_AGE,
  });
}
