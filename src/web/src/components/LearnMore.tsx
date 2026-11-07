import { AllPowers, PersonLinks, PlaceLinks, WorldMap, king, ownLand, realmLink, type FixedPower, type GameState, type HistoryKind, type LearnMore as Link, type Power } from "@amarna/engine";
import { provinceName } from "../ui/format.ts";
import { otherName, otherRealmName, realmName } from "../ui/names.ts";

/**
 * "Learn more, and what is invented" (Interface, build order item 17+++b): a real place, realm or person's link to read
 * about it outside the game, under the name players know, with the line where the game takes a side the page does not;
 * or, for what the game made up, the mark that says so, so a player always knows what is history and what is fiction.
 * `knownAs` is a person's name as the seat knows it: under a false name a court sees what that name would show (the
 * borrowed man's page, or the mark of an invented name), never the true man's.
 */
export function learnOf(state: GameState, kind: HistoryKind, id: string, knownAs?: string): { link: Link } | { invented: string } | null {
  const realm = (p: Power): { link: Link } | { invented: string } | null => {
    const l = realmLink(p as FixedPower);
    return l !== undefined ? { link: l } : AllPowers.includes(p) ? { invented: "A realm risen in play: invented for this game." } : null;
  };
  const invented = { invented: "Invented for the game: no one of the period by this name and place." };
  switch (kind) {
    case "province": {
      const l = PlaceLinks.get(id);
      return l !== undefined ? { link: l } : null;
    }
    case "realm":
      return realm(id);
    case "title": {
      const own = AllPowers.find((p) => ownLand(p) === id);
      return own !== undefined ? realm(own) : null;
    }
    case "person": {
      const c = state.characters.find((x) => x.id === id);
      if (c === undefined) return null;
      if (knownAs !== undefined && knownAs !== c.name) {
        const borrowed = PersonLinks.get(knownAs);
        return borrowed !== undefined ? { link: borrowed } : invented;
      }
      const l = c.attested ? PersonLinks.get(c.name) : undefined;
      return l !== undefined ? { link: l } : invented;
    }
  }
}

/** The thing's name on its link, as the player's settings show it, with its other name: "Gubla (Byblos)". */
function shownName(state: GameState, kind: HistoryKind, id: string, knownAs?: string): string {
  const both = (now: string, raw: string): string => {
    const other = otherName(raw);
    return other !== null ? `${now} (${other})` : now;
  };
  switch (kind) {
    case "province":
      return WorldMap.default.exists(id) ? both(provinceName(id), WorldMap.default.get(id).name) : id;
    case "realm":
      return ((now, other) => (other !== null ? `${now} (${other})` : now))(realmName(id), otherRealmName(id));
    case "title":
      return id;
    case "person":
      return knownAs ?? state.characters.find((c) => c.id === id)?.name ?? "";
  }
}

/** The link or the mark, as a card shows it; `knownAs`, a person's name as the seat knows it (none: the record). */
export function LearnMore({ state, kind, id, knownAs }: { state: GameState; kind: HistoryKind; id: string; knownAs?: string }) {
  const l = learnOf(state, kind, id, knownAs);
  // A realm's card also links its ruler of 1346, where the sources name him.
  const rulerName = kind === "realm" ? king(id) : "";
  const ruler = kind === "realm" ? PersonLinks.get(rulerName) : undefined;
  if (l === null && ruler === undefined) return null;
  return (
    <p className="small learn">
      {l !== null && "link" in l && <Out link={l.link} name={shownName(state, kind, id, knownAs)} />}
      {l !== null && "invented" in l && <span className="pill invented">{l.invented}</span>}
      {ruler !== undefined && (
        <>
          {" · "}
          <Out link={ruler} name={rulerName} />
        </>
      )}
      {l !== null && "link" in l && l.link.note !== undefined && <span className="muted"> {l.link.note}</span>}
    </p>
  );
}

/** "Learn more: Gubla (Byblos)", and the page's own title after it where it is another's ("on Amarna letters"). */
const Out = ({ link, name }: { link: Link; name: string }) => (
  <a href={link.url} target="_blank" rel="noopener noreferrer" title={`${link.title}, opens outside the game`}>
    Learn more: {name}
    {name.includes(link.title) ? "" : ` (on ${link.title})`} ↗
  </a>
);
