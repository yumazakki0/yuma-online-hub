const { comparePassword, requireSameOrigin, setSessionCookie } = require("../_lib/admin");
const { isMethod, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (!isMethod(req, res, "POST") || !requireSameOrigin(req, res)) return;

  const password = process.env.ADMIN_PASSWORD;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 20 || !sessionSecret || sessionSecret.length < 32) {
    sendJson(res, 503, { error: "Admin secrets are not configured. Add ADMIN_PASSWORD and ADMIN_SESSION_SECRET in Vercel." });
    return;
  }

  const candidate = req.body && typeof req.body.password === "string" ? req.body.password : "";
  if (!candidate || !comparePassword(candidate, password)) {
    sendJson(res, 401, { error: "Incorrect admin password." });
    return;
  }

  setSessionCookie(res, sessionSecret);
  sendJson(res, 200, { ok: true, message: "Admin session started." });
};
