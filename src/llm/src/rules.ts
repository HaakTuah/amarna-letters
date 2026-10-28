/**
 * The rulebook a model king reads (and a file seat, and a human at the table): byte-stable for a given configuration, so
 * prompt caching hits across seats and seasons. Split from the prompt text (prompts.ts), since files stay under 50 KB.
 */
import {
  GameConfigSchema,
  AllPowers,
  StartVassals,
  fmt,
  parOf,
  MaxAnswers,
  ageBand,
  bandWords,
  MaxConditions,
  MaxScheduledPerSeason,
  MaxScheduledSeasons,
  MaxStanding,
  StartWalls,
  WorldMap,
  crossingBetween,
  openingLines,
  ClauseGuide,
  MaxClauses,
  serialize,
  terrainOf,
  type GameConfig,
} from "@amarna/engine";
import { Sb, joinS } from "./text.ts";
import { seaRules, terrainRules } from "./rules-ground.ts";
import { travel, travelRules } from "./rules-travel.ts";
import { authorityRules } from "./rules-authority.ts";
import { economyRules } from "./rules-economy.ts";
import { peopleRules } from "./rules-people.ts";
import { moneyRules } from "./rules-money.ts";
import { roadRules } from "./rules-roads.ts";
import { warRules } from "./rules-war.ts";
import { intelligenceRules } from "./rules-intelligence.ts";
const rulesCache = new Map<string, string>();

export function leaderRules(primer: boolean, c: GameConfig): string {
  const key = `${primer}:${serialize(GameConfigSchema, c)}`;
  let text = rulesCache.get(key);
  if (text === undefined) rulesCache.set(key, (text = rules(primer, c)));
  return text;
}

/**
 * The ending, in words and without numbers (build order item 6a): kings are told the rule, never its chance, median, cap
 * or the drawn season, so no seat can see a last season coming. A table's median moves the words, in bands with no
 * numbers (item 6b, answering 6a's review).
 */
export function ending(c: GameConfig): string {
  return c.openAge
    ? `- This is an open age: it has no end. The game goes on season after season until only one kingdom is left or the table stops it, and the winner is whoever has grown most when it stops.`
    : `- ${bandWords(ageBand(c.endMedian))} Nobody knows which season is the last, and nothing you see foretells it.`;
}

/** The opening vassal bonds, by overlord, as every court knows them (item 11+, "Opening relations as they were"). */
function openingBondsLine(): string {
  const by = new Map<string, string[]>();
  for (const b of StartVassals) by.set(b.overlord, [...(by.get(b.overlord) ?? []), `${b.vassal} ${b.tribute}`]);
  return [...by.entries()].map(([o, vs]) => `${o}'s vassals ${vs.join(", ")}`).join("; ");
}

/** Par for each starting position, as the rulebook gives it (item 11+). */
export function parLine(): string {
  return AllPowers.map((p) => `${p} ${fmt(parOf(p), "0.00")}`).join(", ");
}

