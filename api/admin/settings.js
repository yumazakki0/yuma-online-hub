const { requireAdmin, requireSameOrigin } = require("../_lib/admin");
const { isMethod, sendJson } = require("../_lib/http");

const SOCIAL_LABELS = {
  discord: "Discord",
  github: "GitHub",
  instagram: "Instagram",
  spotify: "Spotify",
  steam: "Steam",
  tiktok: "TikTok",
  twitch: "Twitch",
  xbox: "Xbox",
  x: "X",
  youtube: "YouTube"
};

function isUrl(value, hostPattern) {
  if (typeof value !== "string" || !value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hostPattern.test(url.hostname);
  } catch {
    return false;
  }
}

function validateConfig(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return "Configuration must be an object.";
  if (!input.profile || typeof input.profile !== "object") return "Profile settings are missing.";
  if (typeof input.profile.name !== "string" || input.profile.name.trim().length < 1 || input.profile.name.length > 50) return "Name must contain 1–50 characters.";
  if (typeof input.profile.handle !== "string" || input.profile.handle.length > 60) return "Handle must contain at most 60 characters.";
  if (typeof input.profile.bio !== "string" || input.profile.bio.length > 300) return "Bio must contain at most 300 characters.";

  const steam = input.platforms && input.platforms.steam;
  const xbox = input.platforms && input.platforms.xbox;
  if (!steam || !/^\d{17}$/.test(steam.id) || !isUrl(steam.url, /(^|\.)steamcommunity\.com$/)) return "Steam profile settings are invalid.";
  if (!xbox || typeof xbox.gamertag !== "string" || xbox.gamertag.length > 40 || !isUrl(xbox.url, /(^|\.)xbox\.com$/)) return "Xbox profile settings are invalid.";

  if (!Array.isArray(input.socials) || input.socials.length > 10) return "Social links must be a list of up to 10 profiles.";
  const seen = new Set();
  for (const social of input.socials) {
    if (!social || !Object.hasOwn(SOCIAL_LABELS, social.id) || seen.has(social.id)) return "Social link types must be supported and unique.";
    if (typeof social.handle !== "string" || social.handle.length > 120 || !isUrl(social.url, /^[a-z0-9.-]+$/i)) return `The ${social.id} profile link is invalid.`;
    seen.add(social.id);
  }

  const music = input.music;
  if (!music || !/^[A-Za-z0-9]{22}$/.test(music.trackId)) return "Spotify track ID must contain 22 letters or digits.";
  if (!isUrl(music.trackUrl, /(^|\.)open\.spotify\.com$/) || !isUrl(music.albumUrl, /(^|\.)open\.spotify\.com$/)) return "Spotify links must use open.spotify.com.";
  if (input.discordInvite && !isUrl(input.discordInvite, /(^|\.)discord\.gg$|(^|\.)discord\.com$/)) return "Discord invite must use discord.gg or discord.com.";

  if (!Array.isArray(input.projects) || input.projects.length > 20) return "Projects must be a list of up to 20 items.";
  for (const project of input.projects) {
    if (!project || typeof project.name !== "string" || project.name.length > 80 || typeof project.description !== "string" || project.description.length > 240 || !isUrl(project.url, /^[a-z0-9.-]+$/i)) return "A project has invalid name, description, or HTTPS link.";
  }
  return null;
}

function githubSettings() {
  const repository = process.env.GITHUB_REPOSITORY || "";
  const token = process.env.GITHUB_TOKEN || "";
  const branch = process.env.GITHUB_BRANCH || "main";
  const path = process.env.GITHUB_CONFIG_PATH || "site-config.json";
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || !token || !/^[\w./-]+\.json$/.test(path)) {
    throw new Error("GitHub settings are missing. Configure GITHUB_REPOSITORY, GITHUB_TOKEN, and GITHUB_CONFIG_PATH in Vercel.");
  }
  return { branch, path, repository, token };
}

async function requestGitHub(settings, method, body) {
  const url = new URL(`https://api.github.com/repos/${settings.repository}/contents/${settings.path}`);
  if (method === "GET") url.searchParams.set("ref", settings.branch);
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "yuma-online-admin"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`GitHub returned an unreadable response (HTTP ${response.status}).`);
    }
  }
  if (!response.ok) {
    if (response.status === 404) return null;
    if (response.status === 409 || response.status === 422) throw new Error("GitHub config changed or conflicted. Reload the panel and try again.");
    throw new Error(`GitHub request failed (HTTP ${response.status}). Check the repository and token permissions.`);
  }
  return payload;
}

async function loadConfig(settings) {
  const file = await requestGitHub(settings, "GET");
  if (!file) throw new Error("site-config.json was not found in the GitHub repository.");
  return JSON.parse(Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8"));
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }
  if (req.method === "PUT" && !requireSameOrigin(req, res)) return;
  if (!requireAdmin(req, res)) return;

  let settings;
  try {
    settings = githubSettings();
  } catch (error) {
    sendJson(res, 503, { error: error.message });
    return;
  }

  if (req.method === "GET") {
    try {
      const config = await loadConfig(settings);
      sendJson(res, 200, { config });
    } catch (error) {
      console.error("Could not load admin configuration:", error.message);
      sendJson(res, 502, { error: error.message });
    }
    return;
  }

  const config = req.body && req.body.config;
  const validationError = validateConfig(config);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  try {
    const previous = await requestGitHub(settings, "GET");
    const body = {
      message: "Update Yuma site settings from admin panel",
      content: Buffer.from(`${JSON.stringify(config, null, 2)}\n`, "utf8").toString("base64"),
      branch: settings.branch
    };
    if (previous && previous.sha) body.sha = previous.sha;
    const saved = await requestGitHub(settings, "PUT", body);
    sendJson(res, 200, {
      ok: true,
      commit: saved.commit && saved.commit.sha,
      message: "Settings committed. Vercel will redeploy from the connected branch."
    });
  } catch (error) {
    console.error("Could not save admin configuration:", error.message);
    sendJson(res, 502, { error: error.message });
  }
};
