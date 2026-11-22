const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
  });
});

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

const navLinks = [...document.querySelectorAll(".main-nav a")];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.hash === `#${entry.target.id}`);
      });
    }
  });
}, { rootMargin: "-30% 0px -60% 0px" });

document.querySelectorAll("main section[id]").forEach((section) => sectionObserver.observe(section));
document.querySelector("#year").textContent = new Date().getFullYear();

const socialIcons = {
  discord: ["◉", "discord"],
  github: ["⌘", "github"],
  instagram: ["◎", "instagram"],
  spotify: ["♫", "spotify-icon"],
  steam: ["◉", "steam"],
  tiktok: ["♪", "tiktok"],
  twitch: ["▣", "twitch"],
  xbox: ["X", "xbox"],
  x: ["X", "social-x"],
  youtube: ["▶", "youtube"]
};

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && typeof value === "string") element.textContent = value;
}

function renderSocialLinks(socials) {
  const container = document.querySelector("[data-social-links]");
  if (!container || !Array.isArray(socials)) return;
  const links = document.createDocumentFragment();
  let visibleCount = 0;

  socials.forEach((social) => {
    const icon = socialIcons[social.id];
    if (!icon || !social.url || !social.label || !social.handle) return;
    let url;
    try {
      url = new URL(social.url);
    } catch {
      return;
    }
    if (url.protocol !== "https:") return;

    const anchor = document.createElement("a");
    anchor.href = url.href;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";

    const iconElement = document.createElement("span");
    iconElement.className = `social-icon ${icon[1]}`;
    iconElement.textContent = icon[0];
    const details = document.createElement("span");
    const label = document.createElement("b");
    label.textContent = social.label;
    const handle = document.createElement("small");
    handle.textContent = social.handle;
    details.append(label, handle);
    const arrow = document.createElement("span");
    arrow.className = "social-arrow";
    arrow.textContent = "↗";
    anchor.append(iconElement, details, arrow);
    links.append(anchor);
    visibleCount += 1;
  });

  container.replaceChildren(links);
  setText("[data-social-count]", String(visibleCount).padStart(2, "0"));
  setText("[data-route-count]", `01 — ${String(visibleCount).padStart(2, "0")}`);
}

function renderProjects(projects) {
  const container = document.querySelector("[data-projects]");
  if (!container || !Array.isArray(projects) || projects.length === 0) return;
  container.replaceChildren();

  projects.forEach((project, index) => {
    let projectUrl;
    try {
      projectUrl = new URL(project.url);
    } catch {
      return;
    }
    if (projectUrl.protocol !== "https:") return;

    const card = document.createElement("article");
    card.className = "project-card project-empty glass-card reveal";
    const visual = document.createElement("div");
    visual.className = "project-visual visual-code";
    visual.setAttribute("aria-hidden", "true");
    const code = document.createElement("div");
    code.className = "code-lines";
    const projectLine = document.createElement("span");
    projectLine.textContent = `0${index + 1}  // ${project.name}`;
    const descriptionLine = document.createElement("span");
    descriptionLine.textContent = `    ${project.description}`;
    code.append(projectLine, descriptionLine);
    visual.append(code);

    const info = document.createElement("div");
    info.className = "project-info";
    const details = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = project.name;
    const description = document.createElement("p");
    description.textContent = project.description;
    details.append(heading, description);
    const link = document.createElement("a");
    link.className = "round-arrow";
    link.href = projectUrl.href;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", `Abrir ${project.name}`);
    link.textContent = "↗";
    info.append(details, link);
    card.append(visual, info);
    container.append(card);
    revealObserver.observe(card);
  });
}

function applySiteConfig(config) {
  if (!config || !config.profile || !config.platforms || !config.music) {
    throw new Error("A configuração pública do site está incompleta.");
  }

  const name = config.profile.name;
  const initial = name.trim().charAt(0).toUpperCase();
  document.querySelectorAll("[data-profile-name]").forEach((element) => { element.textContent = name; });
  document.querySelectorAll("[data-profile-brand]").forEach((element) => { element.textContent = name.toUpperCase(); });
  document.querySelectorAll("[data-profile-footer-name]").forEach((element) => { element.textContent = name.toUpperCase(); });
  document.querySelectorAll(".brand-mark").forEach((element) => {
    if (element.firstChild && element.firstChild.nodeType === Node.TEXT_NODE) element.firstChild.textContent = initial;
  });
  document.querySelector(".avatar").setAttribute("aria-label", `Avatar ilustrado de ${name}`);
  document.querySelector(".avatar > span").textContent = initial;
  setText(".profile-handle", config.profile.handle);
  const bio = document.querySelector("[data-profile-bio]");
  bio.textContent = config.profile.bio;
  bio.style.whiteSpace = "pre-line";
  document.title = `${name} — Digital Universe`;
  document.querySelector('meta[name="description"]').setAttribute("content", `O universo digital de ${name} — games, projetos, música e comunidade.`);
  const shortUrl = document.querySelector(".short-url");
  if (shortUrl.firstChild) shortUrl.firstChild.textContent = name.toUpperCase();
  setText(".spotify-top .live-pill", `FAIXA DO ${name.toUpperCase()}`);
  setText("[data-profile-album]", `Álbum escolhido por ${name}`);

  document.querySelectorAll('[data-platform-link="steam"]').forEach((link) => { link.href = config.platforms.steam.url; });
  document.querySelectorAll('[data-platform-link="xbox"]').forEach((link) => { link.href = config.platforms.xbox.url; });
  setText("[data-steam-handle]", config.platforms.steam.url.split("/").filter(Boolean).pop());
  setText("[data-xbox-gamertag]", config.platforms.xbox.gamertag);

  const trackId = config.music.trackId;
  document.querySelector("[data-spotify-player]").src = `https://open.spotify.com/embed/track/${encodeURIComponent(trackId)}?utm_source=generator`;
  document.querySelector("[data-spotify-track-link]").href = config.music.trackUrl;
  document.querySelector("[data-spotify-album-link]").href = config.music.albumUrl;
  renderSocialLinks(config.socials);
  renderProjects(config.projects);
  setText(".stat:last-child strong", String(config.projects.length).padStart(2, "0"));
  if (config.projects.length) setText("#projects .section-note", "LINKS DE PROJETOS PUBLICADOS");

  const discordCta = document.querySelector("[data-discord-cta]");
  if (config.discordInvite) {
    const invite = new URL(config.discordInvite);
    if (invite.protocol === "https:" && /(^|\.)discord\.gg$|(^|\.)discord\.com$/i.test(invite.hostname)) {
      discordCta.href = invite.href;
      discordCta.target = "_blank";
      discordCta.rel = "noreferrer";
      discordCta.firstChild.textContent = "Entrar no Discord ";
      setText("[data-discord-description]", "O servidor está conectado. Entre para conversar e encontrar sua comunidade.");
      setText("[data-discord-channel]", "CONVITE DISPONÍVEL");
      setText("[data-discord-status]", "vinculado");
      setText("[data-discord-hint]", "CONVITE PÚBLICO CONFIGURADO");
    }
  }
}

