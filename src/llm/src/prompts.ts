/**
 * Prompt text. Shared blocks are byte-stable so prompt caching hits across seats and seasons; everything that changes goes in
 * the user message after them.
 */
import {
  AllPowers,
  mandateText,
  type UnitView,
  Views,
  WorldMap,
  clauseTag,
  cmpNum,
  cmpStr,
  describe,
  entersText,
  fmt,
  groupBy,
  isEnvoyWaiting,
  king,
  kingFor,
  claimedName,
  land,
  landGrowth,
  sortBy,
  sum,
  terrainOf,
  trimEnd,
  type AudienceView,
  answerText,
  conditionsText,
  type CharacterView,
  type Condition,
  type LetterView,
  type Order,
  type Power,
  type SeatView,
  type SiegeView,
  type StandingOrderView,
  type TabletView,
  type UnitKind,
  authorityText,
  type GrantView,
  menOf,
} from "@amarna/engine";
import { economyLines, worksLines } from "./prompt-economy.ts";
import { Sb, joinS } from "./text.ts";
export function identity(p: Power): string {
  return `You are ${kingFor(p, p)}, Great King of ${claimedName(p)} (${p}). Your homeland: ${joinS(
    `, `,
    WorldMap.default.homeOf(p).map((x) => x.id),
  )}; your capital is ${WorldMap.default.capital(p).id}.`;
}

/// <summary>
/// The opening line of every request to a king that sleeps (orders and audiences): how long it slept and what woke
/// it, or that this is its first season. Empty with sleeping seats off.
/// </summary>
/// <param name="atOrders">
/// For an orders request: the season's audiences come before orders, so an envoy that woke the king no longer waits to be
/// received, and the line says it was received. At an audience an envoy that woke it "came to your court": with two
/// envoys, the first is received before the second's audience ("Requests are rules too": the line once said "waits to be
/// received" of every envoy in every request).
/// </param>
/// <param name="reopenChosen">At an audience held while its orders stand, after it chose at an earlier one to reopen them.</param>
export function sleepLine(
  v: SeatView,
  atOrders = false,
  reopenChosen = false,
): string {
  if (!v.sleeps) return ``;
  // It has never given orders: the first season, or its first call failed and its counsellors kept the kingdom since.
  if (v.lastCalled === 0)
    return v.turn <= 1
      ? `This is your first season.`
      : `This is the first season you give orders.`;
  const slept = Math.max(0, v.turn - v.lastCalled - 1);
  const line =
    slept === 0
      ? `You gave orders last season (turn ${v.lastCalled}).`
      : `You slept ${slept} season${slept === 1 ? `` : `s`} (you last gave orders in turn ${v.lastCalled}).`;
  const reason = (r: string): string =>
    trimEnd(isEnvoyWaiting(r) ? came(r, atOrders) : r, ".");
  // Woken for its audiences only: its orders stand unless it reopens them there.
  if (v.holdsCourt)
    return (
      `${line} You were woken to receive ${v.wokenBecause.length === 1 ? `an envoy` : `envoys`}: ${joinS(`; `, v.wokenBecause.map(reason))}. ` +
      (reopenChosen
        ? `You chose at an earlier audience this season to reopen your orders: you give orders after your audiences.`
        : `Your orders stand unless you reopen them at your audience.`)
    );
  return v.wokenBecause.length === 0
    ? line
    : `${line} You were woken because: ${joinS(`; `, v.wokenBecause.map(reason))}.`;
}

/// <summary>
/// An envoy that woke the king, as a request names it ("an envoy of Hatti came to your court"), and in an orders request,
/// that it was received at the season's audiences, which come before orders.
/// </summary>
export function came(envoyWaits: string, atOrders: boolean): string {
  return envoyWaits.replaceAll(
    ` waits to be received`,
    atOrders
      ? ` came to your court (you received him before these orders)`
      : ` came to your court`,
  );
}

/// <summary>
/// The closing line of an orders request: what the king may now order, naming only what applies ("Requests are rules
/// too"): its troops if it has any, its envoys and letters if one of its people is at court and ready to be sent, with
/// sleep on the orders for later seasons, and standing orders, which every king may give (since the additions to the fix
/// pass after item 4), when it has troops for them to command or sleeps, then anything else.
/// </summary>
export function ordersLine(v: SeatView): string {
  const what: string[] = [];
  const troops = v.units.some((u) => u.power === v.power);
  if (troops) what.push(`your troops`);
  if (v.court.some((c) => c.ready)) what.push(`your envoys and letters`);
  if (v.sleeps) what.push(`orders scheduled for later seasons`);
  if (v.sleeps || troops) what.push(`standing orders`);
  const list =
    what.length === 0
      ? ``
      : what.length === 1
        ? `: ${what[0]} and anything else`
        : `: ${joinS(`, `, what)}, and anything else`;
  return v.sleeps
    ? `Now give your orders for this season and the seasons ahead${list}. You sleep after them.`
    : `Now give your orders for this season${list}.`;
}

/// <summary>A seat's view as text: what this king knows this season.</summary>
/**
 * Rank (item 8, "Recognition is earned"): each claim to it that is new, or became established in play, and what this court
 * and the others have called each other in the greetings sent between them. Empty when there is nothing to tell.
 */
export function rankLine(v: SeatView): string {
  const parts: string[] = [];
  for (const c of v.claims)
    parts.push(
      c.established === null
        ? `${c.power}'s claim to be a Great King is still new${c.overlord !== null ? ` (${c.overlord} holds ${c.power} its vassal)` : ``}`
        : `${c.power}'s claim to be a Great King is established (since turn ${c.established})`,
    );
  const called = (to: Power, from: Power): string => {
    const r = v.greetings.find((x) => x.from === from && x.to === to);
    if (r === undefined) return "";
    return r.brotherSince !== null
      ? `brother since turn ${r.brotherSince}`
      : `not brother in the last greeting (turn ${r.lastTurn})`;
  };
  const others = v.greetings
    .filter((x) => x.to === v.power)
    .map((x) => `${x.from}: ${called(v.power, x.from)}`);
  const mine = v.greetings
    .filter((x) => x.from === v.power)
    .map((x) => `${x.to}: ${called(x.to, v.power)}`);
  if (others.length > 0)
    parts.push(`what other kings call you: ${joinS(`; `, others)}`);
  if (mine.length > 0) parts.push(`what you call them: ${joinS(`; `, mine)}`);
  const rank = parts.length === 0 ? "" : `RANK: ${joinS(`. `, parts)}.`;
  const names = namesLine(v);
  return rank.length > 0 && names.length > 0
    ? `${rank}\n${names}`
    : rank + names;
}

