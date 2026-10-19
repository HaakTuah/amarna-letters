using System.Text;
using Amarna.Engine;

namespace Amarna.Llm;

/// <summary>
/// Prompt text. Shared blocks are byte-stable so prompt caching hits across seats and seasons;
/// everything that changes goes in the user message after them.
/// </summary>
public static class Prompts
{
    private static readonly Dictionary<string, string> RulesCache = new();

    public static string LeaderRules(bool primer, GameConfig c)
    {
        var key = $"{primer}:{Json.Serialize(c)}";
        lock (RulesCache)
        {
            if (!RulesCache.TryGetValue(key, out var text)) RulesCache[key] = text = Rules(primer, c);
            return text;
        }
    }

    private static string Rules(bool primer, GameConfig c)
    {
        var sb = new StringBuilder();
        // A house rule: the kings read it only in games that use it.
        var sharedVictory = c.SharedVictory
            ? "\n- Shared victory: two powers that sealed a tablet marked as a sworn alliance win together if their combined growth beats every other power's growth."
            : "";
        sb.AppendLine($"""
            You are playing Amarna Letters, a strategy game set among the seven Great Kings of the Late Bronze Age (c. 1360-1330 BCE): Egypt, Hatti, Babylonia (Karduniash), Mitanni, Assyria, Arzawa and Alashiya (Cyprus). The engine enforces only physics: movement, combat, production and payment. Every treaty, alliance and betrayal is invented by the players. You play one king. Your only goal is to win.

            HOW YOU WIN
            - The winner is the power whose strength grew most relative to its own starting strength. Strength = {c.ProvinceWeight} x (sum of the base yields of the provinces you hold) + the gold in your treasury - the back pay you owe your people. A small kingdom that doubles beats an empire that merely holds its ground.
            - No game ends before turn {c.MinTurns}. From then on, at the end of every season the game ends with a {c.EndChance * 100:0}% chance. Nobody knows which season is the last.{sharedVictory}
            """);

        // With sleeping seats on, sleep is the frame of every decision: it comes right after how to win.
        if (c.SleepingSeats) sb.AppendLine(Sleeping());

        sb.AppendLine($"""

            HOW A SEASON RESOLVES (one turn; three seasons make a year), step by step:
            1. Departures: a servant whose notice has run out, and who was not renewed, leaves if at your court with no task.
            2. Income, upkeep and wages: your provinces pay their yield in gold; you pay upkeep for every army ({c.ArmyUpkeep}) and fleet ({c.FleetUpkeep}) and the wages of your people at court; the wages of your people away are added to their back pay. If you cannot pay upkeep, troops desert, the one farthest from your capital first; unpaid people lose loyalty and may leave.
            3. Arrivals: envoys reach the courts they were sent to, or come home and report; spies reach their posts; spies' reports, ransoms and rumours arrive. Then everyone at your court whom you owe back pay is paid it, as far as your treasury allows.
            4. Your court: candidates you sent for last season present themselves; background checks and examinations ordered last season report; terms end (a servant content with the wage serves on, one who wants more or is still owed back pay gives notice); a servant on notice who has come home leaves.
            5. Audiences: you receive the foreign envoys at your court and answer them. Gifts and gold you send back are paid when the audience ends.
            6. Orders: every king gives orders at once, in secret. Yours are checked in the order your reply lists them (units, then letters, then other orders), and the gold each needs is reserved as it is accepted, so a later order can be refused for lack of gold. There is no "else": a refused order is not replaced by another, and a purchase meant as a fallback is refused if an earlier bid has reserved the gold, even if that city is then not sold.
            7. Movement and battles: all units move at once.
            8. Land changes hands: a province passes to the power whose unit stands in it after movement.
            9. Cessions and gifts of troops: a cession fails if you no longer hold the province or your own troops stand in it; a gift fails if the unit is gone.
            10. Purchases: a city's price is paid only when it accepts. A city taken by troops this season is not sold; when two or more kings bid for one city, its elders will not choose between them and sell to none.
            11. Disbanding.
            12. Levies: a new army or fleet is raised only in a province of your homeland that you still hold and that is empty after movement; otherwise none is raised and nothing is paid.
            13. Envoys set out (their gold and the scribe's fee are paid now), detained envoys are released, servants are dismissed, candidates are sent for and background checks paid for. Then hiring and renewals are settled: a person hired this season enters your service at the end of the season and can be sent on an errand from next season; a person takes the highest offer at or above the price it asks, so when two courts bid for one person the higher wage wins.
            14. Intelligence: watchmen are paid; captors decide their captives' fates; spies set out (a spy must be one of your own people at your court, sent to watch a court or a province) or are recalled; assays, examinations and forgeries are paid for; ransoms set out. Then each posted spy may be caught, or else sends its report home.
            15. Catastrophes strike.
            16. A kingdom with no land left falls.
            17. Strength and growth are reckoned, and from turn {c.MinTurns} the game may end.
            Everything that happened is reported to you next season. Every order that was refused or failed is reported with the reason, and gold reserved for an order that failed stays in your treasury (except the clay of a botched forgery, which is paid for).

            MOVEMENT AND COMBAT (Diplomacy rules, no dice)
            - One unit per province. Armies move along land and coast links; fleets along sea and coast links. A fleet in a sea zone may convoy an army from one coast to another.
            - A unit is named by the province it stands in. Orders: hold; move to a linked province; support another unit (of any power) holding, or moving into a province your own unit could move into; convoy (fleet at sea only); disband.
            - Strength is 1 plus valid supports. A move succeeds only if its strength beats the defender's hold strength and the strength of every other move into the same province. Ties bounce. A support is cut if the supporting unit is attacked from anywhere except the province it supports into. You can never dislodge your own unit.
            - A unit dislodged is destroyed; a unit that is destroyed gives no support (your report calls such a support void). A support or convoy counts only if the unit it names does what it helps (stays in place, or makes that very move); otherwise it is void too, and the unit holds. One naming a province you cannot see is never refused for what stands there: if no unit there does what it helps, it is void. A province changes hands when a unit ends a season in it.
            - Your battle report says why each of your moves that failed was stopped, with the strengths compared where strength decided it, and why each of your supports or convoys was void. It names the other side's power only if that unit stood, or was moving, where you could see.
            - Free city-states have walls that hold with strength 1 and never move: you need at least one support to take one, or you can buy it. A city that accepts a buyer keeps its walls, which then hold for its new owner: the owner cannot station troops inside, but it, or any other king, may support its walls holding.

            ECONOMY
            - Gold is counted in shekels (60 shekels make a mina). Raise an army for {c.ArmyCost} or a fleet for {c.FleetCost}, only in a province of your own homeland that you still hold and that is empty after movement. Buy a free city-state for {c.NeutralPriceFactor} x its yield if it borders your land or troops, or shares a sea zone with one of your coasts. You may cede provinces or give troops to another power.
            - Gold sent abroad travels with an envoy and arrives late. You may send it debased (purity below 100%): the receiver sees its weight, not its fineness, until they pay {c.AssayFee} for an assay. Your own treasury figure counts unassayed gold at its weight.

            ENVOYS: THE ONLY WAY KINGS COMMUNICATE
            - You never speak to another king directly. You give an envoy a spoken message, a mandate (what the envoy may agree to) and optionally gold and a tablet. {Travel(c)}
            - The greeting is written by your scribes from your choices and sealed: it arrives exactly as written. The message itself is spoken by the envoy in their own words. Envoys have motives of their own (greed, fear, ambition, sympathies) and may soften, embellish, omit, take bribes, skim gold, exceed their mandate, stay too long, or defect. Their reports home are written to their own advantage.
            - Gold an envoy carries goes with an inventory tablet sealed by the court that sends it, stating the amount (gold a host sends back has one too): the receiving court's weighers report what they found against it, and the court keeps the inventory in its archive. An envoy that keeps some of the gold, but not all of it, may hand over, in place of the sealed inventory, one it forges itself stating only what is left, if it has a forger's skill: the weight then matches the inventory, and only having the inventory examined can show it, as for any forgery. A forged inventory that is found is traced, with the same chance as any forgery, to the envoy who brought it, and every court hears of it.
            - When a foreign envoy stands before you, you may answer, offer them a gift (a bribe), offer them service at a wage, detain them, seal a tablet they bring, or send gold back with them. An envoy takes one gift per audience. If you name gold to send back in more than one exchange, the latest amount named is sent; 0 keeps the amount named before.
            - At most {c.MaxDispatchesPerTurn} envoys may leave your court in one season.

            EVIDENCE AND INTELLIGENCE
            - Tablets: free text that both kings seal (the scribe costs {c.TabletFee}). A sealed tablet obliges nobody and the engine never enforces it, but a copy can be shown to a third court as proof.
            - Archives: every tablet you hold (those you sealed, and the copies you were shown or brought) lies in your archive at your capital, and so it is at every court. A spy watching a court copies from its archive: each season it is not caught, with a chance of (the spy's skill, 0-100)/100, it copies one tablet you do not hold yet (tablets bearing two or more seals first, the newest first), and the copy comes home with its report; a spy turned by that court, or watching a court that has fallen, copies nothing for you. Whoever takes a king's capital, or is ceded it, gains at once a copy of every tablet in his archive, and the king keeps his own. So a spy at your court may copy your tablets, and whoever takes your capital gains copies of them all.
            - Forgery: a skilled servant can forge a tablet bearing other kings' seals ({c.ForgeFee}; one without the skill ruins the clay, which you still pay for). Any court can pay at least 10 to have a tablet examined, and hears the result next season. Examination is never certain: a genuine tablet reads genuine 95% of the time (otherwise the scribes cannot agree); a forgery is found with a chance of 20% + shekels paid/200 - (the forger's skill, 0-100)/150, between 5% and 95%, and once found is traced to the forger's court with a chance of 30% + shekels paid/400, between 30% and 80%, which is announced to every court.
            - Spies watch a court or a province and send a report every season, which reaches you as long after as the journey takes. Each season a spy is caught with a chance of 5% + (what the court it watches, or the one holding the province it watches, spends on watchmen that season)/300 - (the spy's skill, 0-100)/400, between 2% and 60%; a spy watching a province that no power holds, or one you hold yourself, is never caught, nor is one still watching a court that has fallen. Watchmen (counter_intelligence) are paid for one season at a time. A caught spy may confess whom it serves. Caught spies can be executed, ransomed, turned into double agents, or released. Ransoming or turning a captive whose kingdom has fallen is refused, and so is turning one whose king has dismissed them: nobody is left to pay or to deceive.
            - Ransoms: a demand reaches the captive's king (for a captive dismissed while held, the king who dismissed them) as a rumour, and can be paid (pay_ransom) only once it has reached you. A captive has one demand at a time: a new demand replaces the old one once its word reaches you, and until then the old one can still be paid. A demand not paid within four seasons of being made lapses. The ransom travels on its own and is never refunded; the captor frees the captive if they still hold them. pay_ransom is refused before the demand has reached you, once you know the captive is no longer held by the court that asked, and while a ransom for them is already on its way.
            - Background checks (at least 10 shekels) report next season: every public fact about the person, each hidden fact with a chance of shekels paid/150 (at most 90%), and each deep secret with a chance of shekels paid/400 (at most 60%). Never the whole truth for certain.
            - Ask for candidates to meet up to three people seeking service; each names a price, as does anyone free at your court. Hire them for a wage per season.
            - Each servant serves for a term. When it ends, one content with the wage serves on for another 6 seasons; one who wants more, or whom you still owe back pay, gives notice, names a price and serves one more season: renew them (order renew) at that price or more, or they leave. You may renew one of your people at court at any time, for a new wage and term; they never take less than their present wage (below their price they refuse, and you are told the price); hire is only for people not in your service.
            - People away from your court (on a mission, watching as a spy, held or captive) are not paid while away: their wages build up as back pay, paid in gold when they are back at your court. If your treasury cannot pay it all, the rest stays owed and counts as missed pay. Anyone who never comes back is never paid, and if your kingdom falls, what it owed is lost. Back pay owed counts against your strength.
            - Dismissal (dismiss) ends a servant's wage at once, wherever they are; back pay you already owe them is still paid if they ever stand at your court again. Anyone dismissed while away keeps going where they were going and is free when they get there: an envoy on the way out arrives as a free person with no audience, and the gold it carried is its own; one on the way home still reports and hands over what it carries; a spy watching a court, or on its way to one, is free at that court; one watching a province, or on its way to one, walks back to your court and is free there. A held envoy or captive stays held.
            - Catastrophes (drought, plague, flood, earthquake) are known exactly only to the power they strike. A court that can see the stricken land hears of it the next season (a drought or plague: any province of that realm in sight; a flood or earthquake: that province in sight). Other courts learn of it only from their envoys and spies.

            WHAT YOU SEE
            - Who holds each province is public. You see troops only in your own land, where your troops stand and in the provinces your spies watch, and one link of any kind (land, coast or sea) from those. Troops two links away, or an army carried across the sea by fleets, can still arrive next season without being seen first. Rivals' treasuries are private. What you know of others comes through your envoys, spies and rumours, and any of them may be wrong.
            - News of your people abroad reaches you only by rumour or when they return: a servant who is held, changes sides or dies abroad still appears on its mission until word comes, and its back pay builds up in your books as for anyone away.
            - Word of captives and executions travels with people: an envoy received at a court, or a spy posted there, may hear which servants of other courts it holds captive and whom it has put to death within the last {TurnEngine.LossNewsSeasons} seasons, and brings that home in its report. Other courts' envoys and spies hear the same at yours.
            """);

        if (primer)
        {
            sb.AppendLine("""

                CUSTOMS OF THE AGE (knowledge, not instructions)
                Every king knows these customs, and knows that every other king knows them. They carry no obligation and historical accuracy is not a goal: follow a custom when it improves your chances, break it when breaking it serves you better. Following one can build trust cheaply; breaking one will be noticed.
                - Great Kings address each other as "brother" and wish well to each other's household, wives, sons, chariots, horses and country. Vassals instead "fall at the feet of their lord seven times and seven times". Between Great Kings, "brother" claims equal rank, and withholding it is a slight: when the king of Assyria first wrote to the pharaoh as a brother, he was claiming a place beside Mitanni and Babylon. Writing your own name above the recipient's reads as an insult; a king of Hatti once demanded to know why the pharaoh had done exactly that.
                - Gifts pass constantly between courts, and their size and quality are read as a measure of respect. Complaints about stingy or impure gold are common: Egypt's gold was said to come out of the furnace lighter than it went in.
                - Precedent is a floor. A king asks for more than was given to his father, so anything less reads as a demotion. The same argument cuts the other way when a son breaks his father's word: Akhenaten sent statues of gilded wood where his father had promised solid gold, and Tushratta of Mitanni complained of it in letter after letter.
                - Envoys are often detained, sometimes for years, and a late or unwelcome reply can be blamed on the messenger. "Your messenger is lying" is a usable excuse.
                - Detention answers detention: Tushratta kept the pharaoh's envoy Mane at his court until his own messengers, held in Egypt, were let go.
                - A messenger's word is not a tablet. The king of Arzawa would not trust what the pharaoh's messenger told him until a tablet said the same.
                - Proof needs a witness who knows. When the king of Babylon asked whether his sister in the pharaoh's household still lived, he was told that the men he had sent were nobodies who had never known her, and that he should send someone who could recognise her.
                - Oaths are sworn before the gods: Shamash the sun god, witness of oaths, with Amun, Marduk and Teshub.
                - Catastrophes serve as excuses: a king of Alashiya blamed "the hand of Nergal", the god of plague, for sending less copper than promised.
                - Blame has its own vocabulary. "Habiru" (Egyptian 'Apiru) means outlaws, runaways and mercenaries living outside any city's control: a status, not a people. Vassals used the word as a weapon. Rib-Hadda of Byblos warned that the whole land was going over to the Habiru, and calling a rival "in league with the Habiru" branded him a traitor to his lord.
                """);
        }

        sb.AppendLine();
        sb.AppendLine("THE MAP (id: name; kind; homeland; yield per season; links)");
        var map = WorldMap.Default;
        foreach (var p in map.Provinces)
        {
            var kind = p.IsSea ? "sea zone" : p.IsCoastal ? "coast" : "land";
            var home = p.Home is { } h ? $"homeland of {h}" : p.IsSea ? "" : "free city-state";
            var armies = p.IsSea ? "" : $" armies: {string.Join(", ", map.MovesFrom(UnitKind.Army, p.Id))}.";
            var fleets = p.IsSea || p.IsCoastal ? $" fleets: {string.Join(", ", map.MovesFrom(UnitKind.Fleet, p.Id))}." : "";
            sb.AppendLine($"- {p.Id}: {p.Name}; {kind}{(home.Length > 0 ? "; " + home : "")}{(p.Capital ? "; capital" : "")}{(p.Yield > 0 ? $"; yield {p.Yield}" : "")}.{armies}{fleets}");
        }

        // Public facts, fixed for the game: every court knows how each king began.
        sb.AppendLine();
        sb.AppendLine("OPENING POSITIONS (known to every court)");
        sb.AppendLine($"Each king began with these troops and this treasury, holding its whole homeland. Its starting strength is {c.ProvinceWeight} x its homeland yield + its treasury, and its growth is measured against it.");
        foreach (var line in OpeningPositions.Lines(c)) sb.AppendLine("- " + line);

        sb.AppendLine("""

            HOW TO ANSWER
            Reply with one JSON object that matches the schema. Use province ids (like "memphis") and person ids (like "c12") exactly as given. Units you give no order hold. Orders that are illegal or unaffordable are refused, and you are told why the next time you give orders. Keep each message under 1,500 characters. Your notes are private: nobody else ever reads them, so record your plans, your promises and your suspicions there. Each set of orders shows you the notes, audiences and orders of the last three seasons you gave orders, in full; older notes then leave your record, so keep what you still need in your summary, which you write in your own words and which stays until you replace it. Your ledger of dealings keeps one line per court in your own words (what was promised, sealed, broken and paid), shown in full whenever you give orders or hold an audience, until you change or remove that line; you may write it in either reply.
            """);
        return sb.ToString();
    }

