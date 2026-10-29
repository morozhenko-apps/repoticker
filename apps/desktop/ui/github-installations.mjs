// GitHub App installation inventory shared by Settings and monitoring.
// Exhaustion is not inferred when the bounded pagination limit is reached.
const INSTALL_PAGE_LIMIT = 10;
const ACCOUNT_NAME = /^[a-zA-Z0-9_.-]+$/;
const validAccountName = name => typeof name === "string" &&
  ACCOUNT_NAME.test(name) && name !== "." && name !== "..";

export async function listAvailableInstallations(get) {
  const result = [];
  for (let page = 1; page <= INSTALL_PAGE_LIMIT; page++) {
    const response = await get("/user/installations?per_page=100&page=" + page);
    if (!Array.isArray(response?.installations) ||
        response.installations.length > 100) throw Error("Invalid installations response");
    for (const item of response.installations) {
      const name = item?.account?.login;
      if (validAccountName(name) &&
          Number.isSafeInteger(item.id) && item.id > 0) {
        result.push({ name, id: item.id });
      }
    }
    if (response.installations.length < 100) return { items: result, complete: true };
  }
  return { items: result, complete: false };
}

