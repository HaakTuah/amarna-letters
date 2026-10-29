/**
 * One person's life read from the record, as the current view may know it: the first form of a legends mode. It is built
 * from sections so that roles and lives added later (generals, governors, outlaws, a past before the game) can add
 * sections of their own; nothing here is invented, every line comes from what the engine recorded.
 */
import { Greeting, Views, WorldMap, characterLegend, findCharacter, type Character, type CharacterView, type GameState, type Power } from "@amarna/engine";
import type { MapScene, ScenePerson } from "../map/scene.ts";
import { cap, dated, powerName, provinceName, shekels, when } from "../ui/format.ts";
import { coverOf, type FramePerson, type SeasonFrame } from "./frames.ts";

/** One dated line of a life: when it began, when it ended (if it did), and what it was. */
export interface LifeEntry {
  from: number;
  until: number | null;
  text: string;
  province: string | null;
}

/** A part of a life (its service, its journeys, its missions): a heading and its dated lines. */
export interface LifeSection {
  title: string;
  entries: LifeEntry[];
  note: string | null;
}

export interface LifeRecord {
  id: string;
  name: string;
  subtitle: string;
  now: string;
  employer: Power | null;
  sections: LifeSection[];
  /** False when the view knows nothing of this person. */
  known: boolean;
}

const entry = (from: number, until: number | null, text: string, province: string | null = null): LifeEntry => ({ from, until, text, province });

const court = (province: string): string => {
  const p = WorldMap.default.get(province);
  return p.capital && p.home !== null ? powerName(p.home) : provinceName(province);
};

function place(s: ScenePerson): string {
  const base =
    s.kind === "Envoy"
      ? `envoy at the court of ${court(s.province)}`
      : s.kind === "Spy"
        ? `spy at ${provinceName(s.province)}`
        : s.kind === "Captive"
          ? `held at ${provinceName(s.province)}`
          : `not returned from ${court(s.province)}`;
  return base + (s.believed ? " (as last heard)" : "");
}

function serviceTrue(p: FramePerson): string {
  switch (p.status) {
    case "Dead":
      return "dead";
    case "Captured":
      return `captive of ${p.heldBy !== null ? powerName(p.heldBy) : "a court"}${p.employer !== null ? `, still ${powerName(p.employer)}'s` : ""}`;
    case "Free":
      return p.at !== null ? `free, at the court of ${powerName(p.at)}` : "free";
    default:
      return p.employer !== null ? `serving ${powerName(p.employer)}${p.secretMaster !== null ? ` (secretly ${powerName(p.secretMaster)})` : ""}` : "employed";
  }
}

function serviceAsSeen(p: FramePerson, v: Power): string {
  if (coverOf(p, v) !== null) return "serving you (as you believe)";
  if (p.employer === v && (p.status === "Employed" || p.status === "Captured")) return p.status === "Captured" ? "serving you, held captive abroad" : "serving you";
  if (p.employer === v && p.status === "Dead") return "died in your service";
  return "";
}

function fate(c: Character): string {
  switch (c.status) {
    case "Dead":
      return "Dead.";
    case "Captured":
      return `Held captive by ${c.heldBy !== null ? powerName(c.heldBy) : ""}.`;
    case "Free":
      return c.at !== null ? `Free, at the court of ${powerName(c.at)}.` : "Free.";
    default:
      return `Serving ${c.employer !== null ? powerName(c.employer) : ""}: ${Views.dutyText(c)}.`;
  }
}

/**
 * index: the season shown (snapshot index); nothing later is read. sceneAt: the map's scene of a season for the same
 * viewer (cached by the session). state: the state at that season (for messages, memory and facts).
 */
