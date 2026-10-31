import { normalizeLocale, coreText } from "./locale-catalog.mjs";
import { CARD_TERMS } from "./locale-card.mjs";
import { localizedGitCount } from "./locale-plurals.mjs";
import { localizedKnownError } from "./locale-errors.mjs";
/** Card-only i18n foundation. The persisted language setting already
 * supports the canonical twenty locales without translating provider values.
 * Keep stable keys and value-bearing templates for contextual audits.
 */
const messages = Object.freeze({
  en: Object.freeze({
    repositories: "Repositories",
    repositoryActions: "Repository actions",
    githubMetrics: "GitHub Actions and runners",
    runners: "Runners",
    tasks: "Tasks",
    fetch: "Fetch",
    safeSync: "Safe sync",
    repos: "Repos",
    hide: "Hide",
    cancel: "Cancel",
    stopping: "Stopping...",
    openGithub: "Open on GitHub",
    openFolder: "Open folder",
    copyPath: "Copy path",
    noValidRepos: "No valid repositories found.",
    addRoot: "Add a repository folder through the tray Settings.",
    gitOperations: "Git operations",
    gitOperationsFor: name => "Git operations for " + name,
    showRepos: "Show repositories",
    hideRepos: "Hide repositories",
    hideCard: "Hide the card (keep RepoTicker running)",
    fetchTitle: "Fetch remote references for enrolled repositories",
    fetchCancel: "Cancel the current Fetch; some remote references may already be updated",
    syncTitle: "Safe sync: fast-forward behind or non-force push ahead (user action)",
    syncReady: count => count + " commits eligible for safe pull or non-force push",
    syncUnavailable: "No clean ahead/behind branches eligible for Safe sync. Fetch remote refs first.",
    refreshRunners: "Click to update Runners",
    refreshTasks: "Click to update Tasks",
    billing: "GitHub-hosted free allowances",
    refresh: "Activate to refresh",
    refreshing: "Refreshing",
    unknown: "unknown",
    total: "total",
    online: "online",
    offline: "offline",
    running: "running",
    queued: "queued",
    cannotResize: "Cannot resize card: ",
    gitErrors: count => count + " Git operation error(s): ",
  }),
  ru: Object.freeze({
    repositories: "Репозитории",
    repositoryActions: "Действия с репозиторием",
    githubMetrics: "Задания GitHub Actions и раннеры",
    runners: "Раннеры",
    tasks: "Задачи",
    fetch: "Получить",
    safeSync: "Синхр.",
    repos: "Репо",
    hide: "Скрыть",
    cancel: "Отмена",
    stopping: "Остановка...",
    openGithub: "Открыть на GitHub",
    openFolder: "Открыть папку",
    copyPath: "Копировать путь",
    noValidRepos: "Подходящие репозитории не найдены.",
    addRoot: "Добавьте папку репозиториев через настройки в трее.",
    gitOperations: "Действия Git",
    gitOperationsFor: name => "Действия Git для " + name,
    showRepos: "Показать репозитории",
    hideRepos: "Скрыть репозитории",
    hideCard: "Скрыть карточку (RepoTicker продолжит работу)",
    fetchTitle: "Получить удалённые Git-ссылки для добавленных репозиториев",
    fetchCancel: "Отменить Fetch; некоторые удалённые ссылки могли обновиться",
    syncTitle: "Безопасная синхронизация: fast-forward или push без force",
    syncReady: count => "Коммитов для безопасной синхронизации: " + count,
    syncUnavailable: "Нет чистых веток для синхронизации. Сначала выполните Fetch.",
    refreshRunners: "Нажмите, чтобы обновить раннеры",
    refreshTasks: "Нажмите, чтобы обновить задачи",
    billing: "Бесплатные лимиты GitHub Actions",
    refresh: "Нажмите для обновления",
    refreshing: "Обновление",
    unknown: "неизвестно",
    total: "всего",
    online: "в сети",
    offline: "не в сети",
    running: "выполняется",
    queued: "в очереди",
    cannotResize: "Не удалось изменить размер карточки: ",
    gitErrors: count => "Ошибок Git-операций: " + count + ". ",
  }),
});

export const cardLocale = normalizeLocale;
const coreCardTerms = Object.freeze({
  repositories: "Repositories",
  runners: "Runners", tasks: "Tasks", fetch: "Fetch",
  safeSync: "Safe sync", repos: "Repositories", hide: "Hide",
  cancel: "Cancel", openGithub: "Open on GitHub",
  openFolder: "Open folder", copyPath: "Copy path",
  total: "Total", online: "Online", offline: "Offline",
  running: "Running", queued: "Queued", unknown: "Unknown"
});

export function cardText(language, key, value) {
  const locale = cardLocale(language);
  if (key === "syncReady" || key === "gitErrors")
    return localizedGitCount(locale, key, value);
  const message = messages[locale === "ru" ? "ru" : "en"][key];
  if (message === undefined) throw new Error("Unknown card translation key");
  const rendered = typeof message === "function" ? message(value) : message;
  if (locale === "en" || locale === "ru") return rendered;
  const localized = CARD_TERMS[locale]?.[key];
  if (localized !== undefined) {
    // Interpolate into text nodes only. Unicode isolate protects an Arabic
    // sentence from a Latin repo name without modifying the real name.
    const dynamic = locale === "ar" && value !== undefined
      ? "\u2068" + String(value) + "\u2069" : String(value);
    return localized.replaceAll("{name}", dynamic).replaceAll("{count}", dynamic);
  }
  return key in coreCardTerms ? coreText(locale, coreCardTerms[key]) : rendered;
}

function countText(language, value) {
  if (typeof value !== "string" || !/^\d+$/.test(value))
    return cardText(language, "unknown");
  // Counts in Arabic screen-reader labels must keep their LTR order.
  return cardLocale(language) === "ar"
    ? "\u2068" + value + "\u2069" : value;
}

/** A focused metric button must expose current counts, not just "refresh".
 * A null/incomplete GitHub result remains unknown, never fabricated zero.
 */
export function metricAccessibleLabel(language, kind, counts, busy = false) {
  if (kind !== "runners" && kind !== "tasks") throw new Error("Unknown metric");
  const fields = kind === "runners"
    ? ["total", "online", "offline"] : ["running", "queued"];
  const metrics = fields.map(name => cardText(language, name) + ": " +
    countText(language, counts?.[name])).join(", ");
  return [cardText(language, kind), metrics,
    cardText(language, busy ? "refreshing" : "refresh")].join(". ");
}

/** Render saved raw notices at the selected language, never at IPC receipt.
 * Git summary and details remain distinct so changing the locale updates
 * both while preserving untrusted Git/process/provider strings exactly. */
export function cardNoticeText(language, notice) {
  if (notice?.kind === "native" && typeof notice.message === "string") {
    return localizedKnownError(language, notice.message);
  }
  if (notice?.kind === "resize" && typeof notice.message === "string") {
    // The system error is opaque; only the card's own prefix is localized.
    return cardText(language, "cannotResize") + notice.message;
  }
  if (notice?.kind === "git" &&
      Number.isSafeInteger(notice.count) && notice.count > 0 &&
      typeof notice.message === "string") {
    return cardText(language, "gitErrors", notice.count) +
      localizedKnownError(language, notice.message);
  }
  throw Error("Invalid card notice");
}