/**
 * Item 17+ ("A power's name is a claim"): the names two or more kings claim, and whom this court's greetings give each to.
 * Empty when no name is contested and the king goes by his own land's name.
 */
export function namesLine(v: SeatView): string {
  if (v.nameClaims.length === 0) return "";
  const parts = v.nameClaims.map(
    (c) =>
      `${c.name} is claimed by ${joinS(` and `, c.claimants)}; ${c.givenTo === v.power ? `you hold it` : c.givenTo !== null ? `your court gives it to ${c.givenTo} and calls the other${c.claimants.length > 2 ? `s` : ``} by ${c.claimants.length > 2 ? `their houses` : `his house`}` : `your court has given it to no one`}`,
  );
  return `NAMES CLAIMED (each king as your orders name him): you go by the name of ${v.claimedName}. ${joinS(`. `, parts)}.`;
}

export function situation(
  v: SeatView,
  read: ReadonlySet<string> = NoneRead,
): string {
  const map = WorldMap.default;
  const sb = new Sb();
  const woke = sleepLine(v, true);
  if (woke.length > 0) sb.appendLine(woke);
  sb.appendLine(
    `SEASON: turn ${v.turn}, ${v.season} by your court's reckoning.`,
  );
  // Item 16, "Omens of the end": what the court's diviners read this season, in words only.
  if (v.omens !== ``) sb.appendLine(`OMENS: ${v.omens}`);
  // Item 13: where the king is, his court and capital, from where his orders go out.
  if (v.courtAt !== ``)
    sb.appendLine(
      `COURT: you and your court are in ${v.courtAt}${v.courtTo !== null ? `, on the road to ${v.courtTo}` : ``}; your orders go out from here (see COMMAND AT A DISTANCE).`,
    );
  const rank = rankLine(v);
  if (rank.length > 0) sb.appendLine(rank);
  const growth = v.startStrength > 0 ? v.strength / v.startStrength : 0;
  sb.appendLine(
    `TREASURY: ${v.gold} shekels by your ledger. Gold in since your last orders ${v.income} (mines and sales); a season you pay your troops ${v.upkeep}${v.worksUpkeep > 0 ? `, what you keep and build in gold ${v.worksUpkeep}` : ``}; your people's jobs come to about ${v.fees} a season, ${v.feesDue} of their fees still to fall due as their jobs are done${v.feesOwed > 0 ? `, and you let ${v.feesOwed} fall due unpaid` : ``}. People count on ${v.trust} in a hundred of what you promise (you kept ${v.kept} promises to pay and broke ${v.broken}); ${v.payCarriers ? "you pay the carriers of your letters on delivery, by your standing order" : "you do not pay the carriers of your letters on delivery (pay_carriers would)"}; what people ask follows only what they have heard jobs pay. Your standing order ${v.payTroops && v.feedTroops ? "pays and feeds your troops" : v.payTroops ? "pays your troops but does not feed them from your stores" : v.feedTroops ? "feeds your troops but pays them nothing" : "neither pays nor feeds your troops"}${v.payHeld.length > 0 ? `, ${v.payTroops ? "pay held back from" : "but pays"} those in ${joinS(", ", v.payHeld)}` : ""}${v.feedHeld.length > 0 ? `, ${v.feedTroops ? "food held back from" : "but feeds"} those in ${joinS(", ", v.feedHeld)}` : ""} (pay_troops, stop_paying_troops, feed_troops, stop_feeding_troops; command hold_pay, give_pay, hold_food, give_food for one province's troops)`,
  );
  sb.appendLine(GoldLifeline);
  for (const d of v.debts)
    sb.appendLine(
      `  Your debt ${d.id}: ${d.left} shekels left of ${d.owed} to repay (${d.sealedTurn > 0 ? `${d.principal} lent by ${d.lender} in turn ${d.sealedTurn}` : `owed to ${d.lender} since before the first season`}, to be repaid by turn ${d.dueTurn}); the tablet is held by ${d.holder}${d.here ? `, who stands at your court (order repay)` : ``}.`,
    );
  if (v.debtsHeld.length > 0)
    sb.appendLine(
      "DEBT TABLETS YOU HOLD (claims on others: collect by envoy, or sell_tablet):",
    );
  for (const d of v.debtsHeld)
    sb.appendLine(
      `  Tablet ${d.id}: ${d.holder} owes ${d.left} (${d.sealedTurn > 0 ? `lent by ${d.lender} in turn ${d.sealedTurn}` : `owed to ${d.lender} since before the first season`}, to be repaid by turn ${d.dueTurn})${d.here ? `; they stand at your court` : ``}.`,
    );
  for (const l of economyLines(v)) sb.appendLine(l);
  for (const l of worksLines(v)) sb.appendLine(l);
  // Each lot by what it is, then the court's own mark for it, which only its assay orders use (as for copies of tablets).
  for (const lot of v.unassayedGold)
    sb.appendLine(
      `  Unassayed gold from ${lot.from}, weighed in turn ${lot.arrivedTurn} [your mark ${lot.id}]: ${lot.weighed} shekels weighed (the inventory said ${lot.stated}).`,
    );
  sb.appendLine(standings(v));

  sb.appendLine();
  sb.appendLine(
    `LANDS (see WHAT YOU SEE and NEWS AND TRAVEL; a province you do not see is listed under its holder as last you heard, "heard in turn N"):`,
  );
  const units = new Map(v.units.map((u) => [u.province, u] as const));
  const troop = (id: string): string => {
    const u = units.get(id);
    // A unit short of a full levy's men says how many it has (item 11a+): it counts for that share in battle.
    return u !== undefined
      ? ` [${u.power} ${u.kind === "Army" ? `army` : `fleet`}${menNote(u)}${u.power === v.power ? commandNote(u, v) : ``}]`
      : ``;
  };
  // The walls as this court knows them (standing now in its sight, elsewhere as last seen) and the ground (see TERRAIN), in one bracket: "lukka (walls 1, rough ground)".
  const marksOf = (id: string): string => {
    const marks: string[] = [];
    const w = v.walls.tryGet(id);
    if (w !== undefined) marks.push(`walls ${w}`);
    if (
      terrainOf(id) === "Rough" &&
      v.prices.getOrDefault(`terrainDefence`, 1) > 0
    )
      marks.push(`rough ground`);
    if (terrainOf(id) === "Desert") marks.push(`desert`);
    // Not seen now (item 7b): how old the news is, and who brought it if one of your people did.
    const asOf = v.ownerAsOf.tryGet(id);
    if (asOf !== undefined) {
      const from = v.ownerFrom.tryGet(id) ?? ``;
      marks.push(
        `heard in turn ${asOf}` +
          (from === `seen`
            ? `, when you last saw it`
            : from.length > 0 && from !== `word from abroad`
              ? `, from ${from}`
              : ``),
      );
    }
    return marks.length === 0 ? `` : ` (${joinS(`, `, marks)})`;
  };
  for (const [key, group] of sortBy(
    groupBy(v.owner, (x) => x[1]),
    [(g) => (g[0] === null ? 99 : AllPowers.indexOf(g[0])), cmpNum],
  )) {
    const who =
      key !== null
        ? key === v.power
          ? `${key} (you)`
          : key
        : `Held by no one`;
    const list = sortBy(
      group.map((x) => x[0]),
      [(x) => x, cmpStr],
    ).map((id) => id + marksOf(id) + troop(id));
    sb.appendLine(`- ${who}: ${joinS(`, `, list)}`);
  }
  const sieges = siegesLine(v);
  if (sieges.length > 0) sb.appendLine(sieges);
  const atSea = v.units.filter((u) => map.get(u.province).isSea);
  if (atSea.length > 0)
    sb.appendLine(
      `- At sea: ${joinS(
        `, `,
        atSea.map((u) => `${u.province} [${u.power} fleet${menNote(u)}]`),
      )}`,
    );
  sb.appendLine(`You can see troops in: ${joinS(`, `, v.visible)}.`);

  sb.appendLine();
  sb.appendLine(`YOUR PEOPLE:`);
  if (v.court.length === 0) sb.appendLine(`- nobody`);
  for (const c of v.court) sb.appendLine(`- ` + person(c));
  if (v.known.length > 0) {
    sb.appendLine(`OTHER PEOPLE YOU KNOW OF:`);
    for (const c of v.known) sb.appendLine(`- ` + person(c));
  }
  // Item 12: envoys waiting at court whom nobody understands.
  if (v.unheardHere.length > 0)
    sb.appendLine(
      `Envoys at your court whom nobody here understands yet: ${joinS(
        `, `,
        v.unheardHere.map((id) => v.known.find((c) => c.id === id)?.name ?? id),
      )}. A free person at court who says he speaks his tongue and yours, taken into your service (hire, the errand stay), would carry his words.`,
    );

  if (v.letters.length > 0) {
    sb.appendLine(`YOUR LETTERS (as your scribes wrote them):`);
    // In full when sent at the king's last orders or when the report has come since; older letters in a line.
    for (const l of v.letters)
      sb.appendLine(
        `- ` +
          (l.reportedTurn !== null ||
          l.turn >= (v.lastCalled > 0 ? v.lastCalled : v.turn - 1)
            ? letterLine(l)
            : letterBrief(l)),
      );
  }

  if (v.tablets.length > 0) {
    sb.appendLine(
      `YOUR ARCHIVE (kept at your capital; a tablet you have read in full at an earlier orders by its opening words):`,
    );
    for (const t of v.tablets)
      sb.appendLine(
        `- ${read.has(t.tabletId) ? tabletBrief(t) : tabletLine(t)}${t.allianceOath ? ` A sworn alliance.` : ``}${t.vassal !== null ? ` A vassal treaty: ${t.vassal} the vassal.` : ``} (${t.source}${t.authResult !== null ? `; examined: ` + t.authResult : ``})`,
      );
  }
  sb.appendLine(
    `ENVOY TRAVEL (about, by the fastest road open this season): ${joinS(`; `, v.travelTimes)}.`,
  );
  if (v.roadsClosed.length > 0)
    sb.appendLine(
      `YOUR ROADS ARE CLOSED to the people of: ${joinS(`, `, v.roadsClosed)}.`,
    );
  if (v.roadsClosedToUs.length > 0)
    sb.appendLine(
      `ROADS CLOSED TO YOUR PEOPLE, as far as you have heard, by: ${joinS(`, `, v.roadsClosedToUs)}.`,
    );
  if (v.grants.length > 0) {
    sb.appendLine(`PASSAGE AND BASING standing on sealed tablets:`);
    for (const g of v.grants) sb.appendLine(`- ${grantLine(g, v.power)}`);
  }

  if (v.scheduled.length > 0) {
    sb.appendLine(
      `ORDERS YOU HAVE SCHEDULED (each unit named by where it stands now; see PLANNING AHEAD):`,
    );
    for (const plan of v.scheduled)
      sb.appendLine(
        `- turn ${plan.turn}${whenMet(plan.conditions)}: ${joinS(
          `; `,
          plan.orders.map((o) => planned(o, v)),
        )}`,
      );
  }
  if (v.standing.length > 0) {
    sb.appendLine(`YOUR STANDING ORDERS (see STANDING ORDERS):`);
    for (const st of v.standing) sb.appendLine(`- ${standingLine(st, v)}`);
  }
  if (v.answers.length > 0) {
    sb.appendLine(`YOUR STANDING ANSWERS (see STANDING ANSWERS):`);
    for (const x of v.answers) sb.appendLine(`- ${answerText(x)}`);
  }
  if (v.courtLetters.length > 0)
    sb.appendLine(
      `LETTERS YOU SENT FROM YOUR AUDIENCES THIS SEASON (they go out with your orders and are checked before them; an order you give now for the same person replaces its letter): ` +
        joinS(`; `, v.courtLetters.map(inFull)) +
        `.` +
        lettersGold(v.courtLetters),
    );

  sb.append(whileYouSlept(v));
  sb.append(councilBrief(v));

  sb.appendLine();
  sb.append(news(v));
  return sb.toString();
}

