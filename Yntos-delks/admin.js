const loginPanel = document.querySelector("#login-panel");
const editorPanel = document.querySelector("#editor-panel");
const loginForm = document.querySelector("#login-form");
const settingsForm = document.querySelector("#settings-form");

function showMessage(element, message, state = "") {
  element.textContent = message;
  element.dataset.state = state;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`O servidor respondeu com um formato inesperado (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(payload.error || `Falha ao falar com o servidor (HTTP ${response.status}).`);
  return payload;
}

function configToForm(config) {
  settingsForm.elements.name.value = config.profile.name;
  settingsForm.elements.handle.value = config.profile.handle;
  settingsForm.elements.bio.value = config.profile.bio;
  settingsForm.elements.socials.value = config.socials
    .map(({ id, label, handle, url }) => [id, label, handle, url].join("|"))
    .join("\n");
  settingsForm.elements.steamId.value = config.platforms.steam.id;
  settingsForm.elements.steamUrl.value = config.platforms.steam.url;
  settingsForm.elements.xboxGamertag.value = config.platforms.xbox.gamertag;
  settingsForm.elements.xboxUrl.value = config.platforms.xbox.url;
  settingsForm.elements.trackId.value = config.music.trackId;
  settingsForm.elements.trackUrl.value = config.music.trackUrl;
  settingsForm.elements.albumUrl.value = config.music.albumUrl;
  settingsForm.elements.discordInvite.value = config.discordInvite || "";
  settingsForm.elements.projects.value = JSON.stringify(config.projects, null, 2);
}

function readFormConfig() {
  const current = window.currentSiteConfig;
  const socials = settingsForm.elements.socials.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, label, handle, url] = line.split("|").map((part) => part.trim());
      if (!id || !label || !handle || !url) throw new Error("Cada perfil precisa ter id|nome|identificador|URL.");
      return { id, label, handle, url };
    });

  let projects;
  try {
    projects = JSON.parse(settingsForm.elements.projects.value || "[]");
  } catch {
    throw new Error("A lista de projetos precisa ser um JSON válido.");
  }

  return {
    ...current,
    profile: {
      name: settingsForm.elements.name.value.trim(),
      handle: settingsForm.elements.handle.value.trim(),
      bio: settingsForm.elements.bio.value.trim()
    },
    platforms: {
      steam: {
        id: settingsForm.elements.steamId.value.trim(),
        url: settingsForm.elements.steamUrl.value.trim()
      },
      xbox: {
        gamertag: settingsForm.elements.xboxGamertag.value.trim(),
        url: settingsForm.elements.xboxUrl.value.trim()
      }
    },
    socials,
    music: {
      trackId: settingsForm.elements.trackId.value.trim(),
      trackUrl: settingsForm.elements.trackUrl.value.trim(),
      albumUrl: settingsForm.elements.albumUrl.value.trim()
    },
    discordInvite: settingsForm.elements.discordInvite.value.trim(),
    projects
  };
}

async function loadSettings() {
  const result = await requestJson("/api/admin/settings");
  window.currentSiteConfig = result.config;
  configToForm(result.config);
  loginPanel.hidden = true;
  editorPanel.hidden = false;
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button");
  const message = document.querySelector("#login-message");
  button.disabled = true;
  showMessage(message, "Verificando acesso...");

  try {
    await requestJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: loginForm.elements.password.value })
    });
    loginForm.reset();
    await loadSettings();
  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = document.querySelector("#save-button");
  const message = document.querySelector("#save-message");
  button.disabled = true;
  showMessage(message, "Validando e publicando...");

  try {
    const config = readFormConfig();
    const result = await requestJson("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ config })
    });
    window.currentSiteConfig = config;
    showMessage(message, result.message, "success");
  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  const message = document.querySelector("#save-message");
  try {
    await requestJson("/api/admin/logout", { method: "POST", body: "{}" });
    editorPanel.hidden = true;
    loginPanel.hidden = false;
    showMessage(document.querySelector("#login-message"), "Sessão encerrada.", "success");
  } catch (error) {
    showMessage(message, error.message, "error");
  }
});

document.querySelector("#check-steam-button").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const message = document.querySelector("#steam-message");
  button.disabled = true;
  showMessage(message, "Consultando Steam...");

  try {
    const result = await requestJson("/api/steam");
    const steam = result.steam;
    showMessage(message, `Steam conectada: nível ${steam.level ?? "—"}, ${steam.gameCount ?? "—"} jogos e ${steam.totalHours ?? "—"} horas.`, "success");
  } catch (error) {
    showMessage(message, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

loadSettings().catch((error) => {
  if (!error.message.includes("session is missing or expired")) {
    showMessage(document.querySelector("#login-message"), error.message, "error");
  }
});
