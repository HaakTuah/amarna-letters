# Amarna Letters

A strategy game with no diplomacy rules, set among the seven Great Kings of the Late Bronze Age
(c. 1360–1330 BCE) and the city-states between them. The rules cover movement, combat, production and payment.
Every treaty, alliance and betrayal is invented by the players. Kings never speak to each other
directly: every word travels with an envoy who has motives of his own.

The game is a prototype, built to test one hypothesis: if communication is delayed, mediated by people with their own
motives, and impossible to verify fully, then norms of trust, reputation and enforcement emerge
on their own.

**Play it in your browser:** <https://haaktuah.github.io/amarna-letters/>

![The message trail: what Alashiya's king wrote, beside what his envoy said abroad and reported home](docs/archive/rounds/2026-10-19-visual-overhaul/desktop-dark-trail.jpg)

*The message trail. Every message exists in three versions: what the king wrote, what the envoy
said at the foreign court, and what the envoy reported home. The gaps between them are the game.*

## How to start

Pick a preset, choose whether to watch or take a seat, and begin. You can be one of the seven Great Kings (Egypt,
Hatti, Babylonia, Mitanni, Assyria, Arzawa or Alashiya) or one of the forty city-states and chiefs between them, a
harder start that can still win. It is built phone first, and games are saved in the browser.

The **Free** preset needs no key and costs nothing: every king and envoy is a script player. To have Claude play the
kings, envoys or narrator, bring your own Anthropic API key, a dedicated one with a spend limit; the start page shows
what each preset roughly costs, and the game pauses at a spending cap you set. The presets, the costs and a first
cheap game are in [Playing with Claude](docs/design/61-the-rules-a-player-reads/07-playing-with-claude.md).

## How a season goes

Three seasons make a year. You see only what your kingdom can see; the rest you know from letters, reports and
rumours, which can be late, shaded or false. Each season:

1. **The land and its upkeep.** Harvests are reaped and taxed, mines and markets bring in gold, people eat, and your
   troops are paid and fed as your standing orders say.
2. **Arrivals.** Envoys, gold, spy reports and rumours that were on the road arrive.
3. **Audiences.** Foreign envoys deliver their message in their own words. The host answers, and may bribe the envoy,
   seal his tablet, detain him or send gold back.
4. **Orders.** Every king gives secret, simultaneous orders.
5. **Resolution.** Movement and battles, then sieges, then the rest of the orders, and any disaster.
6. **Reports.** News of the season reaches each court the next season.

Every power and every person ends on one scoreboard, and the highest score wins. Any season may be the last: the end
grows likelier every year, and nobody can read when it comes.

## The rules in full

The game's **Rulebook** tab holds the rules in full: the text a king played by a model reads. For a player, the same
ground is in [`docs/design/61-the-rules-a-player-reads/`](docs/design/61-the-rules-a-player-reads/):

- [What a king can do](docs/design/61-the-rules-a-player-reads/01-what-a-king-can-do.md): armies, land and gold,
  envoys, tablets, spies, command at a distance, the people.
- [Walls, sieges and terrain](docs/design/61-the-rules-a-player-reads/02-walls-sieges-and-terrain.md).
- [Winning and the end of the game](docs/design/61-the-rules-a-player-reads/03-winning-and-the-end.md).
- [The seven Great Kings](docs/design/61-the-rules-a-player-reads/04-the-seven-great-kings.md),
  [the courts](docs/design/61-the-rules-a-player-reads/05-the-courts.md) and
  [envoys and other servants](docs/design/61-the-rules-a-player-reads/06-envoys-and-other-servants.md).
- [Playing with Claude](docs/design/61-the-rules-a-player-reads/07-playing-with-claude.md): presets, costs, sleeping
  seats, a first live game.
- [Watching a game](docs/design/61-the-rules-a-player-reads/08-watching-a-game.md) and
  [music and sound](docs/design/61-the-rules-a-player-reads/09-music-and-sound.md).

## For developers

Running it locally, the tests and the batch runner, publishing, and how it is put together:
[`docs/for-developers.md`](docs/for-developers.md).

## Credits

The music and sounds are rendered from two CC0 sample libraries, VS Chamber Orchestra: Community Edition and the
Versilian Community Sample Library (Versilian Studios; `docs/audio/SOURCES.md`).

The game was inspired by Irving Finkel's *Curator's Corner* episode 100, "Reading the Pharaoh's
private mail with Irving Finkel" (The British Museum,
<https://www.youtube.com/watch?v=3MZq_ZQDhJA>), and leans on William L. Moran's *The Amarna
Letters* for the translations of the letters themselves.

The libraries, samples and map data the game ships, with their licences, are listed in its third-party notices
(`third-party-notices.txt` beside the game, linked from the About page's Credits; written by the web build from
`scripts/notices.mjs`). The game's own code carries no licence: all rights reserved.
