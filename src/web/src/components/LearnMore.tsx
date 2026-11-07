import { PersonLinks, PlaceLinks, RealmLinks, ownLand, AllPowers, king, type FixedPower, type GameState, type HistoryKind, type LearnMore as Link, type Power } from "@amarna/engine";

/**
 * "Learn more, and what is invented" (Interface, build order item 17+++b): a real place, realm or person's link to read
 * about it outside the game, under the name players know, with the line where the game takes a side the page does not;
 * or, for what the game made up, the mark that says so, so a player always knows what is history and what is fiction.
 */
export function learnOf(state: GameState, kind: HistoryKind, id: string): { link: Link } | { invented: string } | null {
  const realm = (p: Power): { link: Link } | { invented: string } | null => {
    const l = RealmLinks.get(p as FixedPower);
    return l !== undefined ? { link: l } : AllPowers.includes(p) ? { invented: "A realm risen in play: invented for this game." } : null;
  };
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
      const l = c.attested ? PersonLinks.get(c.name) : undefined;
      return l !== undefined ? { link: l } : { invented: "Invented for the game: no one of the period by this name and place." };
    }
  }
}

/** The link or the mark, as a card shows it. */
export function LearnMore({ state, kind, id }: { state: GameState; kind: HistoryKind; id: string }) {
  const l = learnOf(state, kind, id);
  // A realm's card also links its ruler of 1346, where the sources name him.
  const ruler = kind === "realm" ? PersonLinks.get(king(id)) : undefined;
  if (l === null && ruler === undefined) return null;
  return (
    <p className="small learn">
      {l !== null && "link" in l && <Out link={l.link} />}
      {l !== null && "invented" in l && <span className="pill invented">{l.invented}</span>}
      {ruler !== undefined && (
        <>
          {" · "}
          <Out link={ruler} />
        </>
      )}
      {l !== null && "link" in l && l.link.note !== undefined && <span className="muted"> {l.link.note}</span>}
    </p>
  );
}

const Out = ({ link }: { link: Link }) => (
  <a href={link.url} target="_blank" rel="noopener noreferrer" title="Opens outside the game">
    Learn more: {link.title} ↗
  </a>
);