async function loadSiteConfig() {
  const status = document.querySelector("#site-config-status");
  if (location.protocol === "file:") {
    status.textContent = "Prévia local: configurações dinâmicas são carregadas após publicar na Vercel.";
    return;
  }

  try {
    const response = await fetch("/site-config.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Não foi possível carregar a configuração do site (HTTP ${response.status}).`);
    const config = await response.json();
    applySiteConfig(config);
    status.textContent = `Configuração de ${config.profile.name} sincronizada.`;
    window.currentSiteConfig = config;
  } catch (error) {
    console.error("Site configuration error:", error);
    status.textContent = "Não foi possível sincronizar a configuração publicada.";
  }
}

async function loadSteamStats() {
  const message = document.querySelector("[data-steam-message]");
  if (location.protocol === "file:") return;

  try {
    const response = await fetch("/api/steam", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `Steam API retornou HTTP ${response.status}.`);
    const steam = result.steam;
    setText("[data-steam-level]", steam.level === null ? "—" : String(steam.level));
    setText("[data-steam-hours]", steam.totalHours === null ? "—" : String(steam.totalHours));
    setText("[data-steam-presence]", `Steam: ${steam.presence.toLowerCase()}`);

    const gameList = document.querySelector("[data-steam-games]");
    gameList.replaceChildren();
    steam.mostPlayed.forEach((game) => {
      const tile = document.createElement("div");
      tile.className = "game-tile";
      tile.title = `${game.name} · ${game.hours}h`;
      tile.setAttribute("role", "group");
      tile.setAttribute("aria-label", tile.title);

      const fallback = document.createElement("span");
      fallback.className = "game-icon-fallback";
      fallback.setAttribute("aria-hidden", "true");
      fallback.textContent = game.name.trim().charAt(0).toUpperCase();

      if (game.iconUrl) {
        const image = document.createElement("img");
        image.src = game.iconUrl;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        image.addEventListener("error", () => image.replaceWith(fallback), { once: true });
        tile.append(image);
      } else {
        tile.append(fallback);
      }

      const details = document.createElement("span");
      details.className = "game-details";
      const name = document.createElement("span");
      name.className = "game-title";
      name.textContent = game.name;
      const hours = document.createElement("small");
      hours.className = "game-hours";
      hours.textContent = `${game.hours}h jogadas`;
      details.append(name, hours);
      tile.append(details);
      gameList.append(tile);
    });
    if (!steam.mostPlayed.length) {
      const empty = document.createElement("span");
      empty.className = "game-empty";
      empty.textContent = "Nenhum jogo público foi retornado pela Steam.";
      gameList.append(empty);
    }
    message.textContent = steam.gamesVisible
      ? `Steam atualizada · ${steam.gameCount} jogos · ${steam.totalHours}h totais.`
      : "Perfil Steam conectado, mas a biblioteca está privada.";
  } catch (error) {
    console.error("Steam stats error:", error);
    const gameList = document.querySelector("[data-steam-games]");
    const empty = document.createElement("span");
    empty.className = "game-empty";
    empty.textContent = "Jogos indisponíveis no momento.";
    gameList.replaceChildren(empty);
    message.textContent = "Estatísticas Steam indisponíveis no momento; veja o perfil público.";
    setText("[data-steam-presence]", "presença Steam indisponível");
  }
}

loadSiteConfig();
loadSteamStats();

const canvas = document.querySelector("#particles");
const context = canvas.getContext("2d");
let particles = [];
let width = 0;
let height = 0;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resizeCanvas() {
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const count = Math.min(Math.floor((width * height) / 17000), 65);
  particles = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.2 + 0.35,
    speed: Math.random() * 0.22 + 0.06,
    alpha: Math.random() * 0.48 + 0.14
  }));
}

function drawParticles() {
  context.clearRect(0, 0, width, height);
  particles.forEach((particle) => {
    if (!reducedMotion) {
      particle.y -= particle.speed;
      if (particle.y < -3) {
        particle.y = height + 3;
        particle.x = Math.random() * width;
      }
    }
    context.beginPath();
    context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    context.fillStyle = `rgba(106, 192, 255, ${particle.alpha})`;
    context.fill();
  });
  if (!reducedMotion) requestAnimationFrame(drawParticles);
}

resizeCanvas();
drawParticles();
window.addEventListener("resize", resizeCanvas);
