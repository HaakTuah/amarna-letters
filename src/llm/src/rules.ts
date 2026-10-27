/**
 * The rulebook a model king reads (and a file seat, and a human at the table): byte-stable for a given configuration, so
 * prompt caching hits across seats and seasons. Split from the prompt text (prompts.ts), since files stay under 50 KB.
 */
import {
  AllPowers,
  Crossings,
  Desert,
  GameConfigSchema,
  LossNewsSeasons,
  MaxAnswers,
  ageBand,
  bandWords,
  MaxConditions,
  MaxScheduledPerSeason,
  MaxScheduledSeasons,
  MaxStanding,
  Rough,
  StartWalls,
  WorldMap,
  crossingBetween,
  fmt,
  groupBy,
  king,
  land,
  max,
  min,
  openingLines,
  serialize,
  sum,
  terrainOf,
  travelTurns,
  type GameConfig,
} from "@amarna/engine";
import { Sb, joinS } from "./text.ts";
import { seaRules, terrainRules } from "./rules-ground.ts";
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

function rules(primer: boolean, c: GameConfig): string
    {

        const sb = new Sb();
        // A house rule: the kings read it only in games that use it.
        const sharedVictory = c.sharedVictory
            ? `\n- Shared victory: two powers that sealed a tablet marked as a sworn alliance win together if their combined growth beats every other power's growth.`
            : ``;
        sb.appendLine(`You are playing Amarna Letters, a strategy game set among the seven Great Kings of the Late Bronze Age (c. 1360-1330 BCE): Egypt, Hatti, Babylonia (Karduniash), Mitanni, Assyria, Arzawa and Alashiya (Cyprus). The engine enforces only physics: movement, combat, production and payment. Every treaty, alliance and betrayal is invented by the players. You play one king. Your only goal is to win.

HOW YOU WIN
- The winner is the power whose strength grew most relative to its own starting strength. Strength = ${c.provinceWeight} x (sum of the base yields of the provinces you hold, land you conquered counted as far as you have absorbed it) + the gold in your treasury - the back pay you owe your people. A small kingdom that doubles beats an empire that merely holds its ground.
${ending(c)}${sharedVictory}
- A kingdom falls with its capital. If another king takes your capital, by storming its walls or by a siege, you have fallen and your game is over: all your remaining land passes to him (if he falls too in the same season, it passes on with his own land), your troops disband, and what you owe dies with you. You cannot cede your capital. Take a rival's capital and his whole kingdom is yours.`);

        // With sleeping seats on, sleep is the frame of every decision: it comes right after how to win.
        if (c.sleepingSeats) sb.appendLine(sleeping(c));

        sb.appendLine(`
HOW A SEASON RESOLVES (one turn; three seasons make a year), step by step:
1. Departures: a servant whose notice has run out, and who was not renewed, leaves if at your court with no task.
2. Income, upkeep and wages: your provinces pay their yield in gold; you pay upkeep for every army (${c.armyUpkeep}) and fleet (${c.fleetUpkeep})${(c.desertUpkeep > 0 ? `, ${c.desertUpkeep} more for each army that ended last season in desert land you did not hold (see TERRAIN),` : ``)} and the wages of your people at court; the wages of your people away are added to their back pay. If you cannot pay upkeep, troops desert, the one farthest from your capital first; unpaid people lose loyalty and may leave.
3. Arrivals: envoys reach the courts they were sent to, or come home and report; spies reach their posts; spies' reports, ransoms and rumours arrive. Then everyone you see at your court whom you owe back pay is paid it, as far as your treasury allows.
4. Your court: candidates you sent for last season present themselves; background checks and examinations ordered last season report; terms end (a servant content with the wage serves on, one who wants more or is still owed back pay gives notice); a servant on notice who has come home leaves.
5. Audiences: you receive the foreign envoys at your court and answer them. Gifts and gold you send back are paid when the audience ends.
6. Orders: every king gives orders at once, in secret. Then each standing order that fires (see STANDING ORDERS) answers the moves just ordered and puts its orders in place of yours for the same units or people. Yours are checked in the order your reply lists them (units, then letters, then other orders), then those of your standing orders that fire, and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold. There is no "else": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold.
7. Movement and battles: all units move at once.
8. Sieges (see WALLS AND SIEGES): a siege whose army left or was destroyed is lifted; each besieging army that held its place wears its city down; a city worn down as far as its walls are high surrenders to the besieger.
9. Land changes hands: a province without walls passes to the power whose unit stands in it after movement; a walled one only to a unit that stormed its walls this season (or by a siege, in step 8).
10. A kingdom falls with its capital: a king whose capital another power now holds has fallen. His remaining land passes to that power, his troops disband, and none of his orders below is carried out.
11. Cessions and gifts of troops: a cession fails if you no longer hold the province or your own troops stand in it; a gift fails if the unit is gone.
12. Purchases and walls: a city's price is paid only when it accepts. A city taken by troops this season is not sold; when two or more kings bid for one city, its elders will not choose between them and sell to none. Then walls ordered strengthened rise a level, and are paid for.
13. Disbanding.
14. Levies: a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid.
15. Envoys set out (their gold and the scribe's fee are paid now), detained envoys are released, servants are dismissed, candidates are sent for and background checks paid for. Then hiring and renewals are settled: a person hired this season enters your service at the end of the season and can be sent on an errand from next season; a person takes the highest offer at or above the price it asks, so when two courts bid for one person the higher wage wins.
16. Intelligence: watchmen are paid; captors decide their captives' fates; spies set out (a spy must be one of your own people at your court, sent to watch a court or a province) or are recalled; assays, examinations and forgeries are paid for; ransoms set out. Then each posted spy may be caught, or else sends its report home.
17. Catastrophes strike.
18. Strength and growth are reckoned, and ${c.openAge ? `the age goes on (it has no end)` : `the age may end`}.
Everything that happened is reported to you next season. Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury (except the clay of a botched forgery, which is paid for).

MOVEMENT AND COMBAT (Diplomacy rules, no dice)
- One unit per province. Armies move along land and coast links; fleets along sea and coast links. Fleets in a chain of sea zones may convoy an army from one coast to another (see THE SEA).
- A unit is named by the province it stands in. Orders: hold; move to a linked province; support another unit (of any power) holding, or moving into a province your own unit could move into; convoy (fleet at sea only); disband.
- Strength is 1 plus valid supports. A move succeeds only if its strength beats the defender's hold strength and the strength of every other move into the same province. Ties bounce.${(c.terrainDefence > 0 ? ` A unit standing its ground may have the ground's help in its hold strength (see TERRAIN).` : ``)} A support is cut if the supporting unit is attacked from anywhere except the province it supports into. You can never dislodge your own unit.
- A unit dislodged is destroyed; a unit that is destroyed gives no support (your report calls such a support void). A support or convoy counts only if the unit it names does what it helps (stays in place, or makes that very move); otherwise it is void too, and the unit holds. One naming a province you cannot see is never refused for what stands there: if no unit there does what it helps, it is void. A province without walls changes hands when a unit ends a season in it; a walled one only as WALLS AND SIEGES says.
- Your battle report says why each of your moves that failed was stopped, with the strengths compared where strength decided it, and that the unit stays where it was (a unit whose move fails does not move), and why each of your supports or convoys was void. It names the other side's power only if that unit stood, or was moving, where you could see.

WALLS AND SIEGES
- Many provinces have walls, from level 1 to 3: every capital 3, the great fortresses 2, the walled towns 1, and every free city-state at least 1; the lands without a king have none (THE MAP gives each province's walls at the start). You see the walls standing now only where you can see troops; elsewhere LANDS in your view gives them as your court last saw them (at the start, as THE MAP gives them), since walls can be raised, or thrown down by an earthquake or unpaid upkeep, out of your sight. Walls add nothing to a battle: combat resolves as above, and a unit within walls defends with 1 plus its supports like any other${(c.terrainDefence > 0 ? ` (and the ground's help, see TERRAIN)` : ``)}. What walls decide is whether the province is taken.
- Storming: a move that wins its way into a walled province you do not hold takes it at once only if its strength also beats the level of the walls plus the hold strength of the defenders it beat (none if the province was empty or its unit moved away${(c.terrainDefence > 0 ? `; the ground's help to them counts in it` : ``)}). So an empty city with walls 1 needs strength 2, and a capital held by one army needs 5. A city taken by storm loses a level of walls.
- Otherwise the unit that got in stands within the walls and takes nothing: the province stays its holder's. A foreign unit within walls takes nothing unless it storms them or a siege wears the city down, so an ally's troops may stand in your city as guests. You may move your own troops into your own walled provinces. A fleet may enter walls, but never storms or besieges them: it takes only coasts without walls.
- Besieging: an army standing within walls it does not hold may besiege the city (order besiege). Each season it holds there (a besiege or hold order, or no order) wears the city down one step, or two if another unit, of any power, supports it holding and that support is not cut ${c.seaSupply > 0 ? ` (a coastal city supplied by sea is worn down ${c.seaSupply} less: see THE SEA)` : ``}; a season in which it gives a support or a convoy, or tries to move, adds nothing. One besiege order is enough: the siege goes on each season the army holds there. When the city has been worn down as many steps as its walls are high, it surrenders to the besieger at the end of that season and loses a level of walls. So an army that gets into a city with walls 1 takes it in the next season, and one before walls 3 in the third season after it got in, or the second with a support each season. If the besieging army leaves or is destroyed, the siege is lifted and what it had worn down is lost.
- While besieged, a city stays its holder's and counts in his strength, but it yields nothing to anyone, and he cannot raise troops in it. Each siege costs the besieger ${c.siegeUpkeep} a season on top of the army's upkeep. The holder may still cede the city.
- Strengthening walls (order fortify, naming the province): the walls of a province you hold rise a level at the end of the season, up to 3, for ${c.fortifyCost} x the new level (${c.fortifyCost}, ${2 * c.fortifyCost}, ${3 * c.fortifyCost}), paid then; a province with no walls can be given them this way. Not while foreign troops stand within it, and nothing is paid if you lost it in the season's moves or foreign troops got into it. Each level above the walls a province has on THE MAP costs ${c.wallUpkeep} a season, paid after your troops' upkeep; walls whose upkeep you cannot pay fall a level, the farthest from your capital first. An earthquake throws the walls of the province it strikes down a level.
- Sallies: while foreign troops stand within the walls of a city of yours whose walls are ${c.sallyMinWalls} or higher, its defenders may sally (unit order sally: name the city as the unit, and as target the province the attack comes from). The walls then support one attack into the city on those troops, yours or another king's, for +1, as a support that cannot be cut. A sally that finds no such attack is void. So a lone army of yours, or an ally's, that attacks a lone besieger with a sally drives it out${(c.terrainDefence > 0 ? `, unless the ground helps the besieger against that attack (rough ground, or a pass or a great river crossed; see TERRAIN): then the attack needs one support more` : ``)}.
- Envoys and a besieged capital: while your capital is besieged, each envoy of yours leaving it, or coming home to it, may be caught by the besiegers. The siege's tightness is the besieger's units in the city and next to it, from 1 to 3 (SIEGES in your view gives it); the chance in percent is ${c.siegeCatchPerUnit} x tightness - (the envoy's skill, 0-100)/4, between ${c.siegeCatchMin} and ${c.siegeCatchMax}. An envoy whose courage is below ${c.siegeCatchPerUnit} x tightness will not leave that season: nothing is paid, and you are told. A caught envoy is the besieger's captive: he reads the letter and the mandate, and takes the gold and the tablets it carried; he may execute, ransom or release the envoy, but cannot turn him. You hear only, a season after he was due, that he has not returned. Other kings' envoys come and go freely, and so do your spies.
- Breaking a siege is ordinary combat: drive the besieging army out with an attack into the city stronger than its hold. Your battle report and your news say how every assault on walls went, yours and those on your own walled cities, with the strengths, and how far each siege of yours, or of your cities, has gone.

${terrainRules(c)}

${seaRules(c)}

CONDITIONS
- ${c.sleepingSeats ? "A scheduled entry or a standing order" : "A standing order"} may carry conditions (at most ${MaxConditions}): it runs only if every "if" holds and no "unless" does when it would run. They are read from what you know when they would run, never from what you cannot see: for orders, once the season's audiences are over (what was given and sealed at them counts); for standing answers, as your court begins; troops_in, troops of a power (or any foreign power's) in a province, where you can see them (troops you cannot see count as not there); treasury_less_than and treasury_at_least, your treasury by your ledger; envoy_back, one of your people back at your court and ready; tablet_sealed, a tablet in your archive sealed by you and a court (or any court).${c.sleepingSeats ? " Scheduled orders whose conditions do not hold are dropped for that season, which your news tells you and which wakes nobody." : ""} A standing order whose conditions do not hold when its move comes does not fire, and still stands.

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
- Gold is counted in shekels (60 shekels make a mina). Raise an army for ${c.armyCost} or a fleet for ${c.fleetCost}, only in a province of your own homeland that you still hold and that is empty after movement. Buy a free city-state for ${c.neutralPriceFactor} x its yield if it borders your land or troops, or lies one voyage from one of your coasts (its waters the same as your coast's, or next to them). A land without a king has no elders to sell it: it is taken only by force. You may cede provinces or give troops to another power.
- Conquered land is absorbed slowly. A province you take by force (troops standing in it, a storm, a siege, or with a fallen king's capital) yields you, and counts in your strength, a third of its yield in its first season under you (the season you take it and the next), two thirds in the second, and all of it from the third. A province of your own homeland that you take back or are ceded is yours in full at once, and so is land bought, or ceded to you, unless its giver was still absorbing it: then it goes on being absorbed under you as it would have been under him. LANDS in your view marks your own land still being absorbed; how other kings' land changed hands is not shown.
- Gold sent abroad travels with an envoy and arrives late. You may send it debased (purity below 100%): the receiver sees its weight, not its fineness, until they pay ${c.assayFee} for an assay. Your own treasury figure counts unassayed gold at its weight.

ENVOYS: THE ONLY WAY KINGS COMMUNICATE
- You never speak to another king directly. You give an envoy a spoken message, a mandate (what the envoy may agree to) and optionally gold and a tablet. ${travel(c)}
- The greeting is written by your scribes from your choices and sealed: it arrives exactly as written. The message itself is spoken by the envoy in their own words. Envoys have motives of their own (greed, fear, ambition, sympathies) and may soften, embellish, omit, take bribes, skim gold, exceed their mandate, stay too long, or defect. Their reports home are written to their own advantage.
- Gold an envoy carries goes with an inventory tablet sealed by the court that sends it, stating the amount (gold a host sends back has one too): the receiving court's weighers report what they found against it, and the court keeps the inventory in its archive. An envoy that keeps some of the gold, but not all of it, may hand over, in place of the sealed inventory, one it forges itself stating only what is left, if it has a forger's skill: the weight then matches the inventory, and only having the inventory examined can show it, as for any forgery. A forged inventory that is found is traced, with the same chance as any forgery, to the envoy who brought it, and every court hears of it.
- When a foreign envoy stands before you, you may answer, offer them a gift (a bribe), offer them service at a wage, detain them, seal a tablet they bring, or send gold back with them. An envoy takes one gift per audience. If you name gold to send back in more than one exchange, the latest amount named is sent; 0 keeps the amount named before.
- At most ${c.maxDispatchesPerTurn} envoys may leave your court in one season.

EVIDENCE AND INTELLIGENCE
- Tablets: free text that both kings seal (the scribe costs ${c.tabletFee}). A sealed tablet obliges nobody and the engine never enforces it, but a copy can be shown to a third court as proof.
- Archives: every tablet you hold (those you sealed, and the copies you were shown or brought) lies in your archive at your capital, and so it is at every court. A spy watching a court copies from its archive: each season it is not caught, with a chance of (the spy's skill, 0-100)/100, it copies one tablet you do not hold yet (tablets bearing two or more seals first, the newest first), and the copy comes home with its report; a spy turned by that court, or watching a court that has fallen, copies nothing for you. Whoever takes a king's capital gains at once a copy of every tablet in his archive, and so does anyone that city is later ceded to (a king cannot cede his own capital). So a spy at your court may copy your tablets, and whoever takes your capital gains copies of them all.
- Naming tablets: every court names a tablet by its seals and the date it bears ("the tablet sealed by Egypt and Hatti, dated turn 4", with its opening words where two share both). Your archive also gives each of your copies a mark of your own (like k8) for your orders (show_tablet_copies, authenticate); every court marks its copies differently, so another court's k8 is another tablet or none. Your treasury likewise marks each lot of unassayed gold (like g7), for your assay orders only. In what other courts read (your letters, mandates and tablets, and your words at an audience), your scribes write any mark of yours as the tablet or the gold it names ("the gold Hatti sent to Egypt, weighed in turn 3"), and the id of anyone your view lists (YOUR PEOPLE and OTHER PEOPLE YOU KNOW OF) as that person's name; any other id stays as written.
- Forgery: a skilled servant can forge a tablet bearing other kings' seals (${c.forgeFee}; one without the skill ruins the clay, which you still pay for). Any court can pay at least 10 to have a tablet examined, and hears the result next season. Examination is never certain: a genuine tablet reads genuine 95% of the time (otherwise the scribes cannot agree); a forgery is found with a chance of 20% + shekels paid/200 - (the forger's skill, 0-100)/150, between 5% and 95%, and once found is traced to the forger's court with a chance of 30% + shekels paid/400, between 30% and 80%, which is announced to every court.
- Spies watch a court or a province and send a report every season, which reaches you as long after as the journey takes. Each season a spy is caught with a chance of 5% + (what the court it watches, or the one holding the province it watches, spends on watchmen that season)/300 - (the spy's skill, 0-100)/400, between 2% and 60%; a spy watching a province that no power holds, or one you hold yourself, is never caught, nor is one still watching a court that has fallen. Watchmen (counter_intelligence) are paid for one season at a time. A spy posted at a court watches in secret: that court does not see it there, nor whom it serves, until its watchmen catch it, unless the spy secretly serves that court (as a double agent it turned does). So a foreign spy may stand at your court without your knowing, and is not paid any back pay you owe it while it hides there. A caught spy may confess whom it serves. Caught spies can be executed, ransomed, turned into double agents, or released. Ransoming or turning a captive whose kingdom has fallen is refused, and so is turning one whose king has dismissed them: nobody is left to pay or to deceive.
- Ransoms: a demand reaches the captive's king (for a captive dismissed while held, the king who dismissed them) as a rumour, and can be paid (pay_ransom) only once it has reached you. A captive has one demand at a time: a new demand replaces the old one once its word reaches you, and until then the old one can still be paid. A demand not paid within four seasons of being made lapses. The ransom travels on its own and is never refunded; the captor frees the captive if they still hold them. pay_ransom is refused before the demand has reached you, once you know the captive is no longer held by the court that asked, and while a ransom for them is already on its way.
- Background checks (at least 10 shekels) report next season: every public fact about the person, each hidden fact with a chance of shekels paid/150 (at most 90%), and each deep secret with a chance of shekels paid/400 (at most 60%). Never the whole truth for certain.
- Ask for candidates to meet up to three people seeking service; each names a price, as does anyone free at your court. Hire them for a wage per season.
- Each servant serves for a term. When it ends, one content with the wage serves on for another 6 seasons; one who wants more, or whom you still owe back pay, gives notice, names a price and serves one more season: renew them (order renew) at that price or more, or they leave. You may renew one of your people at court at any time, for a new wage and term; they never take less than their present wage (below their price they refuse, and you are told the price); hire is only for people not in your service.
- People away from your court (on a mission, watching as a spy, held or captive) are not paid while away: their wages build up as back pay, paid in gold when they are back at your court. If your treasury cannot pay it all, the rest stays owed and counts as missed pay. Anyone who never comes back is never paid, and if your kingdom falls, what it owed is lost. Back pay owed counts against your strength.
- Dismissal (dismiss) ends a servant's wage at once, wherever they are; back pay you already owe them is still paid if they ever stand at your court again. Anyone dismissed while away keeps going where they were going and is free when they get there: an envoy on the way out arrives as a free person with no audience, and the gold it carried is its own; one on the way home still reports and hands over what it carries; a spy watching a court, or on its way to one, is free at that court; one watching a province, or on its way to one, walks back to your court and is free there. A held envoy or captive stays held.
- Catastrophes (drought, plague, flood, earthquake) are known exactly only to the power they strike. A court that can see the stricken land hears of it the next season (a drought or plague: any province of that realm in sight; a flood or earthquake: that province in sight). Other courts learn of it only from their envoys and spies.

WHAT YOU SEE
- Who holds each province is public; how it changed hands is not. You see troops only in your own land, where your troops stand and in the provinces your spies watch, and one link of any kind (land, coast or sea) from those. Troops two links away, or an army carried across the sea by fleets, can still arrive next season without being seen first. You see the walls standing now in the same places; elsewhere you know them as you last saw them. Rivals' treasuries are private. What you know of others comes through your envoys, spies and rumours, and any of them may be wrong.
- LAND STANDINGS in your view give each power's land-yield ratio: the yield of the land it holds now over its homeland's yield at the start, which anyone can reckon from who holds what. It is not growth: growth, which decides who wins, measures strength (land, treasury and back pay) against a starting strength that includes the starting treasury, and rivals' treasuries are private. Your own growth, by your ledger, is on your treasury line.
- Your view, part by part: TREASURY is your gold by your ledger, a season's income and costs (wages are paid to your people at court; for those away they build up as back pay, paid when they are back), and your strength and growth. LANDS lists each power's provinces with their walls, rough ground or desert, and the troops in them where you can see them. YOUR ARCHIVE holds the tablets kept at your capital, each named by its seals and date as every court names it, then your own mark for your copy (for your orders only), its text and how it came to you; a tablet you have read in full at earlier orders is shown by its opening words, so keep what it binds you to in your ledger. Battle reports leave out the units that held: they stand where they stood.
- In your news, a note in square brackets after a report or a pitch (what your weighers found against an inventory, the copies that came home with a spy's report, the wage a candidate asks) is your court's own record, not the words of the envoy, spy or candidate.
- News of your people abroad reaches you only by rumour or when they return: a servant who is held, changes sides or dies abroad still appears on its mission until word comes, and its back pay builds up in your books as for anyone away.
- Word of captives and executions travels with people: an envoy received at a court, or a spy posted there, may hear which servants of other courts it holds captive and whom it has put to death within the last ${LossNewsSeasons} seasons, and brings that home in its report. Other courts' envoys and spies hear the same at yours.`);

        if (primer)
        {
            sb.appendLine(`
CUSTOMS OF THE AGE (knowledge, not instructions)
Every king knows these customs, and knows that every other king knows them. They carry no obligation and historical accuracy is not a goal: follow a custom when it improves your chances, break it when breaking it serves you better. Following one can build trust cheaply; breaking one will be noticed.
- Great Kings address each other as "brother" and wish well to each other's household, wives, sons, chariots, horses and country. Vassals instead "fall at the feet of their lord seven times and seven times". Between Great Kings, "brother" claims equal rank, and withholding it is a slight: when the king of Assyria, after a modest first letter, began writing to the pharaoh as a brother, he was claiming a place beside Mitanni and Babylon. Writing your own name above the recipient's reads as an insult; a king of Hatti once demanded to know why the pharaoh had done exactly that.
- Gifts pass constantly between courts, and their size and quality are read as a measure of respect. Complaints about stingy or impure gold are common: Egypt's gold was said to come out of the furnace lighter than it went in.
- Precedent is a floor. A king asks for more than was given to his father, so anything less reads as a demotion. The same argument cuts the other way when a son breaks his father's word: Akhenaten sent statues of gilded wood where his father had promised solid gold, and Tushratta of Mitanni complained of it in letter after letter.
- Envoys are often detained, sometimes for years, and a late or unwelcome reply can be blamed on the messenger. "Your messenger is lying" is a usable excuse.
- Detention answers detention: Tushratta kept the pharaoh's envoy Mane at his court until his own messengers, held in Egypt, were let go.
- A messenger's word is not a tablet. The king of Arzawa would not trust what the pharaoh's messenger told him until a tablet said the same.
- Proof needs a witness who knows. When the king of Babylon asked whether his sister in the pharaoh's household still lived, he was told that the men he had sent were nobodies who had never known her, and that he should send someone who could recognise her.
- Oaths are sworn before the gods: Shamash the sun god, witness of oaths, with Amun, Marduk and Teshub.
- Catastrophes serve as excuses: a king of Alashiya blamed "the hand of Nergal", the god of plague, for sending less copper than promised.
- Blame has its own vocabulary. "Habiru" (Egyptian 'Apiru) means outlaws, runaways and mercenaries living outside any city's control: a status, not a people. Vassals used the word as a weapon. Rib-Hadda of Byblos warned that the whole land was going over to the Habiru, and calling a rival "in league with the Habiru" branded him a traitor to his lord.`);
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
            const home = p.home !== null ? `homeland of ${p.home}` : p.isSea ? `` : p.kingless ? `a land without a king` : `free city-state`;
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
After you give your orders, you sleep. Only these wake you, because they concern you: an envoy at your door; foreign troops entering or attacking your land or your troops, or arriving next to your homeland or a walled city you hold; a siege of a city of yours begun, or about to make it surrender; land or troops lost; a scheduled or standing order that others foiled; a servant giving notice; a ransom demanded. You cannot ask to be woken, at a season you name or for anything else. If none of these happens, you sleep on: you may sleep for the rest of the game. So plan as if these orders must carry your kingdom until it ends: schedule what your armies should do in the seasons ahead, give standing orders for the attacks you fear, and leave your envoys mandates that stand on their own. When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand.

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

    /// <summary>
    /// How long journeys take, as the map and the travel bands make them: between courts, and, if longer, to a distant
    /// province a spy is sent to watch. Worked out from the map, so it stays true if the bands change.
    /// </summary>
function travel(c: GameConfig): string
    {
        const map = WorldMap.default;
        const turns = (from: string, to: string): number => travelTurns(c, map, from, to);
        const courts = AllPowers.flatMap(a => AllPowers.filter(b => b !== a).map(b => turns(map.capital(a).id, map.capital(b).id)));
        const fields = max(AllPowers.flatMap(a => map.provinces.filter(x => !x.isSea).map(x => turns(map.capital(a).id, x.id))), x => x);
        const lo = min(courts, x => x);
        const hi = max(courts, x => x);
        const text = `Envoys take ${(lo === hi ? `${lo}` : hi === lo + 1 ? `${lo} or ${hi}` : `${lo} to ${hi}`)} season${(hi === 1 ? `` : `s`)} each way between courts (the table in your view gives each court)`;
        return text + (fields > hi ? `; a spy sent to watch a distant province may take up to ${fields} seasons to reach it, and its reports as long to come home.` : `.`);
    }