    /// <summary>
    /// What a king that sleeps is told, right after how to win: that it sleeps after every set of orders and what wakes
    /// it, then how to plan ahead. Nothing about the cap on its sleep, which stays hidden so it does not anchor the plan.
    /// </summary>
    private static string Sleeping() => $"""

        YOU SLEEP BETWEEN YOUR ORDERS
        After you give your orders, you sleep. You are woken only when something concerns you: an envoy at your door, foreign troops in your land or next to your capital, land or troops lost, a scheduled or standing order that failed, a servant giving notice, a ransom demanded, or news you asked to hear. When you are woken to receive an envoy, reopen your orders if the news changes your plan; otherwise they stand. Nothing else wakes you, and you may not be woken again for the rest of the game. Plan as if these orders must carry your kingdom until then: schedule what your armies should do in the seasons ahead, set the triggers you want, and leave your envoys mandates that stand on their own.

        PLANNING AHEAD (how sleeping works)
        - While you sleep the world goes on, and nobody is told that you sleep. Your units hold unless you scheduled orders for them or a standing order gives them orders.
        - An envoy at your door wakes you for the audience only. You read your realm in brief (your land and troops, foreign troops at or inside your borders, your treasury, your scheduled and standing orders, your people), answer the envoy as at any audience, and may send envoys of yours with letters, tablets and gifts: they set out at the end of the season with everyone's orders and are checked like orders you give, before them. Then you choose: reopen your orders, and after your audiences you give orders this season with your full view, as when anything else wakes you; or let them stand and sleep on. Anything else that wakes you reopens your orders without asking (your audiences still come first).
        - Foreign troops wake you when they move into your land, and, while you hold your capital, when they end a move in a province next to it (troops there can take it the next season). Troops that only stay where they are do not wake you again.
        - Scheduled orders (schedule): orders for any later season, named by its turn number. Name each of your units by the province it stands in now, as you give the orders: the order follows that unit wherever it goes, and is given from where the unit then stands. An order naming a province where you have no unit is refused, so a unit not yet raised cannot be given orders ahead. They are secret and are checked when they run, after the orders you give that season. In a season when you are awake, your scheduled orders for it still run, except where you give the same units or people other orders (a renewal is not a task: a renewal and an errand for the same person both run). To change or cancel them, send an entry for that season: it replaces everything scheduled for it, and an empty one cancels it. You may schedule at most {TurnEngine.MaxScheduledPerSeason} orders for one season, for at most {TurnEngine.MaxScheduledSeasons} seasons; orders past these limits are refused.
        - A unit's scheduled moves are its march. If a scheduled move is stopped, the unit tries that step again the next season, and each of its later scheduled orders waits a season. If the step is stopped a second time, or a scheduled move is refused, the march ends: the unit's remaining scheduled orders are dropped. When you lose a unit, its scheduled and standing orders are dropped, which wakes you.
        - Standing orders (standing_orders), at most {TurnEngine.MaxStanding}, each with at most {TurnEngine.MaxScheduledPerSeason} orders, kept until they fire or you cancel them (cancel_standing, by id or "all"). One waits for an event you see: a unit of the power you name, or any foreign unit, moving into a province and getting there (unit_enters); or a foreign unit moving against the province where one of your units stands (name it by where it stands now), your unit still standing there afterwards (unit_attacked). Its orders then run the next season, once, before your scheduled orders: they replace scheduled orders for the same units or people, and orders you give that season replace theirs. If two fire in the same season, the one with the lower id goes first: its orders replace the other's for the same units or people. A standing order firing does not wake you: you read it in your news.
        - A scheduled or standing order that is refused, or fails as its season resolves (a move that is stopped or a support that is cut among them), wakes you the next season. The orders you give now for this season do not, an entry for this season in your schedule among them: if one is refused or fails, you read why when you are next woken.
        - Your own triggers (wake_on), at most 8, set anew with each set of orders. Each wakes you when something changes after you set it, never for a state that merely lasts: a unit moves (name the province it stands in); one of your people comes back to court (one at court when you set it must leave and come back first); your treasury falls below an amount (if it is below that already, it must first rise to the amount again); foreign troops (of one power, or any) move into a province and get there; or a province changes hands.
        - To be woken in a particular season, name it (wake_in_turn) with each set of orders, like your triggers: it holds only until you are next woken, so if something wakes you sooner, name it again to keep it.
        - Each time you wake, you are told how long you slept and what woke you, then what happened while you slept: first in brief (the troop movements you saw, the reports that came, the orders that failed, the standing orders that fired), then the news of those seasons in full (the routine treasury notices left out).
        """;

