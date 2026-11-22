const siteConfig = require("../site-config.json");
const { isMethod, sendJson } = require("./_lib/http");

async function fetchSteam(path, apiKey, steamId) {
  const url = new URL(`https://api.steampowered.com/${path}`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("steamid", steamId);
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Steam API returned HTTP ${response.status}.`);
  return response.json();
}

module.exports = async function handler(req, res) {
  if (!isMethod(req, res, "GET")) return;
  const apiKey = process.env.STEAM_API_KEY;
  const steamId = siteConfig.platforms.steam.id;
  if (!apiKey) {
    sendJson(res, 503, { error: "Steam stats are not configured. Add STEAM_API_KEY as a private Vercel environment variable." });
    return;
  }

  try {
    const [players, badges, games, recent] = await Promise.all([
      fetchSteam("ISteamUser/GetPlayerSummaries/v2/", apiKey, steamId),
      fetchSteam("IPlayerService/GetBadges/v1/", apiKey, steamId),
      fetchSteam("IPlayerService/GetOwnedGames/v1/", apiKey, steamId),
      fetchSteam("IPlayerService/GetRecentlyPlayedGames/v1/", apiKey, steamId)
    ]);

    const player = players.response && players.response.players && players.response.players[0];
    if (!player) {
      sendJson(res, 404, { error: "Steam profile was not returned by the public API." });
      return;
    }

    const ownedGames = games.response && games.response.games;
    const recentGames = recent.response && recent.response.games;
    const totalMinutes = Array.isArray(ownedGames) ? ownedGames.reduce((sum, game) => sum + (Number(game.playtime_forever) || 0), 0) : null;
    const mostPlayed = Array.isArray(ownedGames)
      ? [...ownedGames].sort((a, b) => (Number(b.playtime_forever) || 0) - (Number(a.playtime_forever) || 0)).slice(0, 3)
      : [];
    const playerLevel = badges.response && Number.isFinite(Number(badges.response.player_level))
      ? Number(badges.response.player_level)
      : null;
    const personaState = Number(player.personastate);
    const presence = personaState === 1 ? "Online" : personaState === 0 ? "Offline" : "Ausente";

    sendJson(res, 200, {
      steam: {
        level: playerLevel,
        gameCount: Array.isArray(ownedGames) ? ownedGames.length : null,
        totalHours: totalMinutes === null ? null : Math.round(totalMinutes / 60),
        presence,
        gamesVisible: Array.isArray(ownedGames),
        mostPlayed: mostPlayed.map((game) => ({
          appId: Number(game.appid),
          name: typeof game.name === "string" ? game.name : `App ${game.appid}`,
          hours: Math.round((Number(game.playtime_forever) || 0) / 60)
        })),
        recentlyPlayed: Array.isArray(recentGames)
          ? recentGames.slice(0, 3).map((game) => ({
              appId: Number(game.appid),
              name: typeof game.name === "string" ? game.name : `App ${game.appid}`,
              hours: Math.round((Number(game.playtime_2weeks) || 0) / 60)
            }))
          : []
      }
    }, { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" });
  } catch (error) {
    console.error("Steam stats request failed:", error.message);
    sendJson(res, 502, { error: "Steam stats could not be loaded. Check the API key, profile privacy, and Vercel logs." });
  }
};
