/**
 * A king's prompt text: who he is, his season's situation, his realm, court, standings and news, and his orders as he reads
 * them. Shared blocks are byte-stable so prompt caching hits across seats and seasons; everything that changes goes in the
 * user message after them. Tablets and letters are in prompt-letters.ts, people and audiences in prompt-audience.ts, the
 * economy in prompt-economy.ts.
 */
import {
  AllPowers,
  journeyGroups,
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
  rulerOf,
  standout,
  landGrowth,
  sortBy,
  terrainOf,
  trimEnd,
  answerText,
  type Order,
  type Power,
  type SeatView,
  type SiegeView,
  type StandingOrderView,
  type UnitKind,
  type GrantView,
  grantPlace,
  menOf,
  season,
  counted,
  EconomyData,
  type InboxItem,
  type CharacterView,
} from "@amarna/engine";
import { GoldLifeline, economyLines, worksLines } from "./prompt-economy.ts";
import { person } from "./prompt-audience.ts";
import { NoneRead, copySource, inFull, letterBrief, letterLine, lettersGold, openingTreaties, tabletBrief, tabletLine, whenMet, withoutHolds } from "./prompt-letters.ts";
import { Sb, andList, asViewFigures, joinS, num } from "./text.ts";
export function identity(p: Power, traits: readonly number[]): string {
  // Item 17b: the king is a person, and plays as the man the sources show; his traits shape his play, his stakes decide it.
  const nature = traits.length === 0 ? "" : ` By nature you are ${andList(standout(traits))}.`;
  return `You are ${rulerOf(p)} (${p}). Your homeland: ${joinS(`, `, WorldMap.default.homeOf(p).map(x => x.id))}; your capital is ${WorldMap.default.capital(p).id}.${nature}`;
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
export function sleepLine(v: SeatView, atOrders = false, reopenChosen = false): string
    {
        if (!v.sleeps) return ``;
        // It has never given orders: the first season, or its first call failed and its counsellors kept the kingdom since.
        if (v.lastCalled === 0) return v.turn <= 1 ? `This is your first season.` : `This is the first season you give orders.`;
        const slept = Math.max(0, v.turn - v.lastCalled - 1);
        const line = slept === 0
            ? `You gave orders last season (turn ${v.lastCalled}).`
            : `You slept ${slept} season${(slept === 1 ? `` : `s`)} (you last gave orders in turn ${v.lastCalled}).`;
        const reason = (r: string): string => trimEnd(isEnvoyWaiting(r) ? came(r, atOrders) : r, ".");
        // Woken for its audiences only: its orders stand unless it reopens them there.
        if (v.holdsCourt)
            return `${line} You were woken to receive ${(v.wokenBecause.length === 1 ? `an envoy` : `envoys`)}: ${joinS(`; `, v.wokenBecause.map(reason))}. `
                   + (reopenChosen
                       ? `You chose at an earlier audience this season to reopen your orders: you give orders after your audiences.`
                       : `Your orders stand unless you reopen them at your audience.`);
        return v.wokenBecause.length === 0 ? line : `${line} You were woken because: ${joinS(`; `, v.wokenBecause.map(reason))}.`;
    }

    /// <summary>
    /// An envoy that woke the king, as a request names it ("an envoy of Hatti came to your court"), and in an orders request,
    /// that it was received at the season's audiences, which come before orders.
    /// </summary>
export function came(envoyWaits: string, atOrders: boolean): string {
  return envoyWaits.replaceAll(` waits to be received`, atOrders ? ` came to your court (you received him before these orders)` : ` came to your court`);
}

    /// <summary>
    /// The closing line of an orders request: what the king may now order, naming only what applies ("Requests are rules
    /// too"): its troops if it has any, its envoys and letters if one of its people is at court and ready to be sent, with
    /// sleep on the orders for later seasons, and standing orders, which every king may give (since the additions to the fix
    /// pass after item 4), when it has troops for them to command or sleeps, then anything else.
    /// </summary>
export function ordersLine(v: SeatView): string
    {
        const what: string[] = [];
        const troops = v.units.some(u => u.power === v.power);
        if (troops) what.push(`your troops`);
        if (v.court.some(c => c.ready)) what.push(`your envoys and letters`);
        if (v.sleeps) what.push(`orders scheduled for later seasons`);
        if (v.sleeps || troops) what.push(`standing orders`);
        const list = what.length === 0 ? `` : what.length === 1 ? `: ${what[0]} and anything else` : `: ${joinS(`, `, what)}, and anything else`;
        return v.sleeps
            ? `Now give your orders for this season and the seasons ahead${list}. You sleep after them.`
            : `Now give your orders for this season${list}.`;
    }

    /// <summary>A seat's view as text: what this king knows this season.</summary>
/**
 * Rank (item 8, "Recognition is earned"): each claim to it that is new, or became established in play, and what this court
 * and the others have called each other in the greetings sent between them. Empty when there is nothing to tell.
 */
export function rankLine(v: SeatView): string
    {
        const parts: string[] = [];
        for (const c of v.claims)
            parts.push(c.established === null
                ? `${c.power}'s claim to be a Great King is still new${c.overlord !== null ? ` (${c.overlord} holds ${c.power} its vassal)` : ``}`
                : `${c.power}'s claim to be a Great King is established (since turn ${c.established})`);
        // The greetings sent between this court and the others, by who calls whom brother, each named once.
        const greetings = (lines: SeatView["greetings"], who: (x: SeatView["greetings"][number]) => Power, brother: string, not: string): void => {
            const yes = lines.filter((x) => x.brotherSince !== null).map((x) => `${who(x)} (since turn ${x.brotherSince})`);
            const no = lines.filter((x) => x.brotherSince === null).map((x) => `${who(x)} (turn ${x.lastTurn})`);
            if (yes.length > 0) parts.push(`${brother}: ${joinS(`, `, yes)}`);
            if (no.length > 0) parts.push(`${not}: ${joinS(`, `, no)}`);
        };
        greetings(v.greetings.filter((x) => x.to === v.power), (x) => x.from, `Kings who call you brother`, `Kings who did not call you brother in their last greeting`);
        greetings(v.greetings.filter((x) => x.from === v.power), (x) => x.to, `You call brother`, `You did not call brother in your last greeting`);
        const rank = parts.length === 0 ? "" : `RANK: ${joinS(`. `, parts)}.`;
        const names = namesLine(v);
        return rank.length > 0 && names.length > 0 ? `${rank}\n${names}` : rank + names;
    }

/**
 * Item 17+ ("A power's name is a claim"): the names two or more kings claim, and whom this court's greetings give each to.
 * Empty when no name is contested and the king goes by his own land's name.
 */
export function namesLine(v: SeatView): string
    {
        if (v.nameClaims.length === 0) return "";
        const read = (c: SeatView["nameClaims"][number]) =>
            c.heard.length === 0 ? `` : `, as read in ${joinS(` and in `, c.heard.map((h) => `${h.claimant}'s greeting sealed in ${season(h.sealed, v.power)}`))}`;
        const parts = v.nameClaims.map((c) => `${c.name} is claimed by ${joinS(` and `, c.claimants)}${read(c)}; ${c.givenTo === v.power ? `you hold it` : c.givenTo !== null ? `your court gives it to ${c.givenTo} and calls the other${c.claimants.length > 2 ? `s` : ``} by ${c.claimants.length > 2 ? `their houses` : `his house`}` : `your court has given it to no one`}`);
        return `NAMES CLAIMED (each king as your orders name him): you go by the name of ${v.claimedName}. ${joinS(`. `, parts)}.`;
    }

/**
 * The treasury as the king's ledger has it: his gold, what came in, what each season costs, what his servants' fees still
 * owe and how far people trust his word, and his standing orders for carriers and troops (their orders: the rulebook).
 */
function treasuryLine(v: SeatView): string {
  const came = v.income > 0 ? `${num(v.income)} came in since your last orders (mines and sales)` : `Nothing came in since your last orders`;
  const works = v.worksUpkeep > 0 ? `, what you keep and build in gold ${num(v.worksUpkeep)}` : ``;
  const due = v.feesDue > 0 || v.feesOwed > 0
    ? ` Of their fees, ${num(v.feesDue)} more falls due as their jobs are done${v.feesOwed > 0 ? `, and you let ${num(v.feesOwed)} fall due unpaid` : ``}.`
    : ``;
  const promises = v.kept + v.broken === 0 ? `none kept or broken yet` : `you kept ${v.kept} promises to pay and broke ${v.broken}`;
  const carriers = v.payCarriers ? `You pay the carriers of your letters on delivery, by your standing order.` : `You do not pay the carriers of your letters on delivery.`;
  const troops = v.payTroops && v.feedTroops ? "pays and feeds your troops" : v.payTroops ? "pays your troops but does not feed them from your stores" : v.feedTroops ? "feeds your troops but pays them nothing" : "neither pays nor feeds your troops";
  const pay = v.payHeld.length > 0 ? `, ${v.payTroops ? "pay held back from" : "but pays"} those in ${joinS(", ", v.payHeld)}` : "";
  const food = v.feedHeld.length > 0 ? `, ${v.feedTroops ? "food held back from" : "but feeds"} those in ${joinS(", ", v.feedHeld)}` : "";
  return `TREASURY: ${num(v.gold)} shekels by your ledger. ${came}. Each season: your troops' pay ${num(v.upkeep)}${works}, your servants' fees about ${num(v.fees)}.${due} `
    + `People count on ${v.trust}% of what you promise (${promises}). ${carriers} Your standing order ${troops}${pay}${food}.`;
}

/**
 * How long an envoy takes to each court, by the length of the journey (`journeyGroups`, shared with the human's orders): the
 * courts most journeys reach in the same time are "every other court", the rest named. A journey the view words otherwise
 * stands as it is.
 */
function travelLine(v: SeatView): string {
  const { most, others, odd } = journeyGroups(v.travelTimes);
  const seasons = (n: number): string => `${counted(n)} season${n === 1 ? `` : `s`} each way`;
  const parts = [...others.map((g) => `${seasons(g.seasons)} to ${andList(g.courts)}`), ...odd];
  if (most !== null) parts.push(`${seasons(most.seasons)} to every ${parts.length === 0 ? `` : `other `}court`);
  return joinS(`; `, parts);
}

export function situation(v: SeatView, read: ReadonlySet<string> = NoneRead): string
    {
        const map = WorldMap.default;
        const sb = new Sb();
        const woke = sleepLine(v, true);
        if (woke.length > 0) sb.appendLine(woke);
        sb.appendLine(`SEASON: turn ${v.turn}, ${v.season} by your court's reckoning.`);
        // Item 16, "Omens of the end": what the court's diviners read this season, in words only.
        if (v.omens !== ``) sb.appendLine(`OMENS: ${v.omens}`);
        // Item 13: where the court is, and (item 17b, part C) where the king stands apart from it, from where his orders go out.
        const courtRoad = v.courtTo !== null ? `, on the road to ${v.courtTo}` : ``;
        // #806: a king held abroad plays the captive; a caretaker keeps his realm.
        if (v.heldAt !== null) sb.appendLine(`COURT: you are held captive ${v.heldOnRoad ? `on the road under guard to the court of ${v.heldAt}, and can write nothing until you are there` : `at the court of ${v.heldAt}`}; your court, in ${v.courtAt}, keeps your realm in your name under a caretaker, and your orders are only letters, and in a letter home your ransom, giving in (land ceded, troops given, an envoy sent with a tablet) or a man hired, kept on or posted as a spy at that court to free you (see the rules on a king taken).`);
        else if (v.courtAt !== `` && v.kingAt === null) sb.appendLine(`COURT: you and your court are in ${v.courtAt}${courtRoad}; your orders go out from here (see COMMAND AT A DISTANCE).`);
        else if (v.courtAt !== ``)
          sb.appendLine(`COURT: you are in ${v.kingAt}${v.kingTo !== null ? `, on the road to ${v.kingTo}` : ``}, apart from your court, and your orders go out from there; your court, with your treasury and archive, is in ${v.courtAt}${courtRoad}, where envoys and letters come (see COMMAND AT A DISTANCE).`);
        const rank = rankLine(v);
        if (rank.length > 0) sb.appendLine(rank);
        sb.appendLine(treasuryLine(v));
        sb.appendLine(GoldLifeline);
        // Order names stand in a section's header only, never in its entries.
        if (v.debts.length > 0) sb.appendLine("DEBTS YOU OWE (repay, to a tablet's holder standing at your court):");
        for (const d of v.debts)
            sb.appendLine(`  Your debt ${d.id}: ${d.left === d.owed ? `${num(d.owed)} shekels, none yet repaid` : `${num(d.left)} shekels left of ${num(d.owed)} to repay`} (${d.sealedTurn > 0 ? `${num(d.principal)} lent by ${d.lender} in turn ${d.sealedTurn}` : `owed to ${d.lender} since before the first season`}, to be repaid by turn ${d.dueTurn}); the tablet is held by ${d.holder}${d.here ? `, who stands at your court` : ``}.`);
        if (v.debtsHeld.length > 0) sb.appendLine("DEBT TABLETS YOU HOLD (claims on others):");
        for (const d of v.debtsHeld)
            sb.appendLine(`  Tablet ${d.id}: ${d.holder} owes ${d.left} (${d.sealedTurn > 0 ? `lent by ${d.lender} in turn ${d.sealedTurn}` : `owed to ${d.lender} since before the first season`}, to be repaid by turn ${d.dueTurn})${d.here ? `; they stand at your court` : ``}.`);
        for (const l of economyLines(v)) sb.appendLine(l);
        for (const l of worksLines(v)) sb.appendLine(l);
        // Each lot by what it is, then the court's own mark for it, which only its assay orders use (as for copies of tablets).
        for (const lot of v.unassayedGold)
            sb.appendLine(`  Unassayed gold from ${lot.from}, weighed in turn ${lot.arrivedTurn} [your mark ${lot.id}]: ${lot.weighed} shekels weighed (the inventory said ${lot.stated}).`);
        sb.appendLine(standings(v));

        sb.appendLine();
        sb.appendLine(`LANDS (see WHAT YOU SEE and NEWS AND TRAVEL):`);
        const units = new Map(v.units.map(u => [u.province, u] as const));
        const troop = (id: string): string => {
          const u = units.get(id);
          // A unit short of a full levy's men says how many it has (item 11a+): it counts for that share in battle.
          return u !== undefined ? ` [${u.power} ${(u.kind === "Army" ? `army` : `fleet`)}${menNote(u)}${u.power === v.power ? commandNote(u, v) : ``}]` : ``;
        };
        // The walls as this court knows them (standing now in its sight, elsewhere as last seen) and the ground (see TERRAIN), in one bracket: "lukka (walls 1, rough ground)".
        const marksOf = (id: string): string =>
        {
            const marks: string[] = [];
            const w = v.walls.tryGet(id);
            if (w !== undefined) marks.push(`walls ${w}`);
            if (terrainOf(id) === "Rough" && v.prices.getOrDefault(`terrainDefence`, 1) > 0) marks.push(`rough ground`);
            if (terrainOf(id) === "Desert") marks.push(`desert`);
            return marks.length === 0 ? `` : ` (${joinS(`, `, marks)})`;
        };
        // In sight now; else (item 7b) how old the news is, and who brought it if one of your people did; else as every court knew it at the start.
        const sighted = new Set(v.visible);
        const heard = (id: string): string => {
            if (sighted.has(id)) return `in sight`;
            const asOf = v.ownerAsOf.tryGet(id);
            if (asOf === undefined) return `as it stood at the start`;
            const from = v.ownerFrom.tryGet(id) ?? ``;
            return `heard in turn ${asOf}` + (from === `seen` ? `, when you last saw it` : from.length > 0 && from !== `word from abroad` ? `, from ${from}` : ``);
        };
        // A holder's provinces by how the court knows them: those in sight, those as at the start, then each date of word, oldest first.
        const byWord = (who: string, ids: string[]): string =>
            joinS(`; `, sortBy(groupBy(ids, heard), [g => (sighted.has(g[1][0]) ? -1 : v.ownerAsOf.tryGet(g[1][0]) ?? 0), cmpNum], [g => g[0], cmpStr])
                .map(([h, xs], i) => `${i === 0 ? `${who}, ` : ``}${h}: ${joinS(`, `, xs.map(id => id + marksOf(id) + troop(id)))}`));
        // A power holding only the province of its own name (Gath, gath) goes in one line with the rest of its kind.
        const single = (p: Power | null, ids: string[]): boolean => p !== null && p !== v.power && ids.length === 1 && ids[0] === p.toLowerCase();
        const holders = sortBy(groupBy(v.owner, x => x[1]), [g => (g[0] === null ? 99 : AllPowers.indexOf(g[0])), cmpNum])
            .map(([key, group]) => [key, sortBy(group.map(x => x[0]), [x => x, cmpStr])] as const);
        for (const [key, ids] of holders.filter(([key, ids]) => key !== null && !single(key, ids)))
            sb.appendLine(`- ${byWord(key === v.power ? `${key} (you)` : `${key}`, ids)}`);
        const singles = holders.filter(([key, ids]) => single(key, ids)).flatMap(([, ids]) => ids);
        if (singles.length > 0) sb.appendLine(`- ${byWord(`Powers that hold only the land of their name`, singles)}`);
        const none = holders.find(([key]) => key === null);
        if (none !== undefined) sb.appendLine(`- ${byWord(`Held by no one`, [...none[1]])}`);
        const sieges = siegesLine(v);
        if (sieges.length > 0) sb.appendLine(sieges);
        const atSea = v.units.filter(u => map.get(u.province).isSea);
        if (atSea.length > 0) sb.appendLine(`- At sea: ${joinS(`, `, atSea.map(u => `${u.province} [${u.power} fleet${menNote(u)}]`))}`);
        sb.appendLine(`You can see troops in: ${joinS(`, `, v.visible)}.`);

        sb.appendLine();
        // A list where someone offers news says how to buy it in its header.
        const newsFor = (cs: readonly CharacterView[]): string => (cs.some((c) => c.news.length > 0) ? ` (order buy_news for the news each offers)` : ``);
        sb.appendLine(`YOUR SERVANTS${newsFor(v.court)}:`);
        if (v.court.length === 0) sb.appendLine(`- nobody`);
        for (const c of v.court) sb.appendLine(`- ` + person(c));
        if (v.known.length > 0)
        {
            sb.appendLine(`OTHER PEOPLE YOU KNOW OF${newsFor(v.known)}:`);
            for (const c of v.known) sb.appendLine(`- ` + person(c));
        }
        // Item 12: envoys waiting at court whom nobody understands.
        if (v.unheardHere.length > 0)
            sb.appendLine(`Envoys at your court whom nobody here understands yet: ${joinS(`, `, v.unheardHere.map((id) => v.known.find((c) => c.id === id)?.name ?? id))}. A free person at court who says he speaks his tongue and yours, taken into your service (hire, the errand stay), would carry his words.`);

        if (v.letters.length > 0)
        {
            sb.appendLine(`YOUR LETTERS (as your scribes wrote them):`);
            // In full when sent at the king's last orders or when the report has come since; older letters in a line.
            for (const l of v.letters) sb.appendLine(`- ` + (l.reportedTurn !== null || l.turn >= (v.lastCalled > 0 ? v.lastCalled : v.turn - 1) ? letterLine(l) : letterBrief(l)));
        }

        if (v.tablets.length > 0)
        {
            sb.appendLine(`YOUR ARCHIVE (kept at your capital):`);
            const { lines, rest } = openingTreaties(v.tablets, v.power, read);
            for (const l of lines) sb.appendLine(`- ${l}`);
            for (const t of rest)
                sb.appendLine(`- ${(read.has(t.tabletId) ? tabletBrief(t) : tabletLine(t))}${(t.allianceOath ? ` A sworn alliance.` : ``)}${(t.vassal !== null ? ` A vassal treaty: ${t.vassal} the vassal.` : ``)} (${copySource(t)}${(t.authResult !== null ? `; examined: ` + t.authResult : ``)})`);
        }
        sb.appendLine(`ENVOY TRAVEL (about, by the fastest road open this season): ${travelLine(v)}.`);
        if (v.roadsClosed.length > 0) sb.appendLine(`YOUR ROADS ARE CLOSED to the people of: ${joinS(`, `, v.roadsClosed)}.`);
        if (v.roadsClosedToUs.length > 0) sb.appendLine(`ROADS CLOSED TO YOUR PEOPLE, as far as you have heard, by: ${joinS(`, `, v.roadsClosedToUs)}.`);
        if (v.grants.length > 0)
        {
            sb.appendLine(`PASSAGE AND BASING standing on sealed tablets:`);
            for (const g of v.grants) sb.appendLine(`- ${grantLine(g, v.power)}`);
        }

        if (v.scheduled.length > 0)
        {
            sb.appendLine(`ORDERS YOU HAVE SCHEDULED (each unit named by where it stands now; see PLANNING AHEAD):`);
            for (const plan of v.scheduled) sb.appendLine(`- turn ${plan.turn}${whenMet(plan.conditions)}: ${joinS(`; `, plan.orders.map(o => planned(o, v)))}`);
        }
        if (v.standing.length > 0)
        {
            sb.appendLine(`YOUR STANDING ORDERS (see STANDING ORDERS):`);
            for (const st of v.standing) sb.appendLine(`- ${standingLine(st, v)}`);
        }
        if (v.answers.length > 0)
        {
            sb.appendLine(`YOUR STANDING ANSWERS (see STANDING ANSWERS):`);
            for (const x of v.answers) sb.appendLine(`- ${answerText(x)}`);
        }
        if (v.courtLetters.length > 0)
            sb.appendLine(`LETTERS YOU SENT FROM YOUR AUDIENCES THIS SEASON (they go out with your orders and are checked before them; an order you give now for the same person replaces its letter): `
                          + joinS(`; `, v.courtLetters.map(inFull)) + `.` + lettersGold(v.courtLetters));

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
export function councilBrief(v: SeatView): string
    {
        const c = v.council;
        if (c === null) return ``;
        const sb = new Sb();
        sb.appendLine(`YOUR ROYAL COUNCIL (four advisors on troop orders and levies only, who act on nothing; they see only what you see, so they can be wrong; "pictured seasons" are eight ways this season may go, played out from your view):`);
        if (c.agreed.length > 0) sb.appendLine(`- All four advise: ${joinS(`; `, c.agreed.map((l) => l.text))}.`);
        for (const a of c.advisors)
            sb.appendLine(`- ${a.title.charAt(0).toUpperCase() + a.title.slice(1)} (the ${a.advisor}; ${a.tilt}): ${a.reading}${a.lines.length > 0 ? ` Proposes: ${joinS(`; `, a.lines.map((l) => l.text))}.` : ``}`);
        return sb.toString();
    }

    /// <summary>
    /// The sieges a king knows of, in one line: his own, those of his cities, and those he can see, each with how far the city
    /// has been worn down against its walls. Empty when there are none.
    /// </summary>
export function siegesLine(v: SeatView): string
    {
        if (v.sieges.length === 0) return ``;
        // The tightness matters only at a capital: envoys leaving it, or coming home to it, may be caught.
        const tight = (x: SiegeView): string => {
          const city = WorldMap.default.get(x.province);
          return x.tightness !== null && city.capital && city.home === x.holder
            ? `; tightness ${x.tightness} (envoys ${(x.holder === v.power ? `of yours` : `of ${x.holder}`)} leaving or coming home may be caught)`
            : ``;
        };
        // Its walls are breached once worn down this many steps (WALLS AND SIEGES), as the siege's news counts them.
        const worn = (x: SiegeView): string => `worn down ${x.progress} of ${x.walls * EconomyData.breachPerLevel} steps to a breach`;
        const line = (x: SiegeView): string =>
            x.besieger === v.power ? `your army besieges ${x.province} (${(x.holder !== null ? `held by ${x.holder}` : `held by no one`)}, walls ${x.walls}): ${worn(x)}, since turn ${x.since}${tight(x)}`
            : x.holder === v.power ? `${x.besieger}'s army besieges your city of ${x.province} (walls ${x.walls}): ${worn(x)}, since turn ${x.since}${tight(x)}`
            : `${x.besieger}'s army besieges ${x.province} (${(x.holder !== null ? `held by ${x.holder}` : `held by no one`)}, walls ${x.walls}): ${worn(x)}`;
        return `SIEGES (see WALLS AND SIEGES): ${joinS(`; `, v.sieges.map(line))}.`;
    }

    /// <summary>A standing order as its king reads it: its id, the move it waits for, and its orders.</summary>
function standingLine(st: StandingOrderView, v: SeatView): string
    {
        const when = st.when === "UnitAttacked"
            ? `when your ${ownKind(st.province, v) ?? `unit`} now in ${st.province} is attacked`
            : entersText(v.power, st.power, st.province);
        return `${st.id}: ${when}${whenMet(st.conditions)}, then: ${joinS(`; `, st.orders.map(o => planned(o, v)))}`;
    }

    /// <summary>
    /// What a king reads of its realm when it does not read the full map (woken for its audiences only, reading light alerts,
    /// or having its plan written): its treasury, its land and troops, foreign troops at or inside its borders as far as it
    /// can see, its scheduled and standing orders, and its people at court and away. `purpose`: the header's aside, what the
    /// brief is enough for in that request.
    /// </summary>
export function realmBrief(v: SeatView, purpose = "enough to judge whether the news changes your plan; you see the full map only if you reopen your orders"): string
    {
        const map = WorldMap.default;
        const sb = new Sb();
        const kindOf = (k: UnitKind): string => (k === "Army" ? `army` : `fleet`);
        sb.appendLine(`YOUR REALM IN BRIEF (${purpose}):`);
        sb.appendLine(`- Treasury: ${v.gold} shekels by your ledger; gold in since your last orders ${v.income}; a season your troops' pay ${v.upkeep}${(v.worksUpkeep > 0 ? `, what you keep and build in gold ${v.worksUpkeep}` : ``)}, your people's jobs about ${v.fees}; fees still to fall due ${v.feesDue}${v.debts.length > 0 ? `; debts ${v.debts.reduce((a, d) => a + d.left, 0)}` : ``}.`);
        const hungry = v.units.filter((u) => u.power === v.power && (u.hungry > 0 || u.unpaid > 0));
        if (hungry.length > 0) sb.appendLine(`- Troops hungry or unpaid: ${joinS(`, `, hungry.map((u) => `${u.province}${u.hungry > 0 ? ` hungry ${u.hungry}` : ``}${u.unpaid > 0 ? ` unpaid ${u.unpaid}` : ``}`))}.`);
        const land = sortBy([...v.owner].filter(x => x[1] === v.power).map(x => x[0]), [x => x, cmpStr]);
        sb.appendLine(`- Your land: ${(land.length === 0 ? `none` : joinS(`, `, land))}.`);
        const troops = v.units.filter(u => u.power === v.power).map(u => `${kindOf(u.kind)} in ${u.province}`);
        sb.appendLine(`- Your troops: ${(troops.length === 0 ? `none` : joinS(`, `, troops))}.`);
        const own = new Set(land);
        const foreign: string[] = [];
        for (const u of sortBy(v.units.filter(u => u.power !== v.power), [u => u.province, cmpStr]))
        {
            const next = sortBy(map.neighbors(u.province).filter(x => own.has(x)), [x => x, cmpStr]);
            if (own.has(u.province)) foreign.push(`${u.power} ${kindOf(u.kind)} in ${u.province} (in your land)`);
            else if (next.length > 0) foreign.push(`${u.power} ${kindOf(u.kind)} in ${u.province} (next to your ${joinS(`, `, next)})`);
        }
        sb.appendLine(`- Foreign troops at or inside your borders, as far as you can see: ${(foreign.length === 0 ? `none` : joinS(`; `, foreign))}.`);
        const sieges = siegesLine(v);
        if (sieges.length > 0) sb.appendLine(`- ` + sieges);
        if (v.scheduled.length === 0) sb.appendLine(`- Your scheduled orders: none; your units hold where they stand.`);
        else
        {
            sb.appendLine(`- Your scheduled orders (each follows its unit, named here by where it stands now):`);
            for (const plan of v.scheduled) sb.appendLine(`  turn ${plan.turn}${whenMet(plan.conditions)}: ${joinS(`; `, plan.orders.map(o => planned(o, v)))}`);
        }
        if (v.standing.length === 0) sb.appendLine(`- Your standing orders: none.`);
        else
        {
            sb.appendLine(`- Your standing orders:`);
            for (const st of v.standing) sb.appendLine(`  ${standingLine(st, v)}`);
        }
        if (v.answers.length > 0) sb.appendLine(`- Your standing answers: ${joinS(`; `, v.answers.map(answerText))}.`);
        const ready = v.court.filter(c => c.ready).map(c => `${c.id} ${c.name}`);
        sb.appendLine(`- Your people at court and ready to be sent: ${(ready.length === 0 ? `nobody` : joinS(`; `, ready))}.`);
        const away = v.court.filter(c => !c.ready).map(c => `${c.id} ${c.name} (${c.duty}${(c.timing.length > 0 ? `; ` + c.timing : ``)})`);
        if (away.length > 0) sb.appendLine(`- Your other people: ${joinS(`; `, away)}.`);
        return sb.toString();
    }

    /// <summary>The kind of the king's own unit standing in a province ("army" or "fleet"), or null if none.</summary>
function ownKind(province: string, v: SeatView): string | null {
  const u = v.units.find(u => u.power === v.power && u.province === province);
  return u !== undefined ? (u.kind === "Army" ? `army` : `fleet`) : null;
}

    /// <summary>An order kept for later, as the king reads it: each of its own units named by where it stands now ("the army now in memphis").</summary>
export function planned(o: Order, v: SeatView): string
    {
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
          case "fold":
            return describe({ ...o, unit: now(o.unit), into: now(o.into) });
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
export function whileYouSlept(v: SeatView): string
    {
        if (v.whileAsleep.length === 0 && v.digest.length === 0) return ``;
        const sb = new Sb();
        sb.appendLine();
        sb.appendLine(`WHILE YOU SLEPT (${(v.lastCalled > 0 ? `since you gave orders in turn ${v.lastCalled}` : `since the game began`)}):`);
        if (v.digest.length > 0)
        {
            sb.appendLine(`In brief${(v.digestLeftOut > 0 ? ` (${v.digestLeftOut} earlier lines left out)` : ``)}:`);
            for (const d of v.digest) sb.appendLine(`- ${asViewFigures(d)}`);
        }
        if (v.whileAsleep.length > 0)
        {
            sb.appendLine(`The news of those seasons, oldest first (routine treasury notices left out${(v.whileAsleepLeftOut > 0 ? `; ${v.whileAsleepLeftOut} earlier items left out` : ``)}):`);
            for (const [turn, items] of groupBy(v.whileAsleep, (i) => i.turn)) for (const line of newsLines(items)) sb.appendLine(`[turn ${turn}] ${line.text}`);
        }
        return sb.toString();
    }

/** The kinds of news that are word, not certain fact, and how a headline names them. */
const Hearsay: Partial<Record<InboxItem["kind"], string>> = { Rumor: "rumour", SpyReport: "a spy's report" };

/**
 * A piece of news's headline: its title, without its kind where the title repeats it ("Catastrophe: Earthquake" is
 * "Earthquake"), and named as rumour or a spy's report where it is one, so word does not read as fact.
 */
function headline(i: InboxItem): string {
  const title = i.title.startsWith(`${i.kind}: `) ? i.title.charAt(i.kind.length + 2).toUpperCase() + i.title.slice(i.kind.length + 3) : i.title;
  const word = Hearsay[i.kind];
  return word === undefined ? title : title === i.kind ? word.charAt(0).toUpperCase() + word.slice(1) : `${title} (${word})`;
}

/**
 * A season's news as lines, each "headline: body", in the view's figures. Notices of the season under one headline, with
 * no clauses of their own, share one line where the first stood: sentences that open alike say the opening once ("You
 * settled loose men: about 2,600 in Harran, 973 in Taidu."), others follow one another.
 */
function newsLines(items: readonly InboxItem[]): { text: string; clauses: InboxItem["clauses"] }[] {
  const body = (i: InboxItem): string => asViewFigures(i.kind === "Battle" ? withoutHolds(i.body) : i.body);
  const lines: { head: string; bodies: string[]; clauses: InboxItem["clauses"] }[] = [];
  for (const i of items) {
    const head = headline(i);
    const same = i.clauses.length === 0 ? lines.find((l) => l.head === head && l.clauses.length === 0) : undefined;
    if (same !== undefined) same.bodies.push(body(i));
    else lines.push({ head, bodies: [body(i)], clauses: i.clauses });
  }
  return lines.map((l) => ({ text: `${l.head}: ${merged(l.bodies)}`, clauses: l.clauses }));
}

/**
 * Bodies under one headline, one after another, except that sentences that open with the same two words say the opening
 * once, where the first of them stood.
 */
function merged(bodies: readonly string[]): string {
  const sentence = (b: string): boolean => b.endsWith(`.`) && !b.slice(0, -1).includes(`. `);
  const opening = (b: string): string => b.split(` `).slice(0, 2).join(` `);
  const runs: string[][] = [];
  for (const b of bodies) {
    const run = sentence(b) ? runs.find((r) => sentence(r[0]) && opening(r[0]) === opening(b)) : undefined;
    if (run !== undefined) run.push(b);
    else runs.push([b]);
  }
  return joinS(` `, runs.map(saidOnce));
}

/**
 * Sentences that open alike, with their opening said once. An opening that ends in a colon is a list's: it stops there, so
 * each item keeps all of its own words ("about 2,600 in Harran"), and the items are parted by commas where none holds one.
 */
function saidOnce(run: readonly string[]): string {
  if (run.length === 1) return run[0];
  const words = run.map((b) => b.split(` `));
  let shared = 0;
  while (words.every((w) => shared < w.length - 1 && w[shared] === words[0][shared])) shared++;
  const colon = words[0].slice(0, shared).map((w) => w.endsWith(`:`)).lastIndexOf(true);
  if (colon >= 0) shared = colon + 1;
  if (shared < 2) return joinS(` `, run);
  const items = words.map((w) => w.slice(shared).join(` `).slice(0, -1));
  return `${words[0].slice(0, shared).join(` `)} ${joinS(colon >= 0 && !items.some((i) => i.includes(`, `)) ? `, ` : `; `, items)}.`;
}

    /// <summary>The season's news as the court has it: everything delivered to it this season, oldest first.</summary>
export function news(v: SeatView): string
    {
        const sb = new Sb();
        sb.appendLine(`NEWS THIS SEASON:`);
        if (v.inbox.length === 0) sb.appendLine(`- nothing`);
        for (const line of newsLines(v.inbox)) {
            sb.appendLine(line.text);
            if (line.clauses.length > 0) sb.appendLine(`  The answer in clauses, as reported: ${joinS(`; `, line.clauses.map(clauseTag))}.`);
        }
        return sb.toString();
    }

    /// <summary>
    /// What a host has before it as it holds court: its own land and troops in brief (with its orders standing, its realm in
    /// brief: <see cref="RealmBrief"/>), what happened while it slept (an envoy at its door is what most often wakes it), and
    /// the season's news.
    /// </summary>
export function courtBrief(v: SeatView, ordersStand = false): string
    {
        const sb = new Sb();
        if (ordersStand) sb.append(realmBrief(v));
        else
        {
            const land = sortBy([...v.owner].filter(x => x[1] === v.power).map(x => x[0]), [x => x, cmpStr]);
            const troops = v.units.filter(u => u.power === v.power).map(u => `${(u.kind === "Army" ? `army` : `fleet`)} in ${u.province}`);
            sb.appendLine(`YOUR LAND: ${(land.length === 0 ? `none` : joinS(`, `, land))}. YOUR TROOPS: ${(troops.length === 0 ? `none` : joinS(`, `, troops))}.`);
        }
        const slept = whileYouSlept(v);
        if (slept.length > 0)
        {
            sb.append(slept);
            sb.appendLine();
        }
        sb.append(news(v));
        return sb.toString();
    }

    /// <summary>
    /// Every power's land standing, which any court can reckon from who holds what: a land-yield ratio (the land it holds
    /// now against its homeland's yield), labelled as not growth, in one line: those changed since the start with their ratio,
    /// then the rest by their yield; fallen kingdoms are named at the end.
    /// </summary>
export function standings(v: SeatView): string
    {
        const all = Views.landStandings(v.owner, v.fallen);
        const living = all.filter(x => !x.fallen);
        const who = (p: Power): string => `${p}${(p === v.power ? ` (you)` : ``)}`;
        const changed = living.filter(x => x.yield !== x.startYield).map(x => `${who(x.power)} ${fmt(landGrowth(x), "0.00")} (land yield ${x.yield}, was ${x.startYield})`);
        const same = living.filter(x => x.yield === x.startYield).map(x => `${who(x.power)} ${x.yield}`);
        const fallen = all.filter(x => x.fallen).map(x => x.power);
        return `LAND STANDINGS (land-yield ratios, not growth; see WHAT YOU SEE):`
               + (changed.length > 0 ? ` Changed since the start: ${joinS(`; `, changed)}.` : ``)
               + (same.length > 0 ? ` Unchanged, ratio 1.00 (land yield): ${joinS(`, `, same)}.` : ``)
               + (fallen.length > 0 ? ` Fallen: ${joinS(`, `, fallen)}.` : ``);
    }

export function grantLine(g: GrantView, me: Power): string {
  const where = grantPlace(g, g.grantor === me ? `your` : `his`, (id) => WorldMap.default.get(id).name);
  const what = g.kind === `passage` ? `pass through ${where}` : `stand within the walls of ${where}`;
  const who = g.grantor === me ? `${g.grantee}'s troops may ${what}` : `your troops may ${what}, by leave of ${g.grantor}`;
  return `${who}, since turn ${g.sinceTurn}${g.untilTurn !== null ? `, until turn ${g.untilTurn}` : `, until revoked`} (${g.tablet}).`;
}

/** An own unit's command (item 13): its commander, on his way or with it, word recalling him, and its mandate. */
function commandNote(u: UnitView, v: SeatView): string {
  const parts: string[] = [];
  if (u.reported > 0) parts.push(`as reported in turn ${u.reported}`);
  if (u.hiredMen > 0 && u.hiredUntil !== null) parts.push(`${num(u.hiredMen)} of its men an enlisted band serving until turn ${u.hiredUntil}`);
  if (u.commander !== null) {
    const name = v.court.find((c) => c.id === u.commander)?.name ?? u.commander;
    parts.push(u.commandFrom > v.turn ? `${name} on his way to command it, from turn ${u.commandFrom}` : `commanded by ${name} (${u.commander})`);
    if (u.relieving) parts.push(`word recalling him on its way`);
  }
  if (u.mandate !== null) parts.push(`mandate${u.mandateFrom > v.turn ? ` from turn ${u.mandateFrom}` : ``}: ${mandateText(u.mandate)}`);
  return parts.length === 0 ? `` : `; ` + joinS(`; `, parts);
}

/** A unit's men where it is not a full levy (item 11a+): ", 4,887 men"; nothing for a full one. */
function menNote(u: { kind: "Army" | "Fleet"; men: number; march?: string | null; marchDays?: number }): string {
  // Since item 13 units start at the sizes the sources give, so any that is not a full levy's says its men.
  const men = u.men > 0 && u.men !== menOf(u.kind) ? `, ${num(u.men)} men` : ``;
  return men + (u.march != null ? `, on the road to ${u.march}, about ${u.marchDays} days of road left` : ``);
}