/**
 * Item 16, "The royal council": four advisors' troop orders and levies, compact (what all four agree on once, then each
 * where they differ), with each advisor's known tilt. They work from this court's own view, so they can be wrong.
 */
export function councilBrief(v: SeatView): string {
  const c = v.council;
  if (c === null) return ``;
  const sb = new Sb();
  sb.appendLine(
    `YOUR ROYAL COUNCIL (four advisors who only inform; they see only what you see, with rivals' gold estimated and troops remembered, so they can be confidently wrong; "pictured seasons" are eight ways this season may go, played out by the rules from your view; troop orders and levies only, diplomacy is yours):`,
  );
  if (c.agreed.length > 0)
    sb.appendLine(
      `- All four advise: ${joinS(
        `; `,
        c.agreed.map((l) => l.text),
      )}.`,
    );
  for (const a of c.advisors)
    sb.appendLine(
      `- ${a.title.charAt(0).toUpperCase() + a.title.slice(1)} (the ${a.advisor}; ${a.tilt}): ${a.reading}${
        a.lines.length > 0
          ? ` Proposes: ${joinS(
              `; `,
              a.lines.map((l) => l.text),
            )}.`
          : ``
      }`,
    );
  return sb.toString();
}

/// <summary>
/// The sieges a king knows of, in one line: his own, those of his cities, and those he can see, each with how far the city
/// has been worn down against its walls. Empty when there are none.
/// </summary>
export function siegesLine(v: SeatView): string {
  if (v.sieges.length === 0) return ``;
  // The tightness matters only at a capital: envoys leaving it, or coming home to it, may be caught.
  const tight = (x: SiegeView): string => {
    const city = WorldMap.default.get(x.province);
    return x.tightness !== null && city.capital && city.home === x.holder
      ? `; tightness ${x.tightness} (see WALLS AND SIEGES: envoys ${x.holder === v.power ? `of yours` : `of ${x.holder}`} leaving or coming home may be caught)`
      : ``;
  };
  const line = (x: SiegeView): string =>
    x.besieger === v.power
      ? `your army besieges ${x.province} (${x.holder !== null ? `held by ${x.holder}` : `held by no one`}, walls ${x.walls}): worn down ${x.progress} of ${x.walls}, since turn ${x.since}${tight(x)}`
      : x.holder === v.power
        ? `${x.besieger}'s army besieges your city of ${x.province} (walls ${x.walls}): worn down ${x.progress} of ${x.walls}, since turn ${x.since}${tight(x)}`
        : `${x.besieger}'s army besieges ${x.province} (${x.holder !== null ? `held by ${x.holder}` : `held by no one`}, walls ${x.walls}): worn down ${x.progress} of ${x.walls}`;
  return `SIEGES (a city surrenders when it is worn down as far as its walls are high): ${joinS(`; `, v.sieges.map(line))}.`;
}