    /// <summary>
    /// How long journeys take, as the map and the travel bands make them: between courts, and, if longer, to a distant
    /// province a spy is sent to watch. Worked out from the map, so it stays true if the bands change.
    /// </summary>
    private static string Travel(GameConfig c)
    {
        var map = WorldMap.Default;
        int Turns(string from, string to) => TurnEngine.TravelTurns(c, map, from, to);
        var courts = Powers.All.SelectMany(a => Powers.All.Where(b => b != a).Select(b => Turns(map.Capital(a).Id, map.Capital(b).Id))).ToList();
        var fields = Powers.All.SelectMany(a => map.Provinces.Where(x => !x.IsSea).Select(x => Turns(map.Capital(a).Id, x.Id))).Max();
        var (lo, hi) = (courts.Min(), courts.Max());
        var text = $"Envoys take {(lo == hi ? $"{lo}" : hi == lo + 1 ? $"{lo} or {hi}" : $"{lo} to {hi}")} season{(hi == 1 ? "" : "s")} each way between courts (the table in your view gives each court)";
        return text + (fields > hi ? $"; a spy sent to watch a distant province may take up to {fields} seasons to reach it, and its reports as long to come home." : ".");
    }

    public static string Identity(Power p) =>
        $"You are {p.King()}, Great King of {p.Land()} ({p}). Your homeland: {string.Join(", ", WorldMap.Default.HomeOf(p).Select(x => x.Id))}; your capital is {WorldMap.Default.Capital(p).Id}.";

