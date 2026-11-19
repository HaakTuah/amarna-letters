import type { GameKind } from "../session/settings.ts";

/**
 * Which game (item 18b, "The first game"): the first game, an evening's, offered first, or the full game. Every rule is the
 * same in both; the first game has fewer powers and a shorter age.
 */
const Games: readonly { id: GameKind; name: string; text: string; length: string }[] = [
  {
    id: "first",
    name: "The first game",
    text: "Egypt, Hatti and Mitanni, with the cities of Syria and Canaan and the chiefs between them; Babylonia, Assyria, Arzawa and Alashiya sit this one out. Every rule as in the full game.",
    length: "an evening: a short age",
  },
  {
    id: "full",
    name: "The full game",
    text: "All seven Great Kings and every city-state and chief between them, on the whole map.",
    length: "a few evenings: a long age",
  },
];

export function GameChoice({ game, onChange }: { game: GameKind; onChange: (g: GameKind) => void }) {
  return (
    <div className="presets" role="radiogroup" aria-label="Which game">
      {Games.map((g) => (
        <button key={g.id} className={`preset ${game === g.id ? "on" : ""}`} role="radio" aria-checked={game === g.id ? "true" : "false"} onClick={() => onChange(g.id)}>
          <span className="preset-head">
            <strong>{g.name}</strong>
            {g.id === "first" && <span className="pill">start here</span>}
          </span>
          <span className="preset-text">{g.text}</span>
          <span className="preset-foot">
            <small className="muted">{g.length}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