/// <summary>
/// A tablet the king holds: its name, which every court gives it (its seals and date), then the king's own mark for its
/// copy, which only its orders use (another court numbers its copies differently), then its text.
/// </summary>
export function tabletLine(t: TabletView): string {
  return `${t.name} [your copy ${t.copyId}]${byHand(t)}: "${t.text}"`;
}

/** Item 9: "sealed for Egypt by the hand of Hani, within his authority; repudiated in turn 9", or nothing. */
function byHand(t: TabletView): string {
  if (t.byHand === null) return ``;
  const within =
    t.within === null
      ? ``
      : t.within
        ? `, within his authority`
        : `, beyond his authority`;
  return ` (sealed for ${t.byHandOf ?? ``} by the hand of ${t.byHand}${within}${t.repudiatedTurn !== null ? `; repudiated in turn ${t.repudiatedTurn}` : ``})`;
}

/** The conditions of a scheduled entry or a standing order, after its season or event: " (unless ...)", or nothing. */
export function whenMet(cs: readonly Condition[]): string {
  return cs.length === 0 ? `` : ` (${conditionsText(cs)})`;
}

/** No tablet read before: every tablet in full. */
export const NoneRead: ReadonlySet<string> = new Set<string>();
/** How many characters of a text its line keeps once it has been read in full (an older letter, a tablet read before). */
export const BriefChars = 120;
const opening = (text: string): string =>
  text.length <= BriefChars ? text : `${trimEnd(text.slice(0, BriefChars))}…`;

/** A tablet the king has read in full at an earlier orders: its name, its mark and its opening words. */
export function tabletBrief(t: TabletView): string {
  return `${t.name} [your copy ${t.copyId}]${byHand(t)}: "${opening(t.text)}"`;
}

/** An older letter in a line: when, by whom, to whom, with what gold, and its opening words. */
export function letterBrief(l: LetterView): string {
  return `turn ${l.turn}, ${l.envoyName} (${l.envoyId}) to ${l.to}${l.gold > 0 ? `, with ${l.gold} shekels` : ``} (still away): "${opening(l.message)}"${l.tablet !== null ? `, with a tablet to seal` : ``}`;
}

/**
 * A battle report without the units that held: they stand where they stood, as the map shows. A report of nothing but
 * holds keeps its first line.
 */
export function withoutHolds(body: string): string {
  // Item 17+: units are written as the reports name them ("army in Men-nefer holds", "Assyria: fleet in the Western Sea holds").
  const hold = /^- (?:[^:]+: )?(?:army|fleet) in [^:>]+ holds$/;
  const lines = body.split("\n");
  const first = /^(.*?:) (- (?:army|fleet) in [^:>]+ holds)$/.exec(lines[0]);
  if (first !== null && hold.test(first[2])) lines[0] = first[1];
  const kept = lines.filter((l, i) => i === 0 || !hold.test(l));
  const shown = kept.filter(
    (l, i) =>
      !(
        l === "Seen nearby:" &&
        (i === kept.length - 1 || !kept[i + 1].startsWith("- "))
      ),
  );
  if (first !== null && shown.length === 1)
    return `${shown[0]} every unit you saw held.`;
  return joinS("\n", shown);
}