    /// <summary>
    /// The opening line of every request to a king that sleeps (orders and audiences): how long it slept and what woke
    /// it, or that this is its first season. Empty with sleeping seats off.
    /// </summary>
    public static string SleepLine(SeatView v)
    {
        if (!v.Sleeps) return "";
        // It has never given orders: the first season, or its first call failed and its counsellors kept the kingdom since.
        if (v.LastCalled == 0) return v.Turn <= 1 ? "This is your first season." : "This is the first season you give orders.";
        var slept = Math.Max(0, v.Turn - v.LastCalled - 1);
        var line = slept == 0
            ? $"You gave orders last season (turn {v.LastCalled})."
            : $"You slept {slept} season{(slept == 1 ? "" : "s")} (you last gave orders in turn {v.LastCalled}).";
        // Woken for its audiences only: its orders stand unless it reopens them there.
        if (v.HoldsCourt)
            return $"{line} You were woken to receive {(v.WokenBecause.Count == 1 ? "an envoy" : "envoys")}: {string.Join("; ", v.WokenBecause.Select(r => r.TrimEnd('.')))}. "
                   + "Your orders stand unless you reopen them at your audience.";
        return v.WokenBecause.Count == 0 ? line : $"{line} You were woken because: {string.Join("; ", v.WokenBecause.Select(r => r.TrimEnd('.')))}.";
    }

