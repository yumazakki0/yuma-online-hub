const crypto = require("node:crypto");
const { sendJson } = require("./http");

const COOKIE_NAME = "yuma_admin";
const SESSION_TTL_SECONDS = 30 * 60;

function safeEqual(left, right) {
  const leftDigest = crypto.createHash("sha256").update(left).digest();
  const rightDigest = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftDigest, rightDigest);
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (!origin || !host) return false;

  try {
    const parsedOrigin = new URL(origin);
    return parsedOrigin.host.toLowerCase() === String(host).toLowerCase();
  } catch {
    return false;
  }
}

function sessionSignature(expiresAt, secret) {
  return crypto.createHmac("sha256", secret).update(String(expiresAt)).digest("base64url");
}

function setSessionCookie(res, secret) {
  const expiresAt = Date.now() + SESSION_TTL_SECONDS * 1000;
  const value = `${expiresAt}.${sessionSignature(expiresAt, secret)}`;
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${SESSION_TTL_SECONDS}${secure}`);
}

function clearSessionCookie(res) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${secure}`);
}

function hasValidSession(req) {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 20 || !secret || secret.length < 32) return false;

  const cookieHeader = req.headers.cookie || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;

  const value = cookie.slice(COOKIE_NAME.length + 1);
  const separator = value.indexOf(".");
  if (separator < 1) return false;

  const expiresAt = Number(value.slice(0, separator));
  const signature = value.slice(separator + 1);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;
  return safeEqual(signature, sessionSignature(expiresAt, secret));
}

function requireSameOrigin(req, res) {
  if (isSameOrigin(req)) return true;
  sendJson(res, 403, { error: "Request origin was not accepted." });
  return false;
}

function requireAdmin(req, res) {
  if (hasValidSession(req)) return true;
  sendJson(res, 401, { error: "Admin session is missing or expired. Sign in again." });
  return false;
}

function comparePassword(candidate, expected) {
  return safeEqual(candidate, expected);
}

module.exports = {
  clearSessionCookie,
  comparePassword,
  hasValidSession,
  requireAdmin,
  requireSameOrigin,
  setSessionCookie
};