/// <summary>
/// An order as the king reads it back: a letter in full (to whom, with what gold, its message, mandate and tablet), as it
/// goes out with this season's orders; any other order as it describes itself.
/// </summary>
export function inFull(o: Order): string {
  if (o.type !== "dispatch") return describe(o);
  const d = o;
  return (
    `send ${d.envoy} to ${d.to}${d.gold > 0 ? ` with ${d.gold} shekels` : ``}: message "${d.letter}"; mandate ${d.mandate.length > 0 ? `"${d.mandate}"` : `none`}` +
    (d.proposal !== null && d.proposal !== undefined
      ? `; tablet to seal "${d.proposal.text}"`
      : ``)
  );
}

/// <summary>A letter the king sent, in full: when, by whom, to whom, with what gold, and its message, mandate and tablet.</summary>
export function letterLine(l: LetterView): string {
  return (
    `turn ${l.turn}, ${l.envoyName} (${l.envoyId}) to ${l.to}${l.gold > 0 ? `, with ${l.gold} shekels` : ``}` +
    (l.reportedTurn !== null
      ? ` (his report came in turn ${l.reportedTurn})`
      : ` (still away)`) +
    `: message "${l.message}"; mandate ${l.mandate.length > 0 ? `"${l.mandate}"` : `none`}` +
    (l.tablet !== null ? `; tablet to seal "${l.tablet}"` : ``)
  );
}

/// <summary>
/// After the letters a king sent from its audiences this season: the gold they carry, which the treasury it reads does not
/// show as spent until the season's orders are checked (the letters first), or nothing if they carry none.
/// </summary>
function lettersGold(letters: readonly Order[]): string {
  const gold = sum(letters, (o) => (o.type === "dispatch" ? o.gold : 0));
  return gold > 0
    ? ` Gold already committed by these letters: ${gold} shekels, not yet taken from the treasury you read here; it is reserved first when the season's orders are checked.`
    : ``;
}

/// <summary>A standing order as its king reads it: its id, the move it waits for, and its orders.</summary>
function standingLine(st: StandingOrderView, v: SeatView): string {
  const when =
    st.when === "UnitAttacked"
      ? `when your ${ownKind(st.province, v) ?? `unit`} now in ${st.province} is attacked`
      : entersText(v.power, st.power, st.province);
  return `${st.id}: ${when}${whenMet(st.conditions)}, then: ${joinS(
    `; `,
    st.orders.map((o) => planned(o, v)),
  )}`;
}

/// <summary>
/// What a king woken for its audiences only reads of its realm, enough to judge whether the news changes its plan, and
/// not the full map: its treasury, its land and troops, foreign troops at or inside its borders as far as it can see, its
/// scheduled and standing orders, and its people at court and away.
/// </summary>
export function realmBrief(v: SeatView): string {
  const map = WorldMap.default;
  const sb = new Sb();
  const kindOf = (k: UnitKind): string => (k === "Army" ? `army` : `fleet`);
  sb.appendLine(
    `YOUR REALM IN BRIEF (enough to judge whether the news changes your plan; you see the full map only if you reopen your orders):`,
  );
  sb.appendLine(
    `- Treasury: ${v.gold} shekels by your ledger; gold in since your last orders ${v.income}; a season your troops' pay ${v.upkeep}${v.worksUpkeep > 0 ? `, what you keep and build in gold ${v.worksUpkeep}` : ``}, your people's jobs about ${v.fees}; fees still to fall due ${v.feesDue}${v.debts.length > 0 ? `; debts ${v.debts.reduce((a, d) => a + d.left, 0)}` : ``}.`,
  );
  const hungry = v.units.filter(
    (u) => u.power === v.power && (u.hungry > 0 || u.unpaid > 0),
  );
  if (hungry.length > 0)
    sb.appendLine(
      `- Troops hungry or unpaid: ${joinS(
        `, `,
        hungry.map(
          (u) =>
            `${u.province}${u.hungry > 0 ? ` hungry ${u.hungry}` : ``}${u.unpaid > 0 ? ` unpaid ${u.unpaid}` : ``}`,
        ),
      )}.`,
    );
  const land = sortBy(
    [...v.owner].filter((x) => x[1] === v.power).map((x) => x[0]),
    [(x) => x, cmpStr],
  );
  sb.appendLine(
    `- Your land: ${land.length === 0 ? `none` : joinS(`, `, land)}.`,
  );
  const troops = v.units
    .filter((u) => u.power === v.power)
    .map((u) => `${kindOf(u.kind)} in ${u.province}`);
  sb.appendLine(
    `- Your troops: ${troops.length === 0 ? `none` : joinS(`, `, troops)}.`,
  );
  const own = new Set(land);
  const foreign: string[] = [];
  for (const u of sortBy(
    v.units.filter((u) => u.power !== v.power),
    [(u) => u.province, cmpStr],
  )) {
    const next = sortBy(
      map.neighbors(u.province).filter((x) => own.has(x)),
      [(x) => x, cmpStr],
    );
    if (own.has(u.province))
      foreign.push(
        `${u.power} ${kindOf(u.kind)} in ${u.province} (in your land)`,
      );
    else if (next.length > 0)
      foreign.push(
        `${u.power} ${kindOf(u.kind)} in ${u.province} (next to your ${joinS(`, `, next)})`,
      );
  }
  sb.appendLine(
    `- Foreign troops at or inside your borders, as far as you can see: ${foreign.length === 0 ? `none` : joinS(`; `, foreign)}.`,
  );
  const sieges = siegesLine(v);
  if (sieges.length > 0) sb.appendLine(`- ` + sieges);
  if (v.scheduled.length === 0)
    sb.appendLine(
      `- Your scheduled orders: none; your units hold where they stand.`,
    );
  else {
    sb.appendLine(
      `- Your scheduled orders (each follows its unit, named here by where it stands now):`,
    );
    for (const plan of v.scheduled)
      sb.appendLine(
        `  turn ${plan.turn}${whenMet(plan.conditions)}: ${joinS(
          `; `,
          plan.orders.map((o) => planned(o, v)),
        )}`,
      );
  }
  if (v.standing.length === 0) sb.appendLine(`- Your standing orders: none.`);
  else {
    sb.appendLine(`- Your standing orders:`);
    for (const st of v.standing) sb.appendLine(`  ${standingLine(st, v)}`);
  }
  if (v.answers.length > 0)
    sb.appendLine(
      `- Your standing answers: ${joinS(`; `, v.answers.map(answerText))}.`,
    );
  const ready = v.court.filter((c) => c.ready).map((c) => `${c.id} ${c.name}`);
  sb.appendLine(
    `- Your people at court and ready to be sent: ${ready.length === 0 ? `nobody` : joinS(`; `, ready)}.`,
  );
  const away = v.court
    .filter((c) => !c.ready)
    .map(
      (c) =>
        `${c.id} ${c.name} (${c.duty}${c.timing.length > 0 ? `; ` + c.timing : ``})`,
    );
  if (away.length > 0)
    sb.appendLine(`- Your other people: ${joinS(`; `, away)}.`);
  return sb.toString();
}