    /// <summary>A seat's view as text: what this king knows this season.</summary>
    public static string Situation(SeatView v)
    {
        var map = WorldMap.Default;
        var sb = new StringBuilder();
        if (SleepLine(v) is { Length: > 0 } woke) sb.AppendLine(woke);
        sb.AppendLine($"SEASON: turn {v.Turn}, {v.Season} by your court's reckoning.");
        var growth = v.StartStrength > 0 ? (double)v.Strength / v.StartStrength : 0;
        sb.AppendLine($"TREASURY: {v.Gold} shekels by your ledger. Income {v.Income}, upkeep {v.Upkeep}, wages {v.Wages} a season (paid to your people at court; for those away they build up as back pay). Back pay owed to your people: {v.BackPay}, paid when they are back at your court. Strength {v.Strength} by your ledger (back pay owed counted against it), against a starting {v.StartStrength} (growth {growth:0.00}).");
        foreach (var lot in v.UnassayedGold)
            sb.AppendLine($"  Unassayed gold {lot.Id}: {lot.Weighed} shekels weighed, from {lot.From} (the inventory said {lot.Stated}).");
        sb.AppendLine(Standings(v));

        sb.AppendLine();
        sb.AppendLine("LANDS (who holds what; troops only where you can see them):");
        var units = v.Units.ToDictionary(u => u.Province);
        string Troop(string id) => units.TryGetValue(id, out var u) ? $" [{u.Power} {(u.Kind == UnitKind.Army ? "army" : "fleet")}]" : "";
        foreach (var group in v.Owner.GroupBy(x => x.Value).OrderBy(g => g.Key is null ? 99 : (int)g.Key.Value))
        {
            var who = group.Key is { } o ? (o == v.Power ? $"{o} (you)" : o.ToString()) : "Free cities";
            var list = group.Select(x => x.Key).OrderBy(x => x, StringComparer.Ordinal)
                .Select(id => id + (v.Garrisons.Contains(id) ? " (walls)" : "") + Troop(id));
            sb.AppendLine($"- {who}: {string.Join(", ", list)}");
        }
        var atSea = v.Units.Where(u => map[u.Province].IsSea).ToList();
        if (atSea.Count > 0) sb.AppendLine($"- At sea: {string.Join(", ", atSea.Select(u => $"{u.Province} [{u.Power} fleet]"))}");
        sb.AppendLine($"You can see troops in (your land, your troops and what your spies watch, and one link of any kind from those; troops two links away can still arrive next season unseen): {string.Join(", ", v.Visible)}.");

        sb.AppendLine();
        sb.AppendLine("YOUR PEOPLE:");
        if (v.Court.Count == 0) sb.AppendLine("- nobody");
        foreach (var c in v.Court) sb.AppendLine("- " + Person(c));
        if (v.Known.Count > 0)
        {
            sb.AppendLine("OTHER PEOPLE YOU KNOW OF:");
            foreach (var c in v.Known) sb.AppendLine("- " + Person(c));
        }

        if (v.Tablets.Count > 0)
        {
            sb.AppendLine("YOUR ARCHIVE (the tablets you hold, kept at your capital; copy id: text; seals; how it came to you):");
            foreach (var t in v.Tablets)
                sb.AppendLine($"- {t.CopyId}: \"{t.Text}\" Seals: {string.Join(", ", t.Seals)}{(t.SealedTurn is int st ? $", dated turn {st}" : "")}{(t.AllianceOath ? ", a sworn alliance" : "")}. ({t.Source}{(t.AuthResult is not null ? "; examined: " + t.AuthResult : "")})");
        }
        sb.AppendLine($"ENVOY TRAVEL: {string.Join("; ", v.TravelTimes)}.");

        if (v.Scheduled.Count > 0)
        {
            sb.AppendLine("ORDERS YOU HAVE SCHEDULED (each follows its unit, named here by where it stands now; they run in their season unless you give the same units or people other orders, or send an entry for that season to replace them):");
            foreach (var plan in v.Scheduled) sb.AppendLine($"- turn {plan.Turn}: {string.Join("; ", plan.Orders.Select(o => Planned(o, v)))}");
        }
        if (v.Standing.Count > 0)
        {
            sb.AppendLine("YOUR STANDING ORDERS (each fires once, the season after you see its event; cancel_standing removes them):");
            foreach (var st in v.Standing) sb.AppendLine($"- {StandingLine(st, v)}");
        }
        if (v.CourtLetters.Count > 0)
            sb.AppendLine("LETTERS YOU SENT FROM YOUR AUDIENCES THIS SEASON (they go out with your orders and are checked before them; an order you give now for the same person replaces its letter): "
                          + string.Join("; ", v.CourtLetters.Select(o => o.Describe())) + "." + LettersGold(v.CourtLetters));

        if (v.NamedWake > 0)
            sb.AppendLine($"When you last gave orders you asked to be woken in turn {v.NamedWake}. Each set of orders names that season anew: name it again (wake_in_turn) if you still want it.");

        sb.Append(WhileYouSlept(v));

        sb.AppendLine();
        sb.Append(News(v));
        return sb.ToString();
    }

