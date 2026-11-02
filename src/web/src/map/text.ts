/** Text written into the map's markup: escaped, and as an element's tooltip. */

export const esc = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
export const title = (s: string): string => `<title>${esc(s)}</title>`;