/// <summary>The kind of the king's own unit standing in a province ("army" or "fleet"), or null if none.</summary>
function ownKind(province: string, v: SeatView): string | null {
  const u = v.units.find((u) => u.power === v.power && u.province === province);
  return u !== undefined ? (u.kind === "Army" ? `army` : `fleet`) : null;
}

/// <summary>An order kept for later, as the king reads it: each of its own units named by where it stands now ("the army now in memphis").</summary>
export function planned(o: Order, v: SeatView): string {
  const now = (province: string): string => {
    const kind = ownKind(province, v);
    return kind !== null ? `the ${kind} now in ${province}` : province;
  };
  switch (o.type) {
    case "hold":
    case "move":
    case "besiege":
    case "disband":
    case "giftUnit":
      return describe({ ...o, unit: now(o.unit) });
    case "support":
      return describe({ ...o, unit: now(o.unit), supported: now(o.supported) });
    case "convoy":
      return describe({ ...o, unit: now(o.unit), army: now(o.army) });
    default:
      return describe(o);
  }
}

/// <summary>
/// What happened while the king slept, read when it wakes, before its orders and at its audiences alike: first in
/// brief, then the news of those seasons in full. Empty when nothing waits.
/// </summary>
export function whileYouSlept(v: SeatView): string {
  if (v.whileAsleep.length === 0 && v.digest.length === 0) return ``;
  const sb = new Sb();
  sb.appendLine();
  sb.appendLine(
    `WHILE YOU SLEPT (${v.lastCalled > 0 ? `since you gave orders in turn ${v.lastCalled}` : `since the game began`}):`,
  );
  if (v.digest.length > 0) {
    sb.appendLine(
      `In brief${v.digestLeftOut > 0 ? ` (${v.digestLeftOut} earlier lines left out)` : ``}:`,
    );
    for (const d of v.digest) sb.appendLine(`- ${d}`);
  }
  if (v.whileAsleep.length > 0) {
    sb.appendLine(
      `The news of those seasons, oldest first (routine treasury notices left out${v.whileAsleepLeftOut > 0 ? `; ${v.whileAsleepLeftOut} earlier items left out` : ``}):`,
    );
    for (const i of v.whileAsleep)
      sb.appendLine(
        `[turn ${i.turn}] [${i.kind}] ${i.title}: ${i.kind === "Battle" ? withoutHolds(i.body) : i.body}`,
      );
  }
  return sb.toString();
}

/// <summary>The season's news as the court has it: everything delivered to it this season, oldest first.</summary>
export function news(v: SeatView): string {
  const sb = new Sb();
  sb.appendLine(`NEWS THIS SEASON:`);
  if (v.inbox.length === 0) sb.appendLine(`- nothing`);
  for (const i of v.inbox) {
    sb.appendLine(
      `[${i.kind}] ${i.title}: ${i.kind === "Battle" ? withoutHolds(i.body) : i.body}`,
    );
    if (i.clauses.length > 0)
      sb.appendLine(
        `  The answer in clauses, as reported: ${joinS(`; `, i.clauses.map(clauseTag))}.`,
      );
  }
  return sb.toString();
}

/// <summary>
/// What a host has before it as it holds court: its own land and troops in brief (with its orders standing, its realm in
/// brief: <see cref="RealmBrief"/>), what happened while it slept (an envoy at its door is what most often wakes it), and
/// the season's news.
/// </summary>
export function courtBrief(v: SeatView, ordersStand = false): string {
  const sb = new Sb();
  if (ordersStand) sb.append(realmBrief(v));
  else {
    const land = sortBy(
      [...v.owner].filter((x) => x[1] === v.power).map((x) => x[0]),
      [(x) => x, cmpStr],
    );
    const troops = v.units
      .filter((u) => u.power === v.power)
      .map((u) => `${u.kind === "Army" ? `army` : `fleet`} in ${u.province}`);
    sb.appendLine(
      `YOUR LAND: ${land.length === 0 ? `none` : joinS(`, `, land)}. YOUR TROOPS: ${troops.length === 0 ? `none` : joinS(`, `, troops)}.`,
    );
  }
  const slept = whileYouSlept(v);
  if (slept.length > 0) {
    sb.append(slept);
    sb.appendLine();
  }
  sb.append(news(v));
  return sb.toString();
}

/// <summary>
/// Every power's land standing, which any court can reckon from who holds what: a land-yield ratio (the land it holds
/// now against its homeland's yield), labelled as not growth, in one line; fallen kingdoms are named at the end.
/// </summary>
export function standings(v: SeatView): string {
  const all = Views.landStandings(v.owner, v.fallen);
  const living = all
    .filter((x) => !x.fallen)
    .map(
      (x) =>
        `${x.power}${x.power === v.power ? ` (you)` : ``} ${fmt(landGrowth(x), "0.00")} (land yield ${x.yield}, at the start ${x.startYield})`,
    );
  const fallen = all.filter((x) => x.fallen).map((x) => x.power);
  return (
    `LAND STANDINGS (land-yield ratios, not growth; see WHAT YOU SEE): ${joinS(`; `, living)}.` +
    (fallen.length > 0 ? ` Fallen: ${joinS(`, `, fallen)}.` : ``)
  );
}