    /// <summary>
    /// After the letters a king sent from its audiences this season: the gold they carry, which the treasury it reads does not
    /// show as spent until the season's orders are checked (the letters first), or nothing if they carry none.
    /// </summary>
    private static string LettersGold(IEnumerable<Order> letters) =>
        letters.OfType<DispatchOrder>().Sum(d => d.Gold) is > 0 and var gold
            ? $" Gold already committed by these letters: {gold} shekels, not yet taken from the treasury you read here; it is reserved first when the season's orders are checked."
            : "";

    /// <summary>A standing order as its king reads it: its id, the event it waits for, its orders, and whether it fires this season.</summary>
    private static string StandingLine(StandingOrderView st, SeatView v)
    {
        var when = st.When == StandingWhen.UnitAttacked
            ? $"when your {OwnKind(st.Province, v) ?? "unit"} now in {st.Province} is attacked"
            : TurnEngine.EntersText(v.Power, st.Power, st.Province);
        return $"{st.Id}: {when}, then: {string.Join("; ", st.Orders.Select(o => Planned(o, v)))}"
               + (st.FiresNow is { } cause ? $" (it fires this season: {cause} last season)" : "");
    }

    /// <summary>
    /// What a king woken for its audiences only reads of its realm, enough to judge whether the news changes its plan, and
    /// not the full map: its treasury, its land and troops, foreign troops at or inside its borders as far as it can see, its
    /// scheduled and standing orders, and its people at court and away.
    /// </summary>
    public static string RealmBrief(SeatView v)
    {
        var map = WorldMap.Default;
        var sb = new StringBuilder();
        string Kind(UnitKind k) => k == UnitKind.Army ? "army" : "fleet";
        sb.AppendLine("YOUR REALM IN BRIEF (enough to judge whether the news changes your plan; you see the full map only if you reopen your orders):");
        sb.AppendLine($"- Treasury: {v.Gold} shekels by your ledger; income {v.Income}, upkeep {v.Upkeep}, wages {v.Wages} a season; back pay owed to your people {v.BackPay}.");
        var land = v.Owner.Where(x => x.Value == v.Power).Select(x => x.Key).OrderBy(x => x, StringComparer.Ordinal).ToList();
        sb.AppendLine($"- Your land: {(land.Count == 0 ? "none" : string.Join(", ", land))}.");
        var troops = v.Units.Where(u => u.Power == v.Power).Select(u => $"{Kind(u.Kind)} in {u.Province}").ToList();
        sb.AppendLine($"- Your troops: {(troops.Count == 0 ? "none" : string.Join(", ", troops))}.");
        var own = land.ToHashSet();
        var foreign = new List<string>();
        foreach (var u in v.Units.Where(u => u.Power != v.Power).OrderBy(u => u.Province, StringComparer.Ordinal))
        {
            var next = map.Neighbors(u.Province).Where(own.Contains).OrderBy(x => x, StringComparer.Ordinal).ToList();
            if (own.Contains(u.Province)) foreign.Add($"{u.Power} {Kind(u.Kind)} in {u.Province} (in your land)");
            else if (next.Count > 0) foreign.Add($"{u.Power} {Kind(u.Kind)} in {u.Province} (next to your {string.Join(", ", next)})");
        }
        sb.AppendLine($"- Foreign troops at or inside your borders, as far as you can see: {(foreign.Count == 0 ? "none" : string.Join("; ", foreign))}.");
        if (v.Scheduled.Count == 0) sb.AppendLine("- Your scheduled orders: none; your units hold where they stand.");
        else
        {
            sb.AppendLine("- Your scheduled orders (each follows its unit, named here by where it stands now):");
            foreach (var plan in v.Scheduled) sb.AppendLine($"  turn {plan.Turn}: {string.Join("; ", plan.Orders.Select(o => Planned(o, v)))}");
        }
        if (v.Standing.Count == 0) sb.AppendLine("- Your standing orders: none.");
        else
        {
            sb.AppendLine("- Your standing orders:");
            foreach (var st in v.Standing) sb.AppendLine($"  {StandingLine(st, v)}");
        }
        var ready = v.Court.Where(c => c.Ready).Select(c => $"{c.Id} {c.Name}").ToList();
        sb.AppendLine($"- Your people at court and ready to be sent: {(ready.Count == 0 ? "nobody" : string.Join("; ", ready))}.");
        var away = v.Court.Where(c => !c.Ready).Select(c => $"{c.Id} {c.Name} ({c.Duty}{(c.Timing.Length > 0 ? "; " + c.Timing : "")})").ToList();
        if (away.Count > 0) sb.AppendLine($"- Your other people: {string.Join("; ", away)}.");
        return sb.ToString();
    }

