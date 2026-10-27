## Envoy authority and passage (item 9)

Build order item 9: first what item 8 began too early to build of item 7b's review (winter dangerous, never closed; a
spy's report from a watched province by road), then the envoy's seal with engine-checkable limits, credentials shown or
hidden, repudiation, and passage and basing granted on sealed tablets ("Envoy authority and resident envoys", "Passage
and access"; questions 2, 3 and 14 of the old round report). Save version 13. The report is
`docs/rounds/2026-10-27-envoy-authority.md`.

### Winter is dangerous, never closed

- **Nothing closes.** `dangerousInWinter` (model/map.ts) marks the mountain passes and the open-sea crossings; the validator
  and the adjudicator use the whole map in every season (`WorldMap.forTurn` is gone). `WorldMap.winter` is the map without
  the dangerous crossings: script kings plan on it in winter (`Board.Sail`), and the engine uses it to tell an army carried
  over the open sea from one carried along the coasts.
- **Troops** (`turn/winter.ts`, after the moves): an army that crossed a pass in winter, or was carried by fleets that do
  not join its ends by coastal waters alone (`coastalConvoy`), is lost with `GameConfig.winterArmyLoss` (30) in 100; a fleet that crossed an open-sea
  crossing in winter, with `winterFleetLoss` (25). Its king gets "Lost to winter"; those who saw either end see the event
  (`winter-loss`); one that got through is the event `winter-crossed` (its king's only). Size, supplies and the commander,
  which cut the losses in the design, are neutral until 9+a, 10+a and 13.
- **Travellers**: a snowbound pass takes `TravelData.winterPassPercent` (200%) of its time (`snowbound`, `legPoints`), and
  the road check adds `RoadOdds.snow` (6) at either end of a pass on the traveller's road in winter. The open sea in winter
  costs no time; its storms were already 8. Word goes by the fastest road in every season, an island's too.
- **Script kings** (`Tactics`, "Winter strokes"): in winter they plan on the safe map, so they neither move over a
  dangerous crossing nor fear one; then each free army weighs each pass into land it would take where no troop stands
  (within walls, to besiege them: `siegeWorth`): it goes, where no foe could step in too, if (1 − loss) × value ×
  willingness exceeds loss × (its price + a year of upkeep). The look-ahead cannot picture the move on the safe map, so it
  keeps it unless another troop now goes there. `--no-winter-play`, `--winter-play-half`.

### A spy's report by road

`Views.sight` no longer counts a watched province. The report a province spy sends each season (a journey home, as
before) brings, when it arrives, who held the province and the land beside it as of the season it was written
(`spyReportArrives`, into `GameState.known` with the spy's name), besides the troops it lists. A turned spy's poisoned
report brings no holders.

### Authority

- **The model** (`model/authority.ts`): `Authority` { `seal`, `show`, `maxGold`, `cede`, `open` } on `DispatchOrder.authority`,
  kept on the `Dispatch` and the `MessageTrail`; the engine keeps only provinces the king holds (the validator refuses any
  other). `withinAuthority`: the gold a tablet has the envoy's king give (`askGold` and `askTribute`, tribute counted once)
  within `maxGold`, every `askCede` among `cede`, every province an `askPassage` or `askBasing` opens among `open` (all
  his land when none is named).
- **The audience**: `AudienceView.sealCarried` (plain to see), `credentials` and `shownMandate` (when shown). The host may
  answer with `HostReply.counter`, a tablet of its own from host to sender (no sworn alliance: an envoy's seal never swears
  one), which the envoy seals with `EnvoyReaction.sealCounter` if it carries the seal (`TurnEngine.sealByHand`, one an
  audience). The tablet records `byHandOf` (the king), `byHand` (the envoy's name), `within`, `credentialsShown`; the host
  keeps a copy, the envoy brings its king his, and what it grants takes effect at once. Without the seal the trail notes
  the tablet offered. `asHeard`, what the envoy hears of the host's reply, now carries the host's clauses (item 8 dropped
  them, so a script envoy never heard a call for an oath in clauses: fixed) and the counter.
- **Seen by whom**: `TabletView.byHand`, `byHandOf`, `repudiatedTurn` for every holder of a copy; `within` only for the
  envoy's king, and for the host if it read the credentials.
- **Repudiation** (`RepudiateOrder`, `repudiate`, by the copy's mark): only of a tablet one's own envoy sealed, once. The
  tablet is marked, what it granted ends both ways, and the other king is told ("A tablet repudiated"), with whether it
  lay within the credentials if he read them; event `repudiated`.

### Passage and basing

- **Clauses** (item 8's): `passage` and `basing` (proposals: the writer opens his land), `askPassage` and `askBasing`
  (requests), each with a province (none: all the land, passage only) and a last season (none: until revoked). They are the
  one exception to "clauses oblige nobody": `grantsIn` reads a tablet's clauses when both seal it (by the host at the
  audience, or by an envoy's hand), and each grant over land its grantor holds then becomes a `Grant` in `GameState.grants`
  (events `passage-granted`, `basing-granted`). Trade rights wait for item 9+b, where caravans first trade abroad.
- **What a grant does** (`turn/authority.ts`): `grantCovers`, `guestOf`. A guest's troop takes none of the land it stands
  in by basing, or by passage in a season it moved there (`TurnEngine._movedNow`); one that holds, supports or is stopped
  there under passage alone has overstayed and takes it, as any troop takes land. Its move in is no invasion
  (`OrderOutcome.guest`, not in `GameState.invaded`), wakes a sleeping grantor as guests ("guests entered your land by the
  passage or basing you granted"), and a script grantor counts it no wrong. The grantee's travellers are not turned back
  at the border of the land granted nor seized by the grantor's troops there (`passageFor`, in `closedTo`), even where his
  roads are closed to them. Passage through all one's land is the land held when the tablet is sealed (`Grant.lands`); a
  revocation of one province narrows it. A guest's move goes in through the gates: it storms no walls (the adjudicator's
  `guests`), and a move on the grantor's own troops is an attack, not a guest's entry (`guestAt`).
- **Ending**: at the season it names; by the grantor's `RevokeOrder` (`revoke`: a king, and a province or none), resolved
  at the end of the season with the roads, so guests have that season to leave (event `grant-revoked`, a notice to the
  grantee); by closing one's roads to the grantee (`endGrants`); or by repudiation.
- **The view**: `SeatView.grants` (`GrantView`, the tablet by its name), shown to each king once he holds a copy of the
  tablet; the model's view has PASSAGE AND BASING, the rulebook AUTHORITY AND PASSAGE (`llm/src/rules-authority.ts`).
- **The web app**: the letter's seal, limits and credentials; at an audience, the seal and credentials shown and a tablet
  of one's own for the envoy to seal; the grants, with Revoke; Repudiate for tablets sealed by one's envoys; the archive
  marks a tablet sealed by an envoy's hand.

### Script players (`bots/authority.ts`)

- **The seal**: given with every tablet a trusted envoy carries (not to a king hostile, at war with us, or betrayed): no
  gold, no land to cede, and to a full ally or a friend trusted above 0.3 our border provinces with him that face a foe,
  to open. Credentials shown to a friend trusted above 0.3, by a king with honesty above 0.4.
- **Hosts' tablets** (`counterFor`, to an envoy that carries the seal): a proposal refused for what it gives away, without
  that (leave asked that we grant kept, written as granted); a coalition or alliance refused for itself, a stand against
  our own foe where the sender's land touches him, or else peace if we have no treaty; leave for our troops where our war
  needs his land; and a greedy king (greed above 0.6, spare gold below 200) asks 50 shekels for his seal.
- **Script envoys** seal a host's tablet within their authority (loyalty 25 or more, or bought); beyond it, only the
  bought, the disloyal (below 40) and the careless (competence below 35).
- **Repudiation**: a tablet sealed by our envoy beyond his authority that gives gold, land or leave we would not grant;
  a faithless king (honesty below 0.3) also one with a king he has come to count hostile. A king whose partner repudiates
  a tablet trusts him 0.1 less, 0.4 less and a grudge where the credentials showed it within.
- **Leave** (`stagingFor`, `grantsOk`): where a king we make war on or are sworn against touches none of our land or
  troops, we ask a friend whose province touches both for basing there (the `basing` mission, a tablet by an envoy with
  our seal), at most once in six seasons; pleading for relief, a besieged king grants the friend passage through his land on
  the plea's tablet. A host grants leave to a friend trusted 0.2 or more who is neither the leader nor the king we turn on,
  in a province of its own, not its capital nor walled, that faces a foe (all its land only to a full ally), unless its
  caution is above 0.85. Our troops step into land we hold leave in on their way (`Tactics.approach`), and a guest by passage
  alone moves on each season, to our own land or land we hold leave in (`keepMoving`). We revoke leave granted to a king
  turned hostile, at war with us, whom we turn on, who leads, or whom we trust below −0.1.
- `--no-authority-play`, `--authority-play-half`. The frozen baseline gives no seal and asks no leave.

### First guesses (item 18 tunes them)

`winterArmyLoss` 30, `winterFleetLoss` 25, `winterPassPercent` 200, `RoadOdds.snow` 6; leave asked for 9 seasons, passage
on a plea for 6; the script thresholds above.
