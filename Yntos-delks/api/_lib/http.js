function sendJson(res, status, value, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (!Object.keys(headers).some((name) => name.toLowerCase() === "cache-control")) {
    res.setHeader("Cache-Control", "no-store");
  }
  Object.entries(headers).forEach(([name, content]) => res.setHeader(name, content));
  res.end(JSON.stringify(value));
}

function isMethod(req, res, method) {
  if (req.method === method) return true;
  res.setHeader("Allow", method);
  sendJson(res, 405, { error: "Method not allowed." });
  return false;
}

module.exports = { isMethod, sendJson };