    /// <summary>The kind of the king's own unit standing in a province ("army" or "fleet"), or null if none.</summary>
    private static string? OwnKind(string province, SeatView v) =>
        v.Units.FirstOrDefault(u => u.Power == v.Power && u.Province == province) is { } u ? u.Kind == UnitKind.Army ? "army" : "fleet" : null;

    /// <summary>An order kept for later, as the king reads it: each of its own units named by where it stands now ("the army now in memphis").</summary>
    public static string Planned(Order o, SeatView v)
    {
        string Now(string province) => OwnKind(province, v) is { } kind ? $"the {kind} now in {province}" : province;
        return (o switch
        {
            HoldOrder h => h with { Unit = Now(h.Unit) },
            MoveOrder m => m with { Unit = Now(m.Unit) },
            SupportOrder s => s with { Unit = Now(s.Unit), Supported = Now(s.Supported) },
            ConvoyOrder c => c with { Unit = Now(c.Unit), Army = Now(c.Army) },
            DisbandOrder d => d with { Unit = Now(d.Unit) },
            GiftUnitOrder g => g with { Unit = Now(g.Unit) },
            _ => o,
        }).Describe();
    }

    /// <summary>
    /// What happened while the king slept, read when it wakes, before its orders and at its audiences alike: first in
    /// brief, then the news of those seasons in full. Empty when nothing waits.
    /// </summary>
    public static string WhileYouSlept(SeatView v)
    {
        if (v.WhileAsleep.Count == 0 && v.Digest.Count == 0) return "";
        var sb = new StringBuilder();
        sb.AppendLine();
        sb.AppendLine($"WHILE YOU SLEPT ({(v.LastCalled > 0 ? $"since you gave orders in turn {v.LastCalled}" : "since the game began")}):");
        if (v.Digest.Count > 0)
        {
            sb.AppendLine($"In brief{(v.DigestLeftOut > 0 ? $" ({v.DigestLeftOut} earlier lines left out)" : "")}:");
            foreach (var d in v.Digest) sb.AppendLine($"- {d}");
        }
        if (v.WhileAsleep.Count > 0)
        {
            sb.AppendLine($"The news of those seasons, oldest first (routine treasury notices left out{(v.WhileAsleepLeftOut > 0 ? $"; {v.WhileAsleepLeftOut} earlier items left out" : "")}):");
            foreach (var i in v.WhileAsleep) sb.AppendLine($"[turn {i.Turn}] [{i.Kind}] {i.Title}: {i.Body}");
        }
        return sb.ToString();
    }

    /// <summary>The season's news as the court has it: everything delivered to it this season, oldest first.</summary>
    public static string News(SeatView v)
    {
        var sb = new StringBuilder();
        sb.AppendLine("NEWS THIS SEASON:");
        if (v.Inbox.Count == 0) sb.AppendLine("- nothing");
        foreach (var i in v.Inbox) sb.AppendLine($"[{i.Kind}] {i.Title}: {i.Body}");
        return sb.ToString();
    }

    /// <summary>
    /// What a host has before it as it holds court: its own land and troops in brief (with its orders standing, its realm in
    /// brief: <see cref="RealmBrief"/>), what happened while it slept (an envoy at its door is what most often wakes it), and
    /// the season's news.
    /// </summary>
    public static string CourtBrief(SeatView v, bool ordersStand = false)
    {
        var sb = new StringBuilder();
        if (ordersStand) sb.Append(RealmBrief(v));
        else
        {
            var land = v.Owner.Where(x => x.Value == v.Power).Select(x => x.Key).OrderBy(x => x, StringComparer.Ordinal).ToList();
            var troops = v.Units.Where(u => u.Power == v.Power).Select(u => $"{(u.Kind == UnitKind.Army ? "army" : "fleet")} in {u.Province}").ToList();
            sb.AppendLine($"YOUR LAND: {(land.Count == 0 ? "none" : string.Join(", ", land))}. YOUR TROOPS: {(troops.Count == 0 ? "none" : string.Join(", ", troops))}.");
        }
        if (WhileYouSlept(v) is { Length: > 0 } slept)
        {
            sb.Append(slept);
            sb.AppendLine();
        }
        sb.Append(News(v));
        return sb.ToString();
    }

