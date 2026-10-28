/**
 * The rulebook's AUTHORITY AND PASSAGE section (build order item 9): the envoy's seal and its limits, credentials,
 * repudiation, and passage and basing granted on sealed tablets.
 */
import type { GameConfig } from "@amarna/engine";
import { joinS } from "./text.ts";

/** AUTHORITY AND PASSAGE: what an envoy with the seal may do, and what a sealed tablet may grant. */
export function authorityRules(_c: GameConfig): string {
  const lines: string[] = [`AUTHORITY AND PASSAGE`];
  lines.push(
    `- An envoy may carry your seal (carry_seal). The king he visits may then offer him a tablet of his own (your_tablet_clauses), and the envoy may seal it in your name, by his own hand: you hear of an agreement, not a proposal, a whole journey sooner. Without your seal nothing he agrees binds you. That he carries it is plain to see.`,
  );
  lines.push(
    `- Its limits, which the engine checks: the most gold he may give or promise (seal_max_gold; tribute counted once), the provinces of yours he may cede (seal_may_cede), and those he may open to the other king's troops by passage or basing (seal_may_open; passage through all your land needs every province of it). A tablet he seals is marked within or beyond his authority. He may seal one beyond it: a careless, frightened or bribed envoy can bind you to more than you meant. The words of your mandate guide his tone, and he reads them; the engine reads only the limits.`,
  );
  lines.push(
    `- Credentials (show_credentials): shown, the king he visits reads your mandate and its limits, which builds trust, and he knows whether the tablet lay within them; hidden, you keep your limits to yourself and your excuse. Either way the tablet records "by the hand of" your envoy, so every court that reads it knows you did not seal it yourself.`,
  );
  lines.push(
    `- You may repudiate a tablet your envoy sealed in your name (repudiate, naming your copy of it), saying it went beyond his authority: it no longer binds you, what it granted either way ends, and its other king is told. Whether that was true is for him to judge: he knows only if your envoy showed his credentials. An envoy's seal never swears a sworn alliance.`,
  );
  lines.push(
    joinS(` `, [
      `- Passage and basing are granted on sealed tablets, by the clauses that name them (passage, basing, askPassage, askBasing), from the season the tablet is sealed: every other clause obliges nobody, but these are kept by the engine until they end.`,
      `Passage: the other king's troops may move into the land granted (one province, or all the granting king's land) and stand there while passing through, taking none of it, and his envoys and spies are not turned back there, even where its roads are closed to his people. A troop that ends a season in such a province without having moved there that season (it held, supported, or was stopped) has overstayed, and takes it as any troop takes land, unless it holds basing there.`,
      `Basing: his troops may stand in the city named, season after season, taking none of it. Only land the granting king holds when the tablet is sealed is granted.`,
      `A grant ends at the season it names, when the granting king revokes it (revoke_passage, naming the king and a province or none for all) or closes his roads to that king's people, or when the tablet is repudiated. A revocation takes effect from the next season: guests still standing in the land then take it, and he counts it an attack. Guests entering your land wake you, as guests. A guest's troops are where you can strike them: a grant is a bet on trust. Allies relieving a besieged city cross its friend's land by passage like anyone else.`,
      `You may also grant passage or basing by order, with no tablet (grant_passage, naming the king and one province of yours or none for all your land; grant_basing, naming one province; and for how many seasons, or none for until you revoke it): it stands from next season, over land you hold now, and word of it reaches his court as fast as a messenger rides between your capitals, so tell him in a letter too. It ends as a tablet's grant does.`,
      `Trade rights come with trade at foreign markets (a later rule).`,
    ]),
  );
  return joinS(`\n`, lines);
}
