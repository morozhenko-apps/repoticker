/** Locale-specific complete sentences for repository selections.
 * Never use translated fragments as grammar or mutate source counts.
 */
import { normalizeLocale } from "./locale-catalog.mjs";

export const REPO_STATUS_MESSAGES = Object.freeze({
  "en": {
    "selected": "{selected} of {total} accessible repositories selected",
    "unavailable": "{count} selected repositories are no longer accessible.",
    "truncated": "The repository list is incomplete.",
    "more": "Filter to find more repositories."
  },
  "ru": {
    "selected": "Выбрано репозиториев: {selected} из {total} доступных.",
    "unavailable": "Выбранные репозитории больше недоступны: {count}.",
    "truncated": "Список репозиториев неполный.",
    "more": "Для поиска остальных используйте фильтр."
  },
  "es": {
    "selected": "Seleccionados {selected} de {total} repositorios accesibles.",
    "unavailable": "Ya no se puede acceder a {count} repositorios seleccionados.",
    "truncated": "La lista de repositorios está incompleta.",
    "more": "Usa el filtro para encontrar más repositorios."
  },
  "pt": {
    "selected": "{selected} de {total} repositórios acessíveis selecionados.",
    "unavailable": "Já não é possível aceder a {count} repositórios selecionados.",
    "truncated": "A lista de repositórios está incompleta.",
    "more": "Utilize o filtro para encontrar mais repositórios."
  },
  "de": {
    "selected": "{selected} von {total} zugänglichen Repositorys ausgewählt.",
    "unavailable": "{count} ausgewählte Repositorys sind nicht mehr zugänglich.",
    "truncated": "Die Repositoryliste ist unvollständig.",
    "more": "Weitere Repositorys über den Filter suchen."
  },
  "fr": {
    "selected": "{selected} dépôts sélectionnés sur {total} accessibles.",
    "unavailable": "{count} dépôts sélectionnés ne sont plus accessibles.",
    "truncated": "La liste des dépôts est incomplète.",
    "more": "Utilisez le filtre pour trouver d'autres dépôts."
  },
  "it": {
    "selected": "Selezionati {selected} repository su {total} accessibili.",
    "unavailable": "{count} repository selezionati non sono più accessibili.",
    "truncated": "L'elenco dei repository è incompleto.",
    "more": "Usa il filtro per trovare altri repository."
  },
  "pl": {
    "selected": "Wybrano {selected} z {total} dostępnych repozytoriów.",
    "unavailable": "{count} wybranych repozytoriów nie jest już dostępnych.",
    "truncated": "Lista repozytoriów jest niepełna.",
    "more": "Użyj filtra, aby znaleźć więcej repozytoriów."
  },
  "hi": {
    "selected": "{total} उपलब्ध रिपॉज़िटरी में से {selected} चुनी गई हैं।",
    "unavailable": "चुनी गई {count} रिपॉज़िटरी अब उपलब्ध नहीं हैं।",
    "truncated": "रिपॉज़िटरी सूची अधूरी है।",
    "more": "और रिपॉज़िटरी पाने के लिए फ़िल्टर करें।"
  },
  "zh-Hant": {
    "selected": "已選取 {selected} 個儲存庫，共有 {total} 個可存取。",
    "unavailable": "已選取的 {count} 個儲存庫不再可存取。",
    "truncated": "儲存庫清單不完整。",
    "more": "使用篩選尋找更多儲存庫。"
  },
  "ja": {
    "selected": "アクセス可能な {total} 件のうち {selected} 件のリポジトリを選択しました。",
    "unavailable": "選択した {count} 件のリポジトリにアクセスできません。",
    "truncated": "リポジトリ一覧が不完全です。",
    "more": "さらに探すにはフィルターを使用してください。"
  },
  "nl": {
    "selected": "{selected} van {total} toegankelijke repositories geselecteerd.",
    "unavailable": "{count} geselecteerde repositories zijn niet meer toegankelijk.",
    "truncated": "De repositorylijst is onvolledig.",
    "more": "Gebruik het filter voor meer repositories."
  },
  "sv": {
    "selected": "{selected} av {total} tillgängliga kodförråd har valts.",
    "unavailable": "{count} valda kodförråd är inte längre tillgängliga.",
    "truncated": "Listan över kodförråd är ofullständig.",
    "more": "Använd filtret för att hitta fler kodförråd."
  },
  "tr": {
    "selected": "Erişilebilir {total} depodan {selected} tanesi seçildi.",
    "unavailable": "Seçilen {count} depoya artık erişilemiyor.",
    "truncated": "Depo listesi eksik.",
    "more": "Daha fazla depo bulmak için filtreleyin."
  },
  "ko": {
    "selected": "접근 가능한 저장소 {total}개 중 {selected}개가 선택되었습니다.",
    "unavailable": "선택한 저장소 {count}개에 더 이상 접근할 수 없습니다.",
    "truncated": "저장소 목록이 불완전합니다.",
    "more": "필터를 사용하여 더 많은 저장소를 찾으세요."
  },
  "bn": {
    "selected": "অ্যাক্সেসযোগ্য {total}টি রিপোজিটরির মধ্যে {selected}টি নির্বাচিত।",
    "unavailable": "নির্বাচিত {count}টি রিপোজিটরি আর অ্যাক্সেসযোগ্য নয়।",
    "truncated": "রিপোজিটরি তালিকা অসম্পূর্ণ।",
    "more": "আরও রিপোজিটরি খুঁজতে ফিল্টার করুন।"
  },
  "th": {
    "selected": "เลือกคลังโค้ด {selected} จาก {total} รายการที่เข้าถึงได้",
    "unavailable": "คลังโค้ดที่เลือก {count} รายการไม่สามารถเข้าถึงได้แล้ว",
    "truncated": "รายการคลังโค้ดไม่ครบ",
    "more": "ใช้ตัวกรองเพื่อค้นหาคลังโค้ดเพิ่มเติม"
  },
  "id": {
    "selected": "Dipilih {selected} dari {total} repositori yang dapat diakses.",
    "unavailable": "Sebanyak {count} repositori terpilih tidak dapat diakses lagi.",
    "truncated": "Daftar repositori tidak lengkap.",
    "more": "Gunakan filter untuk mencari lebih banyak repositori."
  },
  "fil": {
    "selected": "Napili ang {selected} sa {total} naa-access na repository.",
    "unavailable": "Hindi na ma-access ang {count} napiling repository.",
    "truncated": "Hindi kumpleto ang listahan ng repository.",
    "more": "Gamitin ang filter para maghanap ng iba pa."
  },
  "ar": {
    "selected": "تم اختيار {selected} من أصل {total} مستودعات متاحة.",
    "unavailable": "لم يعد الوصول متاحاً إلى {count} من المستودعات المختارة.",
    "truncated": "قائمة المستودعات غير مكتملة.",
    "more": "استخدم التصفية للعثور على مستودعات إضافية."
  }
});

