/** Pure locale-aware counter templates. Git operation names and
 * source numeric values are not translated or modified.
 */
import { normalizeLocale } from "./locale-catalog.mjs";
import { CARD_TERMS } from "./locale-card.mjs";

export const CARD_PLURALS = Object.freeze({
  en: {
    syncReady: { one: "{count} commit eligible for safe pull or non-force push" },
    gitErrors: { one: "{count} Git operation error: " }
  },
  ru: {
    syncReady: {
      one: "Коммит для безопасной синхронизации: {count}",
      few: "Коммита для безопасной синхронизации: {count}",
      many: "Коммитов для безопасной синхронизации: {count}",
      other: "Коммитов для безопасной синхронизации: {count}"
    },
    gitErrors: {
      one: "Ошибка Git-операции: {count}. ",
      few: "Ошибки Git-операций: {count}. ",
      many: "Ошибок Git-операций: {count}. ",
      other: "Ошибок Git-операций: {count}. "
    }
  },
  pl: {
    syncReady: {
      one: "{count} commit nadaje się do bezpiecznego pull lub push bez force",
      few: "{count} commity nadają się do bezpiecznego pull lub push bez force",
      many: "{count} commitów nadaje się do bezpiecznego pull lub push bez force",
      other: "{count} commita nadaje się do bezpiecznego pull lub push bez force"
    },
    gitErrors: {
      one: "Błąd operacji Git: {count}. ",
      few: "Błędy operacji Git: {count}. ",
      many: "Błędów operacji Git: {count}. ",
      other: "Błędu operacji Git: {count}. "
    }
  },
  ar: {
    syncReady: {
      zero: "لا توجد عمليات commit مؤهلة للمزامنة الآمنة ({count})",
      one: "عملية commit واحدة مؤهلة للمزامنة الآمنة ({count})",
      two: "عمليتا commit مؤهلتان للمزامنة الآمنة ({count})",
      few: "{count} عمليات commit مؤهلة للمزامنة الآمنة",
      many: "{count} عملية commit مؤهلة للمزامنة الآمنة",
      other: "{count} عمليات commit مؤهلة للمزامنة الآمنة"
    },
    gitErrors: {
      zero: "لا توجد أخطاء في عمليات Git ({count}). ",
      one: "خطأ واحد في عمليات Git ({count}). ",
      two: "خطآن في عمليات Git ({count}). ",
      few: "{count} أخطاء في عمليات Git. ",
      many: "{count} خطأ في عمليات Git. ",
      other: "{count} أخطاء في عمليات Git. "
    }
  },
  es: { syncReady: { one: "{count} commit apto para pull seguro o push sin force" } },
  pt: { syncReady: { one: "{count} commit elegível para pull seguro ou push sem force" } },
  fr: { syncReady: { one: "{count} commit éligible au pull sûr ou push sans force" } },
  it: { syncReady: { one: "{count} commit idoneo per pull sicuro o push senza force" } },
  de: { syncReady: { one: "{count} Commit für sicheren Pull oder Push ohne Force geeignet" } },
  nl: { syncReady: { one: "{count} commit geschikt voor veilig pull of push zonder force" } },
  sv: { syncReady: { one: "{count} commit kan hämtas säkert eller pushas utan force" } }
});

export function localizedGitCount(language, key, count) {
  if (!["syncReady", "gitErrors"].includes(key)) throw new Error("Unsupported counter key");
  if (!Number.isSafeInteger(count) || count < 0) throw new RangeError("Invalid Git count");
  const locale = normalizeLocale(language);
  const category = new Intl.PluralRules(locale).select(count);
  const forms = CARD_PLURALS[locale]?.[key];
  const defaultTemplate = locale === "en"
    ? (key === "syncReady"
      ? "{count} commits eligible for safe pull or non-force push"
      : "{count} Git operation error(s): ")
    : locale === "ru"
      ? (key === "syncReady"
        ? "Коммитов для безопасной синхронизации: {count}"
        : "Ошибок Git-операций: {count}. ")
      : CARD_TERMS[locale]?.[key];
  const template = forms?.[category] ?? forms?.other ?? defaultTemplate;
  if (typeof template !== "string" || !template.includes("{count}"))
    throw new Error("Missing localized count template");
  const value = locale === "ar" ? "\u2068" + count + "\u2069" : String(count);
  return template.replaceAll("{count}", value);
}