/**
 * "Gold is a lifeline" (item 11a): what gold is worth to a king, said wherever a request asks him to give, take or keep it.
 */
export const GoldLifeline =
  "Gold is part of how you win (it counts in your strength) and your security: it pays the troops who would otherwise desert, the ransoms and the envoys. Give it only for what it buys on average over a time you can name: a gift buys favour, a bribe a softer report or a secret, a fee a servant's work, a loan interest, tribute peace. Gold you send abroad, or pay to people, leaves your realm. Gold you borrow counts as yours until you repay it; repaying costs you now and keeps lenders lending, defaulting keeps the gold and costs your name.";

export function person(c: CharacterView): string {
  const parts: string[] = [`${c.id} ${c.name} of ${c.origin}`];
  if (c.ours) {
    parts.push(c.ready ? `at court, ready for a mission` : c.duty);
    if (c.timing.length > 0) parts.push(c.timing);
  } else {
    parts.push(
      c.status !== `your captive`
        ? c.status
        : c.intercepted
          ? `your captive (an envoy your besiegers caught)`
          : `your captive (a caught spy)`,
    );
    if (c.employer !== null) parts.push(`serves ${c.employer}`);
    if (c.heldByYou) parts.push(`held at your court against their will`);
    if (c.where.length > 0) parts.push(c.where);
  }
  // Item 13: battles won and lost commanding an army, which anyone who saw them can count.
  if (c.won + c.lost > 0)
    parts.push(
      `commanded in ${c.won + c.lost} battles: won ${c.won}, lost ${c.lost}`,
    );
  if (c.term.length > 0) parts.push(c.term);
  if (c.owed !== null)
    parts.push(`you let ${c.owed} shekels of their fee fall due unpaid`);
  if (c.ransomCarrier !== null)
    parts.push(
      `a ransom demand for them, with nobody going that way, would hire a carrier at your court for ${c.ransomCarrier} shekels from your treasury`,
    );
  if (c.lends !== null)
    parts.push(
      `offers to lend you up to ${c.lends.amount} shekels, asking ${c.lends.perHundred} in a hundred more back after ${c.lends.seasons} seasons`,
    );
  for (const n of c.news)
    parts.push(
      `offers news of ${n.court} as they saw it in turn ${n.turn} (${n.lines} ${n.lines === 1 ? "report" : "reports"}) for ${n.price} shekels (order buy_news)`,
    );
  if (c.knownFacts.length > 0) parts.push(`known: ` + joinS(` `, c.knownFacts));
  if (c.pitch !== null) parts.push(`pitch: "${c.pitch}"`);
  // Item 12: what they say they speak, never their skill.
  if (c.speaks.length > 0)
    parts.push(`says they speak ${joinS(`, `, c.speaks)}`);
  if (c.askingPrice !== null)
    parts.push(`asks ${c.askingPrice} a season of a job's term`);
  return joinS(`; `, parts);
}

export function audience(a: AudienceView, inCourt = false): string {
  const sb = new Sb();
  sb.appendLine(
    `AN AUDIENCE (round ${a.round} of at most ${a.maxRounds}). ${a.envoy.name} (${a.envoy.id}), envoy of ${a.from}, stands before you.`,
  );
  if (a.envoy.knownFacts.length > 0)
    sb.appendLine(
      `What you know of ${a.envoy.name}: ${joinS(` `, a.envoy.knownFacts)}`,
    );
  sb.appendLine(
    a.greeting.length > 0
      ? `The sealed greeting reads: "${a.greeting}"`
      : `The tablet bears no greeting at all.`,
  );
  if (a.greetingDeviations.length > 0)
    sb.appendLine(
      `It departs from the custom: ${joinS(`; `, a.greetingDeviations)}.`,
    );
  if (a.presented > 0)
    sb.appendLine(
      `While nobody at your court understood ${a.envoy.name}, he presented gifts weighing ${a.presented} shekels, which are in your treasury.`,
    );
  if (a.heardThrough !== null)
    sb.appendLine(
      `Nobody else here speaks with ${a.envoy.name}: ${a.heardThrough} carries his words to you, and yours to him.`,
    );
  sb.appendLine(`${a.envoy.name} says: "${a.spoken}"`);
  if (a.clauses.length > 0)
    sb.appendLine(
      `The clauses ${a.envoy.name} recited: ${joinS(`; `, a.clauses.map(clauseTag))}.`,
    );
  for (const x of a.soFar) {
    sb.appendLine(`You answered: "${x.host}"`);
    sb.appendLine(`${a.envoy.name} replied: "${x.envoy}"`);
  }
  if (a.goldWeighed > 0 && !a.inventory)
    sb.appendLine(
      `The gold came with no inventory: nobody can say what was sent. Your weighers found ${a.goldWeighed} shekels. Its purity is unknown until you pay for an assay.`,
    );
  else if (a.goldStated > 0)
    sb.appendLine(
      `The inventory on the tablet lists ${a.goldStated} shekels of gold; your weighers found ${a.goldWeighed}. Its purity is unknown until you pay for an assay.`,
    );
  if (a.proposal !== null)
    sb.appendLine(
      a.proposalSealed
        ? `You chose at an earlier exchange to seal the tablet the envoy brought (already sealed by ${joinS(`, `, a.proposal.seals)}${a.proposal.allianceOath ? ` as a sworn alliance` : ``}${a.proposal.vassal !== null ? ` as a vassal treaty, ${a.proposal.vassal} the vassal` : ``}), and your seal is set on it when the audience ends: "${a.proposal.text}"`
        : `The envoy brings a tablet for you to seal, already sealed by ${joinS(`, `, a.proposal.seals)}${a.proposal.allianceOath ? ` as a sworn alliance` : ``}${a.proposal.vassal !== null ? ` as a vassal treaty, ${a.proposal.vassal} the vassal` : ``}: "${a.proposal.text}"`,
    );
  if (a.proposal !== null && a.proposal.clauses.length > 0)
    sb.appendLine(
      `The tablet's clauses: ${joinS(`; `, a.proposal.clauses.map(clauseTag))}.`,
    );
  for (const t of a.copiesShown)
    sb.appendLine(
      `The envoy shows you a tablet as evidence, bearing the seals of ${joinS(`, `, t.seals)}${t.sealedTurn !== null ? `, dated turn ${t.sealedTurn}` : ``}: "${t.text}"`,
    );
  // Item 9: the seal is plain to see; the limits and the mandate only with the credentials shown.
  if (a.sealCarried)
    sb.appendLine(
      `${a.envoy.name} carries the seal of ${a.from}: he may seal a tablet of yours in his king's name (your_tablet_clauses), which binds his king unless the king repudiates it as beyond his authority.`,
    );
  if (a.credentials !== null)
    sb.appendLine(
      `${a.envoy.name} shows his credentials. His mandate: "${a.shownMandate ?? ``}". ${authorityText(a.credentials, (x) => WorldMap.default.get(x).name)}`,
    );
  if (a.secretMandate !== null)
    sb.appendLine(
      `This envoy secretly serves you. Their real instructions were: "${a.secretLetter}" Mandate: "${a.secretMandate}".`,
    );
  if (a.goldBackNamed > 0)
    sb.appendLine(
      `You have already named ${a.goldBackNamed} shekels to send home with the envoy; a new amount replaces it, 0 keeps it.`,
    );
  if (a.giftAccepted > 0)
    sb.appendLine(
      `${a.envoy.name} has already accepted your gift of ${a.giftAccepted} shekels. An envoy takes one gift per audience: another gift would not be given.`,
    );
  // Item 11a, "Gold is a lifeline": what gold given or sent home is worth to the king who gives it.
  sb.appendLine(GoldLifeline);
  if (a.ordersStand && !inCourt) sb.append(ordersStandAtCourt(a));
  sb.appendLine(
    a.round < a.maxRounds
      ? `Answer the envoy. You may end the audience now, or leave it open for one more exchange.`
      : `This is the last exchange of the audience: it ends with your answer.`,
  );
  return sb.toString();
}

