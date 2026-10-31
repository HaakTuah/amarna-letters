<!-- Generated from the design document, Interface and the council tab, revision 18 (2026-10-31). Do not edit: see docs/intent/INDEX.md. -->
## The royal council

**The royal council (decided 19 October 2026; build order item 16).** Instead of one advisor, each ruler hears a council of four, built from the script kings' tactics with different weightings. With one advisor the easy path is to copy it; with four who disagree, the king has to choose, and how far they diverge shows how open the situation is. When all four agree, the move is almost certainly right. It is a toggle, recorded in the log so experiments can report whether it was on: on by default for human seats, who can turn it off, as with the advisors in Civilization, and comparing model kings with and without it waits until Haakon asks for model games.

| Advisor | Weighting | Looks for | Example |
| --- | --- | --- | --- |
| The General | High aggression | Where a strike wins now; exposed enemy armies | "Take Mira while Arzawa's army is in Seha." |
| The Steward | High caution, treasury first | Protecting the capital, avoiding overreach, keeping a reserve | "Hold the capital; Hatti's troops are two moves away, and we cannot afford another army." |
| The Tjaty | Cunning and commerce | Cheap gains: a city left unguarded, a distracted neighbor, a weakly held province | "Take Ugarit while Egypt looks away; Hatti is busy in the west." |
| The Diviner | The race to win | Who is growing fastest, and where pressure keeps a rival from pulling ahead | "The signs say Babylon's star is rising; its fall would be your rise." |

- **Hard, calculated analysis with known tilts.** The council's value is grounding: deterministic analysis of the board (adjudicated outcomes, threats, odds) that a model king would otherwise have to work out alone, which is what language models do worst. The king is told each advisor's tilt, so it can weigh the advice: a General urging attack is expected; a Steward agreeing is a strong signal.
- **Brief numbers behind each proposal,** such as "succeeds in 6 of 8 pictured outcomes" or "leaves the capital exposed to two Hittite armies". A reason with a number is easier to reason from than an opinion.
- **The advisors see only what the king sees.** They work from the seat's own view, with estimated rival gold and remembered troop positions, so they can be confidently wrong, and the king is told so. A council is only as good as the reports it receives.
- **Tactics only.** Troop orders and levies, each with a one-line reason. No letters, tablets, gifts or alliances; diplomacy stays with the king.
- **The Diviner speaks in omens but is never random.** Its advice is computed from the same estimates as the others, using the shared score function, and only phrased as signs.
- **Compact display.** One line for what all four agree on; full proposals only where they differ.
- **For every ruler played by a model or a human,** a Great King or a city-state's ruler alike. Script rulers already run these calculations to decide, so a council adds nothing for them. The same calculations drive the script city-states (item 11+) and scripted commanders (item 13).
- **Period titles per court,** with the same four archetypes underneath; to be verified before use. Egypt: the tjaty (vizier), an overseer of the army, the overseer of the treasury, and the chief lector priest as diviner. Babylonia and Assyria: the sukkallu as high minister and the bārû ("the one who sees") as diviner. Hatti: the chief of the royal bodyguard (GAL MEŠEDI) as general, with augurs, entrail readers and the "Old Woman" of the lot oracles as diviners. Mitanni can use the bārû too. Alashiya: an eagle diviner, after the king of Alashiya's request to the pharaoh for "a specialist in eagle-omens" (EA 35).
- **Advisors are not characters** (decided 19 October 2026). They only inform: they have no loyalties, no price and nothing a rival can buy. The council is analysis on the king's screen, not people at his court.
