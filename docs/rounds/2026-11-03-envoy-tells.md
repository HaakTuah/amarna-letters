# #591: no wording gives a script envoy's hidden state away

Branch `lane/591-envoy-tells`, from `develop` (#680). This builds the owner's answer to #591, the question parts 1 and 2
of the slop audit raised (#558, #585), which "Follow-ups" in `docs/BUILD-PROGRESS.md` holds.

## The owner's words

In the design chat, 3 November 2026, 06:58 UTC (archive item 185), to the design session's take on #591 and the others:
"Yes to all but number 2. I assume with number 1, we are only talking about the script characters." The take on #591,
as the design session relayed it on the issue: honest script envoys at warm courts sometimes say "kindly" and "friend"
too, and the bribed or frightened lines borrow honest wording, so no phrasing marks one state. It needs a new save
version, and a check that the script kings' trust readings still behave.

## What changed

- **The host's words with no threat in them** are told in a plain form or a kindly one ("The king said: …", "The king
  spoke kindly: …"; `Home.quoted` in `src/game/src/bots/envoy-words.ts`). An honest envoy uses them as a bought or
  frightened one does. Only an honest envoy back from a court that threatened uses the plain forms alone (`Home.said`),
  since "kindly" would be false there.
- **An honest envoy back from a warm court** (the host spoke no threat and refused nothing: `warmCourt` in
  `script-mind.ts`) sometimes adds one line a bought or frightened envoy uses: the king's friendship, "a friend to you",
  or "all is well". The line is picked by the half-year, not the season, so each line and its form run through every
  pairing. "The king said only that he is your friend" lost its "only", which would be false beside a quote.
- **A bought envoy quotes the host's message as any envoy quotes a king** ("The king said: \"My armies are few\""), with
  no "I saw for myself". Asked to speak well of another king, it quotes him: "Mitanni is a friend to your lord." The
  script kings read the clauses it reports, not this wording, so their reading of the message is unchanged.
- **"Kindly" is no longer a warmth word** to the script kings (`Warmth` in `brain.ts`). A report now warms them by
  what the king said, not by how the envoy put it. Only envoy reports used the word.
- **The shape of a report gives nothing away either** (the fresh-eyes review, 6 November). A bought envoy's passed-on
  message now comes with the king's other words, before the closing lines, as an honest envoy's second quote would;
  in structured press it is part of the one "The king answered" line. A report carries at most one warm closing line:
  a bought or frightened envoy whose host spoke only threats quotes nothing, rather than saying "The king spoke of his
  friendship" in the quote's place beside its own "bought" or "soothe" line. Words with any threat in them, to anyone,
  are never told as kindly spoken; each exchange picks its form apart, so two do not repeat one shape; "He spoke kindly,
  and said" became "He answered me without anger", and "seeks peace with you" became "spoke no ill of you", since a
  court that merely did not threaten has not said it seeks peace. The guard checks the shape too.
- **Save version 62.** The script kings' reading of reports changes.
- **The guard:** `src/game/test/envoy-tells.test.ts` plays each kind of envoy over sixty seasons. Every form a bribed or
  frightened envoy says at home must also be said by an honest one at a warm court in some season.

## The measurement

The trust each report gives a script king (`sentiment` × 0.08 in `Brain.learn`), as a mean over sixty seasons, for
one host's words at a warm, a plain and a cold court:

| Court | `develop`: honest / bribed / frightened | This branch |
| --- | --- | --- |
| Warm ("Go in peace. My brother is dear to me.") | 0.040 / 0.080 / 0.060 | 0.050 / 0.060 / 0.040 |
| Plain ("I have heard your words.") | 0.000 / 0.060 / 0.020 | 0.013 / 0.030 / 0.000 |
| Cold ("If your lord does not withdraw, I will burn his cities.") | −0.040 / 0.040 / 0.020 | −0.040 / 0.030 / 0.000 |

Measured again on 6 November, after the review's fixes, by the same harness as `envoy-tells.test.ts` (a throwaway
test, not kept), on `develop` and on this branch.

An honest report of threats reads as cold as before, so the trust readings still behave. The envoy's frame no longer
adds warmth of its own: what a bought report still adds is its content, the paid message and its praise of the host.
That is the deception the owner keeps, and a king learns it only by checking. A frightened envoy's report of a cold
court now reads neutral (0.000) rather than warm.

**Not yet run (paused for usage, 3 November):** a regression batch of script games on `develop` and on this branch
(`scripts/sim.sh --games 20 --seed 1` on each), and the fresh-eyes slop review of the new lines.

## Readings taken

- **A warm court is one that spoke no threat and refused nothing.** That is what an honest envoy can truly call warm
  ("the most reasonable reading"); a plain court that said nothing harsh counts as warm.
- **Phrasing only, not content.** A bought envoy still leaves out its host's threats and its true observations of the
  host, and still passes on the paid message. Those are what it reports, which the owner's rule leaves alone.
- **Script characters only.** A model writes its own words (the owner's words above).

## Questions for the owner

Questions for the owner: none. #591 closes with this PR.
