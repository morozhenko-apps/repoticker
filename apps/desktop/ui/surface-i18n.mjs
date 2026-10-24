/** Read-only EN/RU display text for About and the detached GitHub balloon.
 * Project values, run counts, runner names and provider errors stay untouched.
 */
import { cardLocale } from "./card-i18n.mjs";

const ru = Object.freeze({
  "About RepoTicker": "О RepoTicker",
  "RepoTicker application icon": "Значок RepoTicker",
  "Version": "Версия",
  "Created by": "Автор",
  "Open morozhenko.com in your browser": "Открыть morozhenko.com в браузере",
  "Open source · Apache License 2.0": "Открытый исходный код · Apache License 2.0",
  "GitHub Actions and usage": "GitHub Actions и использование",
  "Not connected.": "Не подключено.",
  "Not connected": "Не подключено",
  "Connecting": "Подключение",
  "Status unavailable": "Статус недоступен",
  "Runners unavailable": "Раннеры недоступны",
  "Tasks unavailable": "Задачи недоступны",
  "Connect GitHub in Settings to read this status.": "Подключите GitHub в настройках, чтобы увидеть данные.",
  "Monitoring data unavailable. — means unknown.": "Данные мониторинга недоступны. — означает неизвестное значение.",
  "Checking GitHub connection...": "Проверка подключения GitHub...",
  "Connecting to GitHub...": "Подключение к GitHub...",
  "Cannot read GitHub status. Reopen the balloon to retry.": "Не удалось получить статус GitHub. Откройте подсказку снова.",
  "Cannot read refreshed GitHub status.": "Не удалось обновить статус GitHub.",
  "GitHub Actions updates are unavailable in this window.": "Обновления GitHub Actions недоступны в этом окне.",
  "GitHub Actions updates cannot be subscribed to.": "Не удалось подписаться на обновления GitHub Actions.",
  "Unknown tooltip type.": "Неизвестный тип подсказки.",
  "Unnamed runner": "Раннер без названия",
  "Runners": "Раннеры",
  "Tasks": "Задачи",
  "Actions": "Actions",
  "Online": "В сети",
  "Busy": "Заняты",
  "Idle": "Свободны",
  "Offline": "Не в сети",
  "Self-hosted": "Свои раннеры",
  "More self-hosted": "Ещё своих раннеров",
  "GitHub-hosted": "Раннеры GitHub",
  "Organization": "Организация",
  "Personal account": "Личный аккаунт",
  "Plan": "Тариф",
  "Included min": "Включено, мин",
  "Used min (gross)": "Использовано, мин",
  "Usage not available": "Данные об использовании недоступны",
  "Checked": "Проверено",
  "Running": "Выполняется",
  "Queued": "В очереди"
});

export const surfaceLocale = cardLocale;

export function surfaceText(language, key) {
  if (typeof key !== "string") throw Error("Invalid surface translation key");
  return surfaceLocale(language) === "ru" ? (ru[key] ?? key) : key;
}

function translatedStatus(language, status) {
  if (surfaceLocale(language) !== "ru") return status;
  const runners = /^Runners · (.+)$/.exec(status);
  if (runners) return surfaceText(language, "Runners") + " · " + runners[1];
  const tasks = /^Tasks · Running (.+) \/ Queued (.+)$/.exec(status);
  if (tasks) return surfaceText(language, "Tasks") + " · " +
    surfaceText(language, "Running") + " " + tasks[1] + " / " +
    surfaceText(language, "Queued") + " " + tasks[2];
  return surfaceText(language, status);
}

function translatedMessage(language, message) {
  if (surfaceLocale(language) !== "ru") return message;
  if (typeof message !== "string") return message;
  const checked = /^Checked: (.+)$/.exec(message);
  if (checked) return surfaceText(language, "Checked") + ": " + checked[1];
  return surfaceText(language, message);
}

/** Immutable, strictly presentation-only projection of an existing
 * validated usage model; do not translate arbitrary row values. */
export function translateHoverDetails(details, language) {
  if (surfaceLocale(language) !== "ru" || !details) return details;
  return {
    ...details,
    status: translatedStatus(language, details.status),
    message: translatedMessage(language, details.message),
    sections: (details.sections || []).map(section => ({
      ...section,
      title: surfaceText(language, section.title),
      message: translatedMessage(language, section.message),
      rows: (section.rows || []).map(([label, value]) => [
        surfaceText(language, label), value
      ]),
    })),
  };
}
