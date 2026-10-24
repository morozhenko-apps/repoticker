import { surfaceLocale, surfaceText } from "./surface-i18n.mjs";

const invoke = command => window.__TAURI__?.core?.invoke(command) ??
  Promise.reject(new Error("Open About in RepoTicker."));

let localeRevision = 0;
function paintLocale(value) {
  const language = surfaceLocale(value);
  document.documentElement.lang = language;
  document.title = surfaceText(language, "About RepoTicker");
  for (const item of document.querySelectorAll("[data-i18n]"))
    item.textContent = surfaceText(language, item.getAttribute("data-i18n"));
  for (const item of document.querySelectorAll("[data-i18n-alt]"))
    item.alt = surfaceText(language, item.getAttribute("data-i18n-alt"));
  for (const item of document.querySelectorAll("[data-i18n-aria]"))
    item.setAttribute("aria-label",
      surfaceText(language, item.getAttribute("data-i18n-aria")));
}
async function refreshLocale() {
  const revision = ++localeRevision;
  let language = "en";
  try {
    const settings = await invoke("get_settings_config");
    language = settings?.language;
  } catch {
    // Unavailable config must never prevent viewing immutable About info.
  }
  if (revision === localeRevision) paintLocale(language);
}

// A hidden About window is reused. Re-read persisted language when focused.
window.addEventListener("focus", () => { void refreshLocale(); });
void refreshLocale();

invoke("get_about_info").then(({version, author, website}) => {
  document.getElementById("version").textContent = version;
  document.getElementById("author").textContent = author;
  document.getElementById("website").title = website;
}).catch(error => {
  document.getElementById("version").textContent = String(error);
});
document.getElementById("website").addEventListener("click", () => {
  void invoke("open_project_website").catch(error => {
    document.getElementById("website").title = String(error);
  });
});
