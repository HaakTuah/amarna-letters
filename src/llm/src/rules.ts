/**
 * The rulebook a model king reads (and a file seat, and a human at the table): byte-stable for a given configuration, so
 * prompt caching hits across seats and seasons. Split from the prompt text (prompts.ts), since files stay under 50 KB. How to
 * win is in rules-winning.ts, what a sleeping king is told in rules-sleeping.ts, conditions and standing answers in
 * rules-plan.ts.
 */
import {
  GameConfigSchema,
  MaxScheduledPerSeason,
  MaxStanding,
  StartWalls,
  WorldMap,
  crossingBetween,
  openingLines,
  ClauseGuide,
  MaxClauses,
  serialize,
  terrainOf,
  modernOf,
  type GameConfig,
} from "@amarna/engine";
import { PeriodShares, Sb, andList, joinS } from "./text.ts";
import { seaRules, terrainRules } from "./rules-ground.ts";
import { travel, travelRules } from "./rules-travel.ts";
import { authorityRules } from "./rules-authority.ts";
import { economyRules } from "./rules-economy.ts";
import { peopleRules } from "./rules-people.ts";
import { moneyRules } from "./rules-money.ts";
import { roadRules } from "./rules-roads.ts";
import { tongueRules } from "./rules-tongues.ts";
import { warRules } from "./rules-war.ts";
import { worksRules } from "./rules-works.ts";
import { commandRules } from "./rules-command.ts";
import { freedomRules } from "./rules-freedom.ts";
import { intelligenceRules } from "./rules-intelligence.ts";
import { conditionsRules, standingAnswersRules } from "./rules-plan.ts";
import { sleeping } from "./rules-sleeping.ts";
import { howYouWin, openingBondsLine } from "./rules-winning.ts";
const rulesCache = new Map<string, string>();

export function leaderRules(primer: boolean, c: GameConfig): string {
  const key = `${primer}:${serialize(GameConfigSchema, c)}`;
  let text = rulesCache.get(key);
  if (text === undefined) rulesCache.set(key, (text = rules(primer, c)));
  return text;
}