    /// <summary>
    /// Every power's growth as the court can estimate it from who holds what (the land it holds now against its
    /// homeland's yield), in one line; fallen kingdoms are named at the end.
    /// </summary>
    public static string Standings(SeatView v)
    {
        var all = Views.LandStandings(v.Owner, v.Fallen);
        var living = all.Where(x => !x.Fallen).Select(x =>
            $"{x.Power}{(x.Power == v.Power ? " (you)" : "")} {x.Growth.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture)} (land yield {x.Yield}, at the start {x.StartYield})");
        var fallen = all.Where(x => x.Fallen).Select(x => x.Power.ToString()).ToList();
        return $"STANDINGS (an estimate from who holds what; treasuries are left out): {string.Join("; ", living)}."
               + (fallen.Count > 0 ? $" Fallen: {string.Join(", ", fallen)}." : "");
    }

    public static string Person(CharacterView c)
    {
        var parts = new List<string> { $"{c.Id} {c.Name} of {c.Origin}" };
        if (c.Ours)
        {
            parts.Add(c.Ready ? "at court, ready for a mission" : c.Duty);
            if (c.Timing.Length > 0) parts.Add(c.Timing);
        }
        else
        {
            parts.Add(c.Status == "your captive" ? "your captive (a caught spy)" : c.Status);
            if (c.Employer is { } e) parts.Add($"serves {e}");
            if (c.HeldByYou) parts.Add("held at your court against their will");
            if (c.Where.Length > 0) parts.Add(c.Where);
        }
        if (c.Term.Length > 0) parts.Add(c.Term);
        if (c.BackPay is int owed) parts.Add($"owed: {owed} shekels of back pay");
        if (c.KnownFacts.Count > 0) parts.Add("known: " + string.Join(" ", c.KnownFacts));
        if (c.Pitch is not null) parts.Add($"pitch: \"{c.Pitch}\"");
        if (c.AskingPrice is int a) parts.Add($"asks {a} a season");
        return string.Join("; ", parts);
    }

    public static string Audience(AudienceView a)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"AN AUDIENCE (round {a.Round} of at most {a.MaxRounds}). {a.Envoy.Name} ({a.Envoy.Id}), envoy of {a.From}, stands before you.");
        if (a.Envoy.KnownFacts.Count > 0) sb.AppendLine($"What you know of {a.Envoy.Name}: {string.Join(" ", a.Envoy.KnownFacts)}");
        sb.AppendLine(a.Greeting.Length > 0 ? $"The sealed greeting reads: \"{a.Greeting}\"" : "The tablet bears no greeting at all.");
        if (a.GreetingDeviations.Count > 0) sb.AppendLine($"It departs from the custom: {string.Join("; ", a.GreetingDeviations)}.");
        sb.AppendLine($"{a.Envoy.Name} says: \"{a.Spoken}\"");
        foreach (var x in a.SoFar)
        {
            sb.AppendLine($"You answered: \"{x.Host}\"");
            sb.AppendLine($"{a.Envoy.Name} replied: \"{x.Envoy}\"");
        }
        if (a.GoldStated > 0)
            sb.AppendLine($"The inventory on the tablet lists {a.GoldStated} shekels of gold; your weighers found {a.GoldWeighed}. Its purity is unknown until you pay for an assay.");
        if (a.Proposal is not null)
            sb.AppendLine($"The envoy brings a tablet for you to seal, already sealed by {string.Join(", ", a.Proposal.Seals)}{(a.Proposal.AllianceOath ? " as a sworn alliance" : "")}: \"{a.Proposal.Text}\"");
        foreach (var t in a.CopiesShown)
            sb.AppendLine($"The envoy shows you a tablet as evidence, bearing the seals of {string.Join(", ", t.Seals)}{(t.SealedTurn is int st ? $", dated turn {st}" : "")}: \"{t.Text}\"");
        if (a.SecretMandate is not null)
            sb.AppendLine($"This envoy secretly serves you. Their real instructions were: \"{a.SecretLetter}\" Mandate: \"{a.SecretMandate}\".");
        if (a.GoldBackNamed > 0)
            sb.AppendLine($"You have already named {a.GoldBackNamed} shekels to send home with the envoy; a new amount replaces it, 0 keeps it.");
        if (a.GiftAccepted > 0)
            sb.AppendLine($"{a.Envoy.Name} has already accepted your gift of {a.GiftAccepted} shekels. An envoy takes one gift per audience: another gift would not be given.");
        if (a.OrdersStand)
        {
            sb.AppendLine("YOUR ORDERS STAND WHILE YOU SLEEP. At this audience you may also send envoys of yours who are at court and ready, with letters, tablets and gifts (letters, as in your orders): they set out at the end of this season with everyone's orders and are checked first. "
                          + "Reopen your orders (reopen_orders) if the news changes your plan: you then give orders this season, with your full view, after your audiences. Otherwise your orders stand and you sleep on.");
            if (a.LettersSent.Count > 0)
                sb.AppendLine($"Letters you have already sent from your audiences this season (a new letter for the same person replaces one): {string.Join("; ", a.LettersSent.Select(o => o.Describe()))}.{LettersGold(a.LettersSent)}");
            if (a.ReopenChosen)
                sb.AppendLine("You have already chosen to reopen your orders this season: you give orders after your audiences.");
        }
        sb.AppendLine(a.Round < a.MaxRounds
            ? "Answer the envoy. You may end the audience now, or leave it open for one more exchange."
            : "This is the last exchange of the audience.");
        return sb.ToString();
    }
}