/// <summary>
/// What a king whose orders stand may do at its court besides answering the envoys: send letters, and reopen its orders
/// unless it has already chosen to; and the letters it has already sent from its court this season. Said once a court.
/// </summary>
export function ordersStandAtCourt(a: AudienceView): string {
  const sb = new Sb();
  // Once it chose to reopen its orders, they no longer stand, and it is not asked again (its schema has no reopen_orders).
  if (a.reopenChosen)
    sb.appendLine(
      `You have already chosen to reopen your orders this season: you give orders after your audiences, with your full view. ` +
        `At this audience you may still send envoys of yours who are at court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at the end of this season with everyone's orders and are checked first. A letter sent now costs what it would in your orders (its gold, the scribe's fee for a tablet, one of the envoys who may leave your court this season).`,
    );
  else
    sb.appendLine(
      `YOUR ORDERS STAND WHILE YOU SLEEP. At this audience you may also send envoys of yours who are at court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at the end of this season with everyone's orders and are checked first. A letter sent now costs what it would in your orders (its gold, the scribe's fee for a tablet, one of the envoys who may leave your court this season); if you let your orders stand and send none, your next letters leave only when you next give orders. ` +
        `Reopen your orders (reopen_orders) if the news changes your plan: you then give orders this season, with your full view, after your audiences. Otherwise your orders stand and you sleep on.`,
    );
  if (a.lettersSent.length > 0)
    sb.appendLine(
      `Letters you have already sent from your audiences this season (a new letter for the same person replaces one): ${joinS(`; `, a.lettersSent.map(inFull))}.${lettersGold(a.lettersSent)}`,
    );
  return sb.toString();
}

/** A grant as its two kings read it in their view (item 9). */
export function grantLine(g: GrantView, me: Power): string {
  const where =
    g.province !== null
      ? WorldMap.default.get(g.province).name
      : `all ${g.grantor === me ? `your` : `${g.grantor}'s`} land`;
  const what =
    g.kind === `passage`
      ? `pass through ${where}`
      : `stand within the walls of ${where}`;
  const who =
    g.grantor === me
      ? `${g.grantee}'s troops may ${what}`
      : `your troops may ${what}, by leave of ${g.grantor}`;
  return `${who}, since turn ${g.sinceTurn}${g.untilTurn !== null ? `, until turn ${g.untilTurn}` : `, until revoked`} (${g.tablet}).`;
}

/** A unit's men where it is short of a full levy (item 11a+): ", 600 men"; nothing for a full one. */
/** An own unit's command (item 13): its commander, on his way or with it, word recalling him, and its mandate. */
function commandNote(u: UnitView, v: SeatView): string {
  const parts: string[] = [];
  if (u.reported > 0) parts.push(`as reported in turn ${u.reported}`);
  if (u.hiredMen > 0 && u.hiredUntil !== null)
    parts.push(
      `${u.hiredMen} of its men an enlisted band serving until turn ${u.hiredUntil}`,
    );
  if (u.commander !== null) {
    const name = v.court.find((c) => c.id === u.commander)?.name ?? u.commander;
    parts.push(
      u.commandFrom > v.turn
        ? `${name} on his way to command it, from turn ${u.commandFrom}`
        : `commanded by ${name} (${u.commander})`,
    );
    if (u.relieving) parts.push(`word recalling him on its way`);
  }
  if (u.mandate !== null)
    parts.push(
      `mandate${u.mandateFrom > v.turn ? ` from turn ${u.mandateFrom}` : ``}: ${mandateText(u.mandate)}`,
    );
  return parts.length === 0 ? `` : `; ` + joinS(`; `, parts);
}

function menNote(u: {
  kind: "Army" | "Fleet";
  men: number;
  march?: string | null;
  marchDays?: number;
}): string {
  // Since item 13 units start at the sizes the sources give, so any that is not a full levy's says its men.
  const men = u.men > 0 && u.men !== menOf(u.kind) ? `, ${u.men} men` : ``;
  return (
    men +
    (u.march != null
      ? `, on the road to ${u.march}, about ${u.marchDays} days of road left`
      : ``)
  );
}