const UNAVAILABLE_FORMS = Object.freeze({
  en: { one: "{count} selected repository is no longer accessible." },
  ru: {
    one: "Выбранный репозиторий больше недоступен: {count}.",
    few: "Выбранных репозитория больше недоступно: {count}.",
    many: "Выбранных репозиториев больше недоступно: {count}."
  },
  pl: {
    one: "{count} wybrane repozytorium nie jest już dostępne.",
    few: "{count} wybrane repozytoria nie są już dostępne.",
    many: "{count} wybranych repozytoriów nie jest już dostępnych."
  },
  es: { one: "Ya no se puede acceder a {count} repositorio seleccionado." },
  pt: { one: "Já não é possível aceder a {count} repositório selecionado." },
  fr: { one: "{count} dépôt sélectionné n'est plus accessible." },
  it: { one: "{count} repository selezionato non è più accessibile." },
  de: { one: "{count} ausgewähltes Repository ist nicht mehr zugänglich." },
  nl: { one: "{count} geselecteerde repository is niet meer toegankelijk." },
  sv: { one: "{count} valt kodförråd är inte längre tillgängligt." },
  ar: {
    zero: "لا توجد مستودعات مختارة يتعذر الوصول إليها ({count}).",
    one: "مستودع مختار واحد لم يعد متاحاً ({count}).",
    two: "مستودعان مختاران لم يعودا متاحين ({count}).",
    few: "لم يعد الوصول متاحاً إلى {count} مستودعات مختارة.",
    many: "لم يعد الوصول متاحاً إلى {count} مستودعاً مختاراً."
  }
});

function countText(locale, count) {
  if (!Number.isSafeInteger(count) || count < 0)
    throw new RangeError("Expected a non-negative repository count");
  const display = new Intl.NumberFormat(locale, { useGrouping: false }).format(count);
  return locale === "ar" ? "\u2068" + display + "\u2069" : display;
}

function render(template, values) {
  return template.replace(/\{(selected|total|count)\}/g, (_, field) => values[field]);
}

export function repositorySelectionMessage(language, {
  selected, total, unavailable = 0, complete = true, filterHasMore = false
}) {
  const locale = normalizeLocale(language);
  const messages = REPO_STATUS_MESSAGES[locale];
  const values = {
    selected: countText(locale, selected),
    total: countText(locale, total),
    count: countText(locale, unavailable)
  };
  const unavailableCategory = new Intl.PluralRules(locale).select(unavailable);
  const unavailablePattern = UNAVAILABLE_FORMS[locale]?.[unavailableCategory] ??
    messages.unavailable;
  const main = unavailable > 0
    ? render(unavailablePattern, values)
    : render(messages.selected, values);
  return [main, !complete && messages.truncated,
    filterHasMore && messages.more].filter(Boolean).join(" ");
}