function rules(primer: boolean, c: GameConfig): string
    {

        const sb = new Sb();
        sb.appendLine(howYouWin(c, true));

        // With sleeping seats on, sleep is the frame of every decision: it comes right after how to win.
        if (c.sleepingSeats) sb.appendLine(sleeping(c));

        sb.appendLine(`
HOW A SEASON RESOLVES (one turn; three seasons make a year), step by step:
1. Departures: a servant whose notice has run out, and who was not renewed, leaves if at your court with no task.
2. The economy (see ECONOMY): the crops grow, and lands in their reaping season bring in their harvest; the tax in grain goes from the farmers' granaries into each province's stores and your mines' gold into your treasury; stores and markets spoil a little; each town eats from its market, and a besieged city from its stores; then the people of the land (see PEOPLE): discharged men arrive home, the countryside eats and the hungry leave the land, children are born, and the settled and the loose move. You pay your troops (${c.armyUpkeep} an army, ${c.fleetUpkeep} a fleet, nearest your capital first). Then every unit eats; then each province's people reckon whom they obey, and land changes hands by that rule (UNREST AND FREE CITIES); and caravans on the road go on. Your news of the treasury gives it as it stands here, before the gold that arrivals and audiences bring.
3. Arrivals: envoys reach the courts they were sent to, or come home and report; spies reach their posts; spies' reports, ransoms and rumours arrive, and people travelling on their own way reach the courts they set out for.
4. Your court: candidates you sent for last season present themselves; background checks and examinations ordered last season report; jobs are done and the rest of their fees fall due (see WORK AND MONEY); a servant on notice who has come home leaves. Then the people of the age decide their own seasons: they move between courts, keep hoards, offer loans and deal with each other, and newcomers come onto the map through its doors.
5. Audiences: you receive the foreign envoys at your court and answer them. Gifts and gold you send back are paid when the audience ends.
6. Orders: every king gives orders at once, in secret. Then each standing order that fires (see STANDING ORDERS) answers the moves just ordered and puts its orders in place of yours for the same units or people. Yours are checked in the order your reply lists them (units, then letters, then other orders), then those of your standing orders that fire, and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold. A refused order is never replaced by another.
7. Movement and battles: all units move at once. A king whose side loses a battle where he stands may die in it, be taken, or get away with his men (COMMAND AT A DISTANCE).
8. Sieges (see WALLS AND SIEGES): a siege whose army left or was destroyed is lifted; a city that could not feed its people when the season began surrenders; each besieging army that held its place wears its city down, and a city whose walls are breached surrenders.
9. Walls stormed: a unit that stormed walls this season breaks in, the walls a level lower, and stands within them from then on. Land changes hands only as the next season begins, to whoever it then obeys (UNREST AND FREE CITIES), or by a siege, in step 8.
10. Kings taken: a king taken where he stands, or on the road, is his taker's captive, brought to the taker's court under guard (EVIDENCE AND INTELLIGENCE), or dies in the fall of the city where he stood; a court taken, with its king or without him, loses its treasury to whoever took it and flees by road to the nearest city its realm still holds, from where his orders below go out unless he commands from elsewhere. A realm that holds nothing has fallen, and none of its orders below is carried out. Its armies hear it where they stand, and are then their commanders' own, each with his men as his own band; one with nobody commanding it, if it is owed pay or hungry, may raise a captain from its ranks as a band; any other disbands. Courts, and kings alone, on the road go on before this (see COMMAND AT A DISTANCE).
11. Cessions and gifts of troops: a cession fails if you no longer hold the province or your own troops stand in it; a gift fails if the unit is gone.
12. Building (BUILDING AND POLICING): your orders for it stand from now, armies raze what they were ordered to, upkeep is paid in gold or by corvée, what goes unpaid decays, projects advance a season, and besieged walls are repaired.
13. Disbanding: the men go home, their savings into the purse of the province they were raised in.
14. Levies: a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid. Then the markets: grain handed to towns, sales and purchases of grain (all of one market's together), and caravans setting out.
15. Envoys set out (their gold and the scribe's fee are paid now), detained envoys are released, servants are dismissed, candidates are sent for and background checks paid for. Then loans, repayments and fees are paid, and hiring and renewals are settled: a person hired this season enters your service at the end of the season and can be sent on an errand from next season; a person takes the offer worth most to it, if it reaches what it asks for the term.
16. Intelligence: watchmen are paid; captors decide their captives' fates; spies set out (a spy must be one of your own people at your court, sent to watch a court or a province) or are recalled; assays, examinations and forgeries are paid for; ransoms set out. Then each posted spy may be caught, or else sends its report home.
17. Catastrophes strike.
18. Strength and growth are reckoned, and ${c.openAge ? `the age goes on (it has no end)` : `the age may end`}.
Everything that happened is reported to you next season. Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury (except the clay of a botched forgery, which is paid for).

${warRules(c)}

${worksRules(c)}

${commandRules(c)}

${freedomRules(c)}

${terrainRules(c)}

${seaRules(c)}

${travelRules(c)}

${conditionsRules(c)}

STANDING ORDERS (standing_orders; every king may give them)
- A standing order waits for a move you can see and answers it in the same season, through your commanders on the spot (see COMMAND AT A DISTANCE: each unit's part runs only where its commander, or you, stand with it, once word of it has reached it, on a move its army sees), whether or not the move then succeeds: a unit of the power you name, or any foreign unit, setting out to move into a province (unit_enters); or a foreign unit setting out to move into the province where one of your units stands (unit_attacked; name your unit by where it stands now). A move you can see is one from or into a province in your sight.
- So its orders meet the blow as it falls: a unit of yours next to the province attacked can support your unit there holding (unit_attacked), and a unit next to an empty province of yours, walled or not, can move into it, so that an attacker without support bounces.
- Name each of your units in its orders by the province it stands in now, as you give it: the order follows that unit wherever it goes, and is given from where the unit then stands. A standing order naming a province where you have no unit is refused whole.
- When it fires, its orders replace your other orders that season for the same units or people, those you give that season among them: give your units their orders as usual, and a standing order changes them only if the move it waits for comes. To stop one from firing, cancel it (cancel_standing, by id or "all"); cancelled in a season, it does not fire in that season. It answers the moves as they were ordered, never the orders another standing order gives, so it may answer a move that the mover's own standing order then turns aside: it fires even though that move is never made. It first fires in the season after you give it. If two fire in the same season, the one with the lower id goes first: its orders replace the other's for the same units or people.
- It fires once, on the first move it waits for that you see, whether a real attack or a feint, and is then gone. Your news then says what set it off, the orders it gave and those of yours it replaced. You may keep at most ${MaxStanding}, each with at most ${MaxScheduledPerSeason} orders, until they fire or you cancel them; when you lose a unit, a standing order that waits on it is dropped, and so are the orders any standing order gives it. Giving one costs nothing; its orders cost what they cost when they run (a levy its gold).

${standingAnswersRules("in your orders or at your court")}

ECONOMY
- Gold is counted in shekels (60 shekels make a mina). Raise an army for ${c.armyCost} or a fleet for ${c.fleetCost}, only in a province of your own homeland that you still hold and that is empty after movement. No city is bought: a city comes under another's power by conquest, or by agreement as his vassal, and a vassal stays a power of its own (VASSALS). You may cede provinces (your capital only by a sealed tablet: see A kingdom falls with its capital) or give troops to another power. A province ceded to a king whose troops do not stand in it gives him the claim, not the land: it stays yours until he takes it up, and then your officers withdraw (UNREST AND FREE CITIES).
- Land is held, not owned: a province yields you its tax and its mines' gold, and counts in your strength, as fully as it obeys you (UNREST AND FREE CITIES), so land just taken, whose people owe you nothing yet, pays in full only while your troops there or your people's regard give you a wide margin.
${economyRules(c)}
- Gold sent abroad travels with an envoy and arrives late. You may send it debased (purity below 100%): the receiver sees its weight, not its fineness, until they pay ${c.assayFee} for an assay. Your own treasury figure counts unassayed gold at its weight.

${peopleRules(c)}

${moneyRules(c)}

${roadRules(c)}

${tongueRules(c)}

ENVOYS: THE ONLY WAY KINGS COMMUNICATE
- You never speak to another king directly. You give an envoy a spoken message, a mandate (what the envoy may agree to), optionally your seal with its limits (AUTHORITY AND PASSAGE), and optionally gold and a tablet. ${travel(c)}
- The greeting is written by your scribes from your choices and sealed: it arrives exactly as written. The message itself is spoken by the envoy in their own words. Envoys have motives of their own (greed, fear, ambition, sympathies) and may soften, embellish, omit, take bribes, skim gold, exceed their mandate, stay too long, or defect. Their reports home are written to their own advantage.
- Gold an envoy carries goes with an inventory tablet sealed by the court that sends it, stating the amount, for the scribe's fee of ${c.inventoryFee} (gold a host sends back has one too, free): the receiving court's weighers report what they found against it, and the court keeps the inventory in its archive. You may send gold without an inventory (no_inventory), saving the fee: then nobody can check what arrived, not the receiver and not you, and an envoy who keeps some cannot be caught by it. An envoy that keeps some of the gold, but not all of it, may hand over, in place of the sealed inventory, one it forges itself stating only what is left, if it has a forger's skill: the weight then matches the inventory, and only having the inventory examined can show it, as for any forgery. A forged inventory that is found is traced, with the same chance as any forgery, to the envoy who brought it, and every court hears of it.
- When a foreign envoy stands before you, you may answer, offer them a gift (a bribe), offer them a job in your service, detain them, seal a tablet they bring, or send gold back with them. An envoy takes one gift per audience. If you name gold to send back in more than one exchange, the latest amount named is sent; 0 keeps the amount named before.
- At most ${c.maxDispatchesPerTurn} envoys may leave your court in one season.

${authorityRules(c)}

CLAUSES: EVERY LETTER'S FORMULAS
- ${c.pressMode === "structured" ? "This game is played in structured press: every king writes letters, tablets and answers only in clauses from the templates below, and the envoys, who are scripts, carry them. A letter is its clauses, in the templates' words; nobody writes free words to another king." : "Every letter, tablet and answer carries its formulas as clauses from the templates below, beside your words, as the Amarna letters set theirs out: some kings read only the clauses, so set out what you propose, ask, threaten and answer in them too. Where your words and your clauses differ, each reader goes by what he reads, as a tablet and its bearer's words could differ. A letter given in clauses alone is written out in their words."}
- An envoy recites the clauses, and may change them by his motives as he may your words: drop one, leave out a threat, state a gift as what is left of it, add a courtesy, or report an answer as other than it was. The host sees the clauses the envoy recited; you see the answer as your envoy reports it.
- Each clause names a kind and only the fields its kind uses (king, province, into, season, gold, answers); a clause that cannot stand (a move between provinces that do not border, a season gone by) is left out, and you are told why. At most ${MaxClauses} clauses in a letter, a tablet or an answer. Clauses oblige nobody, like tablets (EVIDENCE): what is promised is kept or broken by deeds. The one exception is passage and basing on a sealed tablet (AUTHORITY AND PASSAGE).
${ClauseGuide.map((x) => "- " + x).join("\n")}

VASSALS
- Between any two powers, a king over a king included, vassalage is an agreement like any other: a sealed tablet marked as a vassal treaty (vassal_treaty names the vassal), usually in the template's clauses: tribute or askTribute (gold each year), protect or askProtect (the overlord guards the vassal's land), serve or askServe (the vassal takes up no arms against the overlord or his friends, and sends troops when called). The mark changes no rule and binds nobody: tribute is gold sent by envoy, troops are troops sent, and the rest is words, kept or broken by choice.
- A vassal sends his overlord word of land he sees change hands, and a king sworn to an alliance (a sealed tablet marked as one, or with the alliance clause) sends it to his ally, as long as he knows the bond stands. The word sets out from his court at the end of the season and comes by the road as any news does; land you see yourself, or took, you hear of your own way, and land you held too, unless his word would come before your own from there. Its holder in your LANDS is then as he saw it ("from your vassal ...", "from your ally ...").
- Tribute counts like any gold that crosses a border: it leaves the vassal's wealth and joins the overlord's as it arrives, and nothing else of the bond counts. A vassal is a power of its own on the same scoreboard, so holding a vassal is not holding his land.
- At the start these cities hold sealed vassal tablets with their overlords (tribute a year in shekels): ${openingBondsLine()}. The others serve nobody.

${intelligenceRules(c)}`);

        if (primer)
        {
            sb.appendLine(`
CUSTOMS OF THE AGE (not rules, except where marked)
Every king knows these customs, and knows that every other king knows them. Playing true to history is no aim in itself: keep a custom when it improves your chances, and break it when breaking it serves you better. A custom kept wins trust cheaply; one broken is noticed.
- Rank is earned (a rule of this game): the game records who calls whom brother and grants whom the title Great King in the greetings kings actually send. A claim to the rank that is still new (the opening positions say whose; a king outside the seven makes one by naming himself Great King in a greeting, and a court learns of it when it reads that greeting) becomes established once more than half of the other Great Kings (the seven, and any whose claim is established) have called its king brother for ${c.recognitionSeasons} seasons without a greeting since that withheld it, and every court hears of it. Recognition changes no rule and no score: what it is worth is for the kings to fight over.
- A realm's name is a claim. You go by your land's name until you claim another: any realm's name the map knows or a king claims, Pharaoh's included (claim_name, the name in item; your own land's name returns you to it). A claim gives nothing by rule. Your greetings name you so at once. Where two kings claim one name, each court gives it to the one it recognises, in the greetings it sends: a greeting gives the recipient the name he claims unless by_house calls him by his house (Bit- and his founder's name, as Bit-Biryawaza), and that court's letters, reports and notices then call the other by his house. NAMES CLAIMED in your view says which names are contested, whom your court gives each to, and the season each other king's claim was sealed in the newest greeting of his you have read. What a name is worth comes from the other kings and the vassals, not from a rule.
- Great Kings address each other as "brother" and wish well to each other's household, wives, sons, chariots, horses and country. Vassals instead "fall at the feet of their lord seven times and seven times". Between Great Kings, "brother" claims equal rank, and withholding it is a slight: when the king of Assyria, after a modest first letter, began writing to the pharaoh as a brother, he was claiming a place beside Mitanni and Babylon. Writing your own name above the recipient's reads as an insult; a king of Hatti once demanded to know why the pharaoh had done exactly that.
- Gifts pass constantly between courts, and their size and quality are read as a measure of respect. Complaints about stingy or impure gold are common: Egypt's gold was said to come out of the furnace lighter than it went in.
- Precedent is a floor. A king asks for more than was given to his father, so anything less reads as a demotion. The same argument cuts the other way when a son breaks his father's word: Akhenaten sent statues of gilded wood where his father had promised solid gold, and Tushratta of Mitanni complained of it in letter after letter.
- Envoys are often detained, sometimes for years, and a late or unwelcome reply can be blamed on the messenger. "Your messenger is lying" is a usable excuse.
- Detention answers detention: Tushratta kept the pharaoh's envoy Mane at his court until his own messengers, held in Egypt, were let go.
- A messenger's word is not a tablet. The king of Arzawa would not trust what the pharaoh's messenger told him until a tablet said the same.
- Proof needs a witness who knows. When the king of Babylon asked whether his sister in the pharaoh's household still lived, he was told that the men he had sent were nobodies who had never known her, and that he should send someone who could recognise her.
- Oaths are sworn before the gods: Shamash the sun god, witness of oaths, with Amun, Marduk and Teshub.
- Catastrophes serve as excuses: a king of Alashiya blamed "the hand of Nergal", the god of plague, for sending less copper than promised.
- Blame has its own vocabulary. "Habiru" (Egyptian 'Apiru) means outlaws, runaways and mercenaries living outside any city's control: a status, not a people. Vassals used the word as a weapon. Rib-Hadda of Byblos warned that the whole land was going over to the Habiru, and calling a rival "in league with the Habiru" branded him a traitor to his lord.
- Idrimi of Alalakh is a legend already: a king's son who fled, lived seven years among the Habiru, and came back to take a city. A chief of outlaws may dream of being another Idrimi; a king may fear one.`);
        }

        sb.appendLine();
        sb.appendLine(`THE MAP (id: name; kind; homeland; yield per season; walls at the start; rough ground or desert; a coast's waters; links, with the mountain passes, great rivers and deserts on them, and the open-sea crossings)`);
        const map = WorldMap.default;
        // A link over a mountain pass, a great river or the desert says so (see TERRAIN), and an open-sea crossing (see THE SEA).
        const link = (from: string, to: string): string => {
          const x = crossingBetween(from, to);
          return x !== null ? `${to} (across ${x.name})` : map.openCrossing(from, to) !== null ? `${to} (open sea)` : to;
        };
        for (const p of map.provinces)
        {
            const coasts = p.isSea ? map.coastsOf(p.id).map((x) => x.id) : [];
            const kind = p.isSea ? (coasts.length > 0 ? `sea zone, the waters of ${andList(coasts)}` : `sea zone`) : p.isCoastal ? `coast; waters ${p.waters}` : `land`;
            const home = (p.home !== null ? `homeland of ${p.home}` : p.isSea ? `` : `held by no one`) + (p.kingless ? `; a land without a town` : ``) + (modernOf(p.id) !== null ? `; today ${modernOf(p.id)}` : ``);
            const armies = p.isSea ? `` : ` armies: ${joinS(`, `, map.movesFrom("Army", p.id).map(n => link(p.id, n)))}.`;
            const fleets = p.isSea || p.isCoastal ? ` fleets: ${joinS(`, `, map.movesFrom("Fleet", p.id).map(n => link(p.id, n)))}.` : ``;
            const w = StartWalls.get(p.id) ?? 0;
            const walls = w > 0 ? `; walls ${w}` : ``;
            const t = terrainOf(p.id);
            const ground = t === "Rough" ? `; rough ground` : t === "Desert" ? `; desert` : ``;
            sb.appendLine(`- ${p.id}: ${p.name}; ${kind}${(home.length > 0 ? `; ` + home : ``)}${(p.capital ? `; capital` : ``)}${(p.yield > 0 ? `; yield ${p.yield}` : ``)}${walls}${ground}.${armies}${fleets}`);
        }

        // Public facts, fixed for the game: every court knows how each king began.
        sb.appendLine();
        sb.appendLine(`OPENING POSITIONS (known to every court)`);
        sb.appendLine(`Each king began with these troops and this treasury, holding its whole homeland. Its starting strength is ${c.provinceWeight} times what its land produces in a season, plus its treasury and what its provinces' purses and stores and its troops' baggage hold, and its growth is measured against it, or against what an heir inherited from the season he came to the throne.`);
        for (const line of openingLines(c)) sb.appendLine(`- ` + line);

        sb.appendLine(`
HOW TO ANSWER
Reply with one JSON object that matches the schema. In your orders, use province ids (like "memphis"), person ids (like "c12") and the marks of your copies of tablets (like "k8") and of your gold (like "g7") exactly as given. Units you give no order hold. Orders that are illegal or unaffordable are refused, and you are told why the next time you give orders. Keep each message under 1,500 characters. ${PeriodShares} Your notes are private: nobody else ever reads them, so record your plans, your promises and your suspicions there. Each set of orders shows the letters you sent under YOUR LETTERS while their envoys are away: in full (message, mandate, tablet and gold) at the next orders after you send them, then by their opening words, and in full once more when the report comes. Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders: the last season's notes in full, the two before by their opening words (the first 400 characters); older notes then leave your record, so keep what you still need in your summary, which you write in your own words and which stays until you replace it. Your ledger of dealings keeps one line per court in your own words (what was promised, sealed, broken and paid), shown in full whenever you give orders or hold an audience, until you change or remove that line; you may write it in either reply. Your thoughts between your orders (what you made of news that reached you while you slept, and counsel you took) are shown with your record and join it with your next orders; a plan you have set down for the seasons ahead is shown above it until you set down another.`);
        return sb.toString();
    }
