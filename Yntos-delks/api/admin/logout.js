const { clearSessionCookie, requireAdmin, requireSameOrigin } = require("../_lib/admin");
const { isMethod, sendJson } = require("../_lib/http");

module.exports = async function handler(req, res) {
  if (!isMethod(req, res, "POST") || !requireSameOrigin(req, res) || !requireAdmin(req, res)) return;
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
};
