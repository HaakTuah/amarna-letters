/**
 * A person and an audience as a king reads them in his prompt: who the person is and what the court knows of it, and the
 * envoy, its gifts and the letters already sent from the audiences of the season.
 */
import {
  WorldMap,
  clauseTag,
  type AudienceView,
  type CharacterView,
  authorityText,
  nameFrom,
} from "@amarna/engine";
import { GoldLifeline } from "./prompt-economy.ts";
import { inFull, lettersGold } from "./prompt-letters.ts";
import { Sb, joinS } from "./text.ts";

export function person(c: CharacterView): string
    {
        const parts: string[] = [`${c.id} ${nameFrom(c)}`];
        if (c.ours)
        {
            parts.push(c.ready ? `at court, ready for a mission` : c.duty);
            if (c.timing.length > 0) parts.push(c.timing);
        }
        else
        {
            parts.push(c.status !== `your captive` ? c.status : c.intercepted ? `your captive (an envoy your besiegers caught)` : `your captive (a caught spy)`);
            if (c.employer !== null) parts.push(`serves ${c.employer}`);
            if (c.heldByYou) parts.push(`held at your court against their will`);
            if (c.where.length > 0) parts.push(c.where);
        }
        // Item 13: battles won and lost commanding an army, which anyone who saw them can count.
        if (c.won + c.lost > 0) parts.push(`commanded in ${c.won + c.lost} battles: won ${c.won}, lost ${c.lost}`);
        if (c.term.length > 0) parts.push(c.term);
        if (c.owed !== null) parts.push(`you let ${c.owed} shekels of their fee fall due unpaid`);
        if (c.ransomCarrier !== null) parts.push(`a ransom demand for them, with nobody going that way, would hire a carrier at your court for ${c.ransomCarrier} shekels from your treasury`);
        if (c.lends !== null) parts.push(`offers to lend you up to ${c.lends.amount} shekels, asking ${c.lends.perHundred}% more back after ${c.lends.seasons} seasons`);
        for (const n of c.news) parts.push(`offers news of ${n.court} as they saw it in turn ${n.turn} (${n.lines} ${n.lines === 1 ? "report" : "reports"}) for ${n.price} shekels (order buy_news)`);
        if (c.knownFacts.length > 0) parts.push(`known: ` + joinS(` `, c.knownFacts));
        if (c.pitch !== null) parts.push(`pitch: "${c.pitch}"`);
        // Item 12: what they say they speak, never their skill.
        if (c.speaks.length > 0) parts.push(`says they speak ${joinS(`, `, c.speaks)}`);
        if (c.askingPrice !== null) parts.push(`asks ${c.askingPrice} a season of a job's term`);
        return joinS(`; `, parts);
    }