export function buildLifeRecord(
  frames: readonly SeasonFrame[],
  sceneAt: (i: number) => MapScene,
  index: number,
  state: GameState,
  viewer: Power | null,
  id: string,
): LifeRecord {
  const c = findCharacter(state, id);
  if (c === null) return { id, name: "Unknown", subtitle: "", now: "", employer: null, sections: [], known: false };
  let seen: CharacterView | null = null;
  if (viewer !== null) {
    const view = Views.for(state, viewer);
    seen = [...view.court, ...view.known].find((x) => x.id === id) ?? null;
    if (seen === null)
      return { id, name: c.name, subtitle: `of ${c.origin}`, known: false, now: `${powerName(viewer)} knows nothing of ${c.name} at this season.`, employer: null, sections: [] };
  }

  const sections: LifeSection[] = [];
  const last = Math.min(index, frames.length - 1);

  // Service: whom it served, season by season, as far as the view can tell.
  let service: LifeEntry[] = [];
  let current: string | null = null;
  let start = 0;
  for (let j = 0; j <= last; j++) {
    const fp = frames[j].people.get(id);
    if (fp === undefined) continue;
    const text = viewer !== null ? serviceAsSeen(fp, viewer) : serviceTrue(fp);
    if (text !== current) {
      if (current !== null) service.push(entry(start + 1, j, current));
      current = text;
      start = j;
    }
  }
  if (current !== null) service.push(entry(start + 1, null, current));
  service = service.filter((e) => e.text.length > 0);
  if (service.length > 0) sections.push({ title: viewer === null ? "Service" : "In your service, as you know it", entries: service, note: null });

  // Places: where it stood or travelled, merged while unchanged.
  const places: LifeEntry[] = [];
  let where: string | null = null;
  let whereProv: string | null = null;
  start = 0;
  for (let j = 0; j <= last; j++) {
    const scene = sceneAt(j);
    const t = scene.travellers.find((x) => x.characterId === id && x.kind !== "Gold") ?? null;
    const s = scene.people.find((x) => x.id === id) ?? null;
    const fp = frames[j].people.get(id);
    let text: string | null = null;
    if (t !== null) text = `on the road from ${provinceName(t.fromProvince)} to ${provinceName(t.toProvince)}${t.believed ? " (as you believe)" : ""}`;
    else if (s !== null) text = place(s);
    else if (fp !== undefined && fp.at !== null && (viewer === null || (fp.employer === viewer && coverOf(fp, viewer) === null && fp.at === viewer)))
      text = fp.status === "Dead" ? null : `at the court of ${powerName(fp.at)}`;
    const prov = t?.toProvince ?? s?.province ?? null;
    if (text !== where) {
      if (where !== null) places.push(entry(start + 1, j, where, whereProv));
      where = text;
      whereProv = prov;
      start = j;
    }
  }
  if (where !== null) places.push(entry(start + 1, null, where, whereProv));
  if (places.length > 0)
    sections.push({ title: "Where they have been", entries: places, note: "Positions on the road are a guess: the engine keeps only when a journey began and ends." });

  // Missions: the message trail, as much of it as the view may read.
  const missions: LifeEntry[] = [];
  for (const t of state.trails.filter((x) => x.envoyId === id).sort((a, b) => a.turn - b.turn)) {
    // A court reads its own envoys' messages, and those of envoys who have stood before it; not one still on its way.
    if (viewer !== null && t.from !== viewer && (t.to !== viewer || t.audienceTurn === null)) continue;
    const lines = [
      `Sent by ${powerName(t.from)} to ${powerName(t.to)}` +
        (t.audienceTurn !== null ? `; heard in ${when(t.audienceTurn, viewer)}` : "; not yet heard") +
        (t.reportTurn !== null && (viewer === null || viewer === t.from) ? `; reported home in ${when(t.reportTurn, viewer)}` : "") +
        ".",
    ];
    if (viewer === null || viewer === t.from) {
      lines.push(`${viewer === null ? "The king wrote" : "You wrote"}: ${Greeting.cap(t.leaderLetter, 400)}`);
      if (t.goldStated > 0) lines.push(`Gold: ${shekels(t.goldStated)} by the inventory.`);
    }
    if ((viewer === null || viewer === t.to) && t.audienceTurn !== null) {
      if (t.delivered.length > 0) lines.push(`Said at the court of ${powerName(t.to)}: ${Greeting.cap(t.delivered, 400)}`);
      for (const x of t.exchanges.slice(0, 3)) if (x.envoy.length > 0) lines.push(`Answered: ${Greeting.cap(x.envoy, 240)}`);
    }
    if ((viewer === null || viewer === t.from) && t.reportTurn !== null && t.report.length > 0) lines.push(`Reported home: ${Greeting.cap(t.report, 400)}`);
    if (viewer === null && t.outcomes.length > 0) lines.push(`What happened: ${t.outcomes.join("; ")}.`);
    // The sender's dates run from sending to the report home; a court that only received the envoy knows the audience it
    // gave, not when the envoy set out or whether and when they reported home.
    const sender = viewer === null || viewer === t.from;
    missions.push(entry(sender ? t.turn : (t.audienceTurn ?? t.turn), sender ? t.reportTurn : null, lines.join("\n"), WorldMap.default.capital(t.to).id));
  }
  if (missions.length > 0) sections.push({ title: "Missions, and what was said", entries: missions, note: null });

  // Item 14, the biography: every event that names them, the tablets sealed by their hand, their losses abroad; a court
  // reads only the events it saw.
  const deeds = characterLegend(state, id, viewer).map((l) => entry(l.turn, null, l.text, l.province));
  if (deeds.length > 0)
    sections.push({ title: viewer === null ? "In the record" : "What your court saw of them", entries: deeds, note: viewer === null ? null : "Only events your court saw: the rest opens when the game ends." });

  // What the record holds of them: the truth in god view, the facts a court has learnt otherwise.
  if (viewer === null) {
    const facts = c.facts.map((f) =>
      entry(0, null, `${f.text} (${f.secrecy.toLowerCase()}${f.knownBy.length > 0 ? `; known to ${f.knownBy.join(", ")}` : ""})`),
    );
    facts.unshift(
      entry(
        0,
        null,
        `Loyalty ${c.traits.loyalty}, greed ${c.traits.greed}, competence ${c.traits.competence}, ambition ${c.traits.ambition}, courage ${c.traits.courage}` +
          (c.traits.sympathy !== null ? `, sympathy for ${powerName(c.traits.sympathy)} (${c.traits.sympathyStrength})` : "") +
          (c.secretMaster !== null ? `; secretly serves ${powerName(c.secretMaster)}` : "") +
          ".",
      ),
    );
    sections.push({ title: "Hidden traits and facts", entries: facts, note: null });
    const memory = c.memory.filter((m) => m.turn <= index + 1).map((m) => entry(m.turn, null, m.text));
    if (c.memorySummary.length > 0) memory.unshift(entry(0, null, "Older memories: " + c.memorySummary));
    if (memory.length > 0) sections.push({ title: "Their own memory", entries: memory, note: null });
  } else if (seen !== null && seen.knownFacts.length > 0)
    sections.push({ title: "What you know of them", entries: seen.knownFacts.map((f) => entry(0, null, f)), note: null });

  const now =
    viewer === null
      ? fate(c)
      : cap([seen!.status, dated(seen!.duty, viewer), seen!.where, dated(seen!.timing, viewer), dated(seen!.term, viewer)].filter((x) => x.length > 0).join(" · "));
  return {
    id,
    name: c.name,
    subtitle: viewer === null ? `of ${c.origin}, ${c.calling}` : `of ${c.origin}`,
    now,
    employer: viewer === null ? c.employer : seen!.employer,
    sections,
    known: true,
  };
}
