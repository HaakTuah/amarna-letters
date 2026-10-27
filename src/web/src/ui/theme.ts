/** The reader's theme, chosen in the game's menu: kept in this browser only, and the page works without it. */
export function getTheme(): string {
  try {
    return localStorage.getItem("amarna-theme") ?? "";
  } catch {
    return "";
  }
}

export function setTheme(t: string): void {
  try {
    if (t) localStorage.setItem("amarna-theme", t);
    else localStorage.removeItem("amarna-theme");
  } catch {
    // private window or blocked storage: the theme lasts this page only
  }
  if (t) document.documentElement.dataset.theme = t;
  else delete document.documentElement.dataset.theme;
}