export function audience(a: AudienceView, inCourt = false): string
    {
        const sb = new Sb();
        sb.appendLine(`AN AUDIENCE (round ${a.round} of at most ${a.maxRounds}). ${a.envoy.name} (${a.envoy.id}), envoy of ${a.from}, stands before you.`);
        if (a.envoy.knownFacts.length > 0) sb.appendLine(`What you know of ${a.envoy.name}: ${joinS(` `, a.envoy.knownFacts)}`);
        sb.appendLine(a.greeting.length > 0 ? `The sealed greeting reads: "${a.greeting}"` : `The tablet bears no greeting at all.`);
        if (a.greetingDeviations.length > 0) sb.appendLine(`It departs from the custom: ${joinS(`; `, a.greetingDeviations)}.`);
        if (a.presented > 0) sb.appendLine(`While nobody at your court understood ${a.envoy.name}, he presented gifts weighing ${a.presented} shekels, which are in your treasury.`);
        if (a.heardThrough !== null) sb.appendLine(`Nobody else here speaks with ${a.envoy.name}: ${a.heardThrough} carries his words to you, and yours to him.`);
        sb.appendLine(`${a.envoy.name} says: "${a.spoken}"`);
        if (a.clauses.length > 0) sb.appendLine(`The clauses ${a.envoy.name} recited: ${joinS(`; `, a.clauses.map(clauseTag))}.`);
        for (const x of a.soFar)
        {
            sb.appendLine(`You answered: "${x.host}"`);
            sb.appendLine(`${a.envoy.name} replied: "${x.envoy}"`);
        }
        if (a.goldWeighed > 0 && !a.inventory)
            sb.appendLine(`The gold came with no inventory: nobody can say what was sent. Your weighers found ${a.goldWeighed} shekels. Its purity is unknown until you pay for an assay.`);
        else if (a.goldStated > 0)
            sb.appendLine(`The inventory on the tablet lists ${a.goldStated} shekels of gold; your weighers found ${a.goldWeighed}. Its purity is unknown until you pay for an assay.`);
        if (a.proposal !== null)
            sb.appendLine(a.proposalSealed
                ? `You chose at an earlier exchange to seal the tablet the envoy brought (already sealed by ${joinS(`, `, a.proposal.seals)}${(a.proposal.allianceOath ? ` as a sworn alliance` : ``)}${(a.proposal.vassal !== null ? ` as a vassal treaty, ${a.proposal.vassal} the vassal` : ``)}), and your seal is set on it when the audience ends: "${a.proposal.text}"`
                : `The envoy brings a tablet for you to seal, already sealed by ${joinS(`, `, a.proposal.seals)}${(a.proposal.allianceOath ? ` as a sworn alliance` : ``)}${(a.proposal.vassal !== null ? ` as a vassal treaty, ${a.proposal.vassal} the vassal` : ``)}: "${a.proposal.text}"`);
        if (a.proposal !== null && a.proposal.clauses.length > 0) sb.appendLine(`The tablet's clauses: ${joinS(`; `, a.proposal.clauses.map(clauseTag))}.`);
        for (const t of a.copiesShown)
            sb.appendLine(`The envoy shows you a tablet as evidence, bearing the seals of ${joinS(`, `, t.seals)}${(t.sealedTurn !== null ? `, dated turn ${t.sealedTurn}` : ``)}: "${t.text}"`);
        // Item 9: the seal is plain to see; the limits and the mandate only with the credentials shown.
        if (a.sealCarried) sb.appendLine(`${a.envoy.name} carries the seal of ${a.from}: he may seal a tablet of yours in his king's name (your_tablet_clauses), which binds his king unless the king repudiates it as beyond his authority.`);
        if (a.credentials !== null)
            sb.appendLine(`${a.envoy.name} shows his credentials. His mandate: "${a.shownMandate ?? ``}". ${authorityText(a.credentials, (x) => WorldMap.default.get(x).name)}`);
        if (a.secretMandate !== null)
            sb.appendLine(`This envoy secretly serves you. Their real instructions were: "${a.secretLetter}" Mandate: "${a.secretMandate}".`);
        if (a.goldBackNamed > 0)
            sb.appendLine(`You have already named ${a.goldBackNamed} shekels to send home with the envoy; a new amount replaces it, 0 keeps it.`);
        if (a.giftAccepted > 0)
            sb.appendLine(`${a.envoy.name} has already accepted your gift of ${a.giftAccepted} shekels. An envoy takes one gift per audience: another gift would not be given.`);
        // Item 11a, "Gold is a lifeline": what gold given or sent home is worth to the king who gives it.
        sb.appendLine(GoldLifeline);
        if (a.ordersStand && !inCourt) sb.append(ordersStandAtCourt(a));
        sb.appendLine(a.round < a.maxRounds
            ? `Answer the envoy. You may end the audience now, or leave it open for one more exchange.`
            : `This is the last exchange of the audience: it ends with your answer.`);
        return sb.toString();
    }

    /// <summary>
    /// What a king whose orders stand may do at its court besides answering the envoys: send letters, and reopen its orders
    /// unless it has already chosen to; and the letters it has already sent from its court this season. Said once a court.
    /// </summary>
export function ordersStandAtCourt(a: AudienceView): string
    {
        const sb = new Sb();
        // Once it chose to reopen its orders, they no longer stand, and it is not asked again (its schema has no reopen_orders).
        if (a.reopenChosen)
            sb.appendLine(`You have already chosen to reopen your orders this season: you give orders after your audiences, with your full view. `
                          + `At this audience you may still send envoys of yours who are at court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at the end of this season with everyone's orders and are checked first. A letter sent now costs what it would in your orders (its gold, the scribe's fee for a tablet, one of the envoys who may leave your court this season).`);
        else
            sb.appendLine(`YOUR ORDERS STAND WHILE YOU SLEEP. At this audience you may also send envoys of yours who are at court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at the end of this season with everyone's orders and are checked first. A letter sent now costs what it would in your orders (its gold, the scribe's fee for a tablet, one of the envoys who may leave your court this season); if you let your orders stand and send none, your next letters leave only when you next give orders. `
                          + `Reopen your orders (reopen_orders) if the news changes your plan: you then give orders this season, with your full view, after your audiences. Otherwise your orders stand and you sleep on.`);
        if (a.lettersSent.length > 0)
            sb.appendLine(`Letters you have already sent from your audiences this season (a new letter for the same person replaces one): ${joinS(`; `, a.lettersSent.map(inFull))}.${lettersGold(a.lettersSent)}`);
        return sb.toString();
    }