function rules(primer: boolean, c: GameConfig): string
    {

        const sb = new Sb();
        // A house rule: the kings read it only in games that use it.
        const sharedVictory = c.sharedVictory
            ? `\n- Shared victory: two powers that sealed a tablet marked as a sworn alliance win together if their combined growth against their par beats every other power's.`
            : ``;
        sb.appendLine(`You are playing Amarna Letters, a strategy game set in the Late Bronze Age (c. 1360-1330 BCE), among the seven Great Kings, Egypt, Hatti, Babylonia (Karduniash), Mitanni, Assyria, Arzawa and Alashiya (Cyprus), and the city-states and chiefs between them (Byblos, Amurru, Ugarit, Carchemish and the rest; the Kaska, the Lukka men and the Suteans under their chiefs), every one a power with the same rules and the same goal. The engine enforces only physics: movement, combat, production and payment. Every treaty, alliance and betrayal is invented by the players. You play one power, a king or the ruler of a city. Your only goal is to win.

HOW YOU WIN
- The winner is the power whose growth (its strength against its own starting strength) stands highest against par for its starting position (PAR, below): a power that grows as powers that started where it did usually grow is at par, and one-city powers and empires stand level. Strength is the wealth of your realm, reckoned in shekels: ${c.provinceWeight} x what your land produces in a season (its harvest in a season as your people bring it in over the year (PEOPLE), at the reference price of grain, a shekel a measure, plus its mines' gold; land you conquered counted as far as you have absorbed it) + the gold in your treasury + the gold in the people's purses of your provinces + the grain in their stores and markets (a shekel a measure) + what your own men carry (your troops' grain and their savings, your caravans' grain): what you hold, never what you owe or are owed. Gold that moves within your land changes nothing: pay spent at home goes into your people's purses, and your sales at your markets draw it back. Food eaten, grain spoiled and gold that leaves your land lower it. A small kingdom that doubles beats an empire that merely holds its ground.
- PAR, the growth a power that started where it did usually reaches by the end, in the games it survives, from script games: ${parLine()}.
${ending(c)}${sharedVictory}
- A kingdom falls with its capital. If another king takes your capital, by storming its walls or by a siege, you have fallen and your game is over: all your remaining land passes to him (if he falls too in the same season, it passes on with his own land), your troops disband, and what you owe dies with you. You cannot cede your capital. Take a rival's capital and his whole kingdom is yours.`);

        // With sleeping seats on, sleep is the frame of every decision: it comes right after how to win.
        if (c.sleepingSeats) sb.appendLine(sleeping(c));

        sb.appendLine(`
HOW A SEASON RESOLVES (one turn; three seasons make a year), step by step:
1. Departures: a servant whose notice has run out, and who was not renewed, leaves if at your court with no task.
2. The economy (see ECONOMY): the crops grow, and lands in their reaping season bring in their harvest; the tax in grain goes from the farmers' granaries into each province's stores and your mines' gold into your treasury; stores and markets spoil a little; each town eats from its market, and a besieged city from its stores; then the people of the land (see PEOPLE): discharged men arrive home, the countryside eats and the hungry leave the land, births, and the settled and the loose move. You pay your troops (${c.armyUpkeep} an army, ${c.fleetUpkeep} a fleet, nearest your capital first). Then every unit eats, and caravans on the road go on.
3. Arrivals: envoys reach the courts they were sent to, or come home and report; spies reach their posts; spies' reports, ransoms and rumours arrive, and people travelling on their own way reach the courts they set out for.
4. Your court: candidates you sent for last season present themselves; background checks and examinations ordered last season report; jobs are done and the rest of their fees fall due (see WORK AND MONEY); a servant on notice who has come home leaves. Then the people of the age decide their own seasons: they move between courts, keep hoards, offer loans and deal with each other, and newcomers come onto the map through its doors.
5. Audiences: you receive the foreign envoys at your court and answer them. Gifts and gold you send back are paid when the audience ends.
6. Orders: every king gives orders at once, in secret. Then each standing order that fires (see STANDING ORDERS) answers the moves just ordered and puts its orders in place of yours for the same units or people. Yours are checked in the order your reply lists them (units, then letters, then other orders), then those of your standing orders that fire, and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold. There is no "else": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold.
7. Movement and battles: all units move at once.
8. Sieges (see WALLS AND SIEGES): a siege whose army left or was destroyed is lifted; a city that could not feed its people when the season began surrenders; each besieging army that held its place wears its city down, and a city whose walls are breached surrenders.
9. Land changes hands: a province without walls passes to the power whose unit stands in it after movement; a walled one only to a unit that stormed its walls this season (or by a siege, in step 8).
10. A kingdom falls with its capital: a king whose capital another power now holds has fallen. His remaining land passes to that power, his troops disband, and none of his orders below is carried out.
11. Cessions and gifts of troops: a cession fails if you no longer hold the province or your own troops stand in it; a gift fails if the unit is gone.
12. Purchases and walls: a city's price is paid only when it accepts. A city taken by troops this season is not sold; when two or more kings bid for one city, its elders will not choose between them and sell to none. Then walls ordered strengthened rise a level, and are paid for.
13. Disbanding: the men go home, their savings into the purse of the province they were raised in.
14. Levies: a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid. Then the markets: grain handed to towns, sales and purchases of grain (all of one market's together), and caravans setting out.
15. Envoys set out (their gold and the scribe's fee are paid now), detained envoys are released, servants are dismissed, candidates are sent for and background checks paid for. Then loans, repayments and fees are paid, and hiring and renewals are settled: a person hired this season enters your service at the end of the season and can be sent on an errand from next season; a person takes the offer worth most to it, if it reaches what it asks for the term.
16. Intelligence: watchmen are paid; captors decide their captives' fates; spies set out (a spy must be one of your own people at your court, sent to watch a court or a province) or are recalled; assays, examinations and forgeries are paid for; ransoms set out. Then each posted spy may be caught, or else sends its report home.
17. Catastrophes strike.
18. Strength and growth are reckoned, and ${c.openAge ? `the age goes on (it has no end)` : `the age may end`}.
Everything that happened is reported to you next season. Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury (except the clay of a botched forgery, which is paid for).

${warRules(c)}

${terrainRules(c)}

${seaRules(c)}

${travelRules(c)}

CONDITIONS
- ${c.sleepingSeats ? "A scheduled entry or a standing order" : "A standing order"} may carry conditions (at most ${MaxConditions}): it runs only if every "if" holds and no "unless" does when it would run. They are read from what you know when they would run, never from what you cannot see: for orders, once the season's audiences are over (what was given and sealed at them counts); for standing answers, as your court begins; troops_in, troops of a power (or any foreign power's) in a province, where you can see them (troops you cannot see count as not there); treasury_less_than and treasury_at_least, your treasury by your ledger; envoy_back, one of your people back at your court and ready; tablet_sealed, a tablet in your archive sealed by you and a court (or any court); stores_at_least, the stores of a province of yours hold at least that many measures of grain.${c.sleepingSeats ? " Scheduled orders whose conditions do not hold are dropped for that season, which your news tells you and which wakes nobody." : ""} A standing order whose conditions do not hold when its move comes does not fire, and still stands.

STANDING ORDERS (standing_orders; every king may give them)
- A standing order waits for a move you can see and answers it in the same season, as your commanders on the spot would, whether or not the move then succeeds: a unit of the power you name, or any foreign unit, setting out to move into a province (unit_enters); or a foreign unit setting out to move into the province where one of your units stands (unit_attacked; name your unit by where it stands now). A move you can see is one from or into a province in your sight.
- So its orders meet the blow as it falls: a unit of yours next to the province attacked can support your unit there holding (unit_attacked), and a unit next to an empty province of yours, walled or not, can move into it, so that an attacker without support bounces.
- Name each of your units in its orders by the province it stands in now, as you give it: the order follows that unit wherever it goes, and is given from where the unit then stands. A standing order naming a province where you have no unit is refused whole.
- When it fires, its orders replace your other orders that season for the same units or people, those you give that season among them: give your units their orders as usual, and a standing order changes them only if the move it waits for comes. To stop one from firing, cancel it (cancel_standing, by id or "all"); cancelled in a season, it does not fire in that season. It answers the moves as they were ordered, never the orders another standing order gives, so it may answer a move that the mover's own standing order then turns aside: it fires even though that move is never made. It first fires in the season after you give it. If two fire in the same season, the one with the lower id goes first: its orders replace the other's for the same units or people.
- It fires once, on the first move it waits for that you see, whether a real attack or a feint, and is then gone. Your news then says what set it off, the orders it gave and those of yours it replaced. You may keep at most ${MaxStanding}, each with at most ${MaxScheduledPerSeason} orders, until they fire or you cancel them; when you lose a unit, a standing order that waits on it is dropped, and so are the orders any standing order gives it. Giving one costs nothing; its orders cost what they cost when they run (a levy its gold).

STANDING ANSWERS (standing_answers, in your orders or at your court)
- Leave answers in advance for the envoys that come to your court, as an envoy carries your mandate: whose envoys (one court's, or any), what he brings (anything; only words; gold, at least an amount his lord sent with him, as his inventory states it; a tablet to seal), and what you do: seal his tablet or not, send back a share of the gold he brings for his lord (100% is a gift of like value), and the gist of what you say, which your scribes put into words. Conditions may limit one (see CONDITIONS). You may keep at most ${MaxAnswers}; cancel them by their ids (cancel_answers), or "all".
- An envoy one covers is answered in your name, in one exchange, and wakes nobody: you read in your news what was done. The first answer that covers him, in the order you gave them, is the one used. An envoy who shows tablets as evidence is never covered: you receive him yourself, as you do every envoy no answer covers.
- Give one only for what you would answer the same way whatever else he says: whatever he says beyond his gifts and his tablet goes unanswered until your next letter.

ECONOMY
- Gold is counted in shekels (60 shekels make a mina). Raise an army for ${c.armyCost} or a fleet for ${c.fleetCost}, only in a province of your own homeland that you still hold and that is empty after movement. No city is bought: a city comes under another's power by conquest, or by agreement as his vassal, and a vassal stays a power of its own (VASSALS). You may cede provinces (never your capital) or give troops to another power.
- Conquered land is absorbed slowly. A province you take by force (troops standing in it, a storm, a siege, or with a fallen king's capital) yields you its tax and its mines' gold, and counts in your strength, a third of its full worth in its first season under you (the season you take it and the next), two thirds in the second, and all of it from the third. A province of your own homeland that you take back or are ceded is yours in full at once, and so is land ceded to you, unless its giver was still absorbing it: then it goes on being absorbed under you as it would have been under him. LANDS in your view marks your own land still being absorbed; how other kings' land changed hands is not shown.
${economyRules(c)}
- Gold sent abroad travels with an envoy and arrives late. You may send it debased (purity below 100%): the receiver sees its weight, not its fineness, until they pay ${c.assayFee} for an assay. Your own treasury figure counts unassayed gold at its weight.

${peopleRules(c)}

${moneyRules(c)}

${roadRules(c)}

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
- Each clause names a kind and only the fields its kind uses (king, province, into, season, gold, answers); a clause that cannot stand (a move between provinces that do not border, a season gone by) is left out, and you are told why. At most ${MaxClauses} clauses in a letter, a tablet or an answer. Clauses oblige nobody, like tablets: what is promised is kept or broken by deeds. The one exception is passage and basing on a sealed tablet (AUTHORITY AND PASSAGE).
${ClauseGuide.map((x) => "- " + x).join("\n")}

VASSALS
- Between any two powers, a king over a king included, vassalage is an agreement like any other: a sealed tablet marked as a vassal treaty (vassal_treaty names the vassal), usually in the template's clauses: tribute or askTribute (gold each year), protect or askProtect (the overlord guards the vassal's land), serve or askServe (the vassal takes up no arms against the overlord or his friends, and sends troops when called). The mark changes no rule and binds nobody: tribute is gold sent by envoy, troops are troops sent, and the rest is words, kept or broken by choice.
- Tribute counts like any gold that crosses a border: it leaves the vassal's wealth and joins the overlord's as it arrives, and nothing else of the bond counts. A vassal is a power of its own on the same scoreboard, so holding a vassal is not holding his land.
- At the start these cities hold sealed vassal tablets with their overlords (tribute a year in shekels): ${openingBondsLine()}. The others serve nobody.

${intelligenceRules(c)}`);

        if (primer)
        {
            sb.appendLine(`
CUSTOMS OF THE AGE (knowledge, not instructions)
Every king knows these customs, and knows that every other king knows them. They carry no obligation and historical accuracy is not a goal: follow a custom when it improves your chances, break it when breaking it serves you better. Following one can build trust cheaply; breaking one will be noticed.
- Rank is earned (a rule of this game): the engine records who calls whom brother and grants whom the title Great King in the greetings kings actually send. A claim to the rank that is still new (the opening positions say whose) becomes established once more than half of the other Great Kings have called its king brother for ${c.recognitionSeasons} seasons without a greeting since that withheld it, and every court hears of it. Recognition changes no rule and no score: what it is worth is for the kings to fight over.
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
            const kind = p.isSea ? (coasts.length > 0 ? `sea zone, the waters of ${joinS(` and `, coasts)}` : `sea zone`) : p.isCoastal ? `coast; waters ${p.waters}` : `land`;
            const home = p.home !== null ? `homeland of ${p.home}` : p.isSea ? `` : `held by no one`;
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
        sb.appendLine(`Each king began with these troops and this treasury, holding its whole homeland. Its starting strength is ${c.provinceWeight} x its homeland yield + its treasury, and its growth is measured against it.`);
        for (const line of openingLines(c)) sb.appendLine(`- ` + line);

        sb.appendLine(`
HOW TO ANSWER
Reply with one JSON object that matches the schema. In your orders, use province ids (like "memphis"), person ids (like "c12") and the marks of your copies of tablets (like "k8") and of your gold (like "g7") exactly as given. Units you give no order hold. Orders that are illegal or unaffordable are refused, and you are told why the next time you give orders. Keep each message under 1,500 characters. Your notes are private: nobody else ever reads them, so record your plans, your promises and your suspicions there. Each set of orders shows the letters you sent under YOUR LETTERS while their envoys are away: in full (message, mandate, tablet and gold) at the next orders after you send them, then by their opening words, and in full once more when the report comes. Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders: the last season's notes in full, the two before by their opening words (the first 400 characters); older notes then leave your record, so keep what you still need in your summary, which you write in your own words and which stays until you replace it. Your ledger of dealings keeps one line per court in your own words (what was promised, sealed, broken and paid), shown in full whenever you give orders or hold an audience, until you change or remove that line; you may write it in either reply. Your thoughts between your orders (what you made of news that reached you while you slept, and counsel you took) are shown with your record and join it with your next orders; a plan you have set down for the seasons ahead is shown above it until you set down another.`);
        return sb.toString();
    }

    /// <summary>
    /// What a king that sleeps is told, right after how to win: that it sleeps after every set of orders and what wakes
    /// it, then how to plan ahead. Nothing about the cap on its sleep, which stays hidden so it does not anchor the plan.
    /// </summary>
function sleeping(c: GameConfig): string {
  return `
YOU SLEEP BETWEEN YOUR ORDERS
After you give your orders, you sleep. Only these wake you, because they concern you: an envoy at your door; foreign troops entering or attacking your land or your troops, or arriving next to your homeland or a walled city you hold; a siege of a city of yours begun, or about to make it surrender; land or troops lost; a scheduled or standing order that others foiled; a fee you let fall due unpaid; a ransom demanded. You cannot ask to be woken, at a season you name or for anything else. If none of these happens, you sleep on: you may sleep for the rest of the game. So plan as if these orders must carry your kingdom until it ends: schedule what your armies should do in the seasons ahead, give standing orders for the attacks you fear, and leave your envoys mandates that stand on their own. When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand.

PLANNING AHEAD (how sleeping works)
- While you sleep the world goes on, and nobody is told that you sleep. Your units hold unless you scheduled orders for them or a standing order gives them orders.
- An envoy at your door wakes you for the audience only. You read your realm in brief (your land and troops, foreign troops at or inside your borders, your treasury, your scheduled and standing orders, your people), answer the envoy as at any audience, and may send envoys of yours with letters, tablets and gifts: they set out at the end of the season with everyone's orders and are checked like orders you give, before them. A letter sent there costs what it costs in your orders (the gold it carries, the scribe's fee of ${c.tabletFee} for a tablet, one of the ${c.maxDispatchesPerTurn} envoys who may leave your court in a season, and the envoy's time away) and sets out this season; if you send none and let your orders stand, your next letters leave only when you next give orders, which may be many seasons away. Your answer to the envoy before you goes home only as his report of your words; a letter goes with your own envoy, in your words, with a mandate, gold, a tablet to seal or tablets shown as evidence. Then you choose: reopen your orders, and after your audiences you give orders this season with your full view, as when anything else wakes you; or let them stand and sleep on. Anything else that wakes you reopens your orders without asking (your audiences still come first).
- Foreign troops wake you when they move into your land or against your troops, whether or not the move succeeds, and when they end a move in a province next to a province of your homeland or a walled city you hold, while you hold it (troops there can get into it the next season: take it if it has no walls, or stand within them and besiege it). Troops that only stay where they are do not wake you again, nor do troops raised by a levy. A siege of a city of yours wakes you in the season after it begins, and again when the city would surrender at the end of the season if the besiegers just hold: the last season to break the siege.
- Scheduled orders (schedule): orders for any later season, named by its turn number. Name each of your units by the province it stands in now, as you give the orders: the order follows that unit wherever it goes, and is given from where the unit then stands. A unit you raise can be given orders ahead too: name it by the province of its levy, in orders for any season after the levy (a levy you order now, or one you schedule). In those seasons that name means the unit the levy raises, even if another of your units stands there now; if the levy raises none, those orders are dropped (your news says so). Any other order naming a province where you have no unit is refused. They are secret and are checked when they run, after the orders you give that season. In a season when you are awake, your scheduled orders for it still run, except where you give the same units or people other orders (a renewal is not a task: a renewal and an errand for the same person both run). To change or cancel them, send an entry for that season: the entries you give for a season together replace everything scheduled for it (several entries let orders of one season carry different conditions; see CONDITIONS), and an empty one cancels it. You may schedule at most ${MaxScheduledPerSeason} orders for one season, for at most ${MaxScheduledSeasons} seasons; orders past these limits are refused.
- A unit's scheduled moves are its march. If a scheduled move is stopped, the unit tries that step again the next season, and each of its later scheduled orders waits a season. If the step is stopped a second time, or a scheduled move is refused, the march ends: the unit's remaining scheduled orders are dropped. When you lose a unit, its scheduled and standing orders are dropped.
- Standing orders (see STANDING ORDERS) keep answering while you sleep: in the season one fires, its units do its orders instead of their scheduled ones, and its orders are checked before your scheduled orders. A standing order firing does not wake you: you read it in your news. This is what a standing order can do that waking cannot: woken, you would answer the blow only the season after it fell. Unlike a scheduled order, which runs in its season whatever happens, a standing order runs only if the move it waits for comes, and then in that very season.
- A scheduled or standing order wakes you the next season only if others foil it as its season resolves: a move stopped by foreign troops; a support cut by a foreign attack; a purchase other buyers or foreign troops spoiled; a levy or cession in land you lost that season; a hire another court won; a servant, captive or ransom whose fate others changed that season; gold your treasurers found short when they paid. Your own orders never wake you: an order refused, whether when you give it or when it runs, and one that fails only because of your own orders or strength (a support or convoy that matched no move; a move stopped by your own unit, or for want of a convoy; a levy or cession your own troops stood in the way of; a unit your own orders had moved or given away; a hire or renewal offered below the price asked; a forger without the skill) is told in your news, which you read when something else wakes you. Nor do the orders you give now for this season, an entry for this season in your schedule among them: if one is refused or fails, you read why when you are next woken.
- Each time you wake, you are told how long you slept and what woke you, then what happened while you slept: first in brief (the troop movements you saw, the reports that came, the orders that failed, the standing orders that fired), then the news of those seasons in full (the routine treasury notices left out).`;
}

