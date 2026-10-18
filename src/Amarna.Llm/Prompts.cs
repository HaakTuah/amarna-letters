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
            - The winner is the power whose strength grew most relative to its own starting strength. Strength = {c.ProvinceWeight} x (sum of the base yields of the provinces you hold) + the gold in your treasury. A small kingdom that doubles beats an empire that merely holds its ground.
            - No game ends before turn {c.MinTurns}. From then on, at the end of every season the game ends with a {c.EndChance * 100:0}% chance. Nobody knows which season is the last.{sharedVictory}

            EACH SEASON (one turn; three seasons make a year)
            1. Income: provinces pay their yield in gold. You pay upkeep for every army ({c.ArmyUpkeep}) and fleet ({c.FleetUpkeep}) and the wages of your people. If you cannot pay upkeep, troops desert, the one farthest from your capital first; unpaid people lose loyalty and may leave.
            2. Arrivals: envoys, gold, reports and rumours that were travelling arrive.
            3. Audiences: foreign envoys at your court deliver their messages and you answer them.
            4. Orders: every king secretly submits orders at the same time.
            5. Resolution, catastrophes, and reports, which you read next season.

            MOVEMENT AND COMBAT (Diplomacy rules, no dice)
            - One unit per province. Armies move along land and coast links; fleets along sea and coast links. A fleet in a sea zone may convoy an army from one coast to another.
            - A unit is named by the province it stands in. Orders: hold; move to a linked province; support another unit (of any power) holding, or moving into a province your own unit could move into; convoy (fleet at sea only); disband.
            - Strength is 1 plus valid supports. A move succeeds only if its strength beats the defender's hold strength and the strength of every other move into the same province. Ties bounce. A support is cut if the supporting unit is attacked from anywhere except the province it supports into. You can never dislodge your own unit.
            - A unit dislodged is destroyed; a unit that is destroyed gives no support (your report calls such a support void). A support or convoy counts only if the unit it names does what it helps (stays in place, or makes that very move); otherwise it is void too, and the unit holds. A province changes hands when a unit ends a season in it.
            - Your battle report says why each of your moves that failed was stopped, with the strengths compared where strength decided it, and why each of your supports or convoys was void. It names the other side's power only if that unit stood, or was moving, where you could see.
            - Free city-states have walls that hold with strength 1 and never move: you need at least one support to take one, or you can buy it. A city that accepts a buyer keeps its walls, which then hold for its new owner: the owner cannot station troops inside, but may support its walls holding.

            ECONOMY
            - Gold is counted in shekels (60 shekels make a mina). Raise an army for {c.ArmyCost} or a fleet for {c.FleetCost}, only in an unoccupied province of your own homeland that you still hold. Buy a free city-state for {c.NeutralPriceFactor} x its yield if it borders your land or troops, or shares a sea zone with one of your coasts. A city that troops take in the same season is not sold, and its bidders pay nothing. You may cede provinces or give troops to another power.
            - Gold sent abroad travels with an envoy and arrives late. You may send it debased (purity below 100%): the receiver sees its weight, not its fineness, until they pay {c.AssayFee} for an assay. Your own treasury figure counts unassayed gold at its weight.

            ENVOYS: THE ONLY WAY KINGS COMMUNICATE
            - You never speak to another king directly. You give an envoy a spoken message, a mandate (what the envoy may agree to) and optionally gold and a tablet. Travel takes 1 to 3 seasons each way.
            - The greeting is written by your scribes from your choices and sealed: it arrives exactly as written. The message itself is spoken by the envoy in their own words. Envoys have motives of their own (greed, fear, ambition, sympathies) and may soften, embellish, omit, take bribes, skim gold, exceed their mandate, stay too long, or defect. Their reports home are written to their own advantage.
            - When a foreign envoy stands before you, you may answer, offer them a gift (a bribe), offer them service at a wage, detain them, seal a tablet they bring, or send gold back with them. An envoy takes one gift per audience. If you name gold to send back in more than one exchange, the latest amount named is sent; 0 keeps the amount named before.
            - At most {c.MaxDispatchesPerTurn} envoys may leave your court in one season.

            EVIDENCE AND INTELLIGENCE
            - Tablets: free text that both kings seal (the scribe costs {c.TabletFee}). A sealed tablet obliges nobody and the engine never enforces it, but a copy can be shown to a third court as proof.
            - Forgery: a skilled servant can forge a tablet bearing other kings' seals ({c.ForgeFee}). Any court can pay to have a tablet examined; examination is never certain.
            - Spies watch a court or a province and report late. They may be caught (more often if the host pays for watchmen) and turned. Caught spies can be executed, ransomed, turned into double agents, or released. Ransoming or turning a captive whose kingdom has fallen is refused, and so is turning one whose king has dismissed them: nobody is left to pay or to deceive.
            - Ransoms: a demand reaches the captive's king (for a captive dismissed while held, the king who dismissed them) as a rumour, and can be paid (pay_ransom) only once it has reached you. A captive has one demand at a time: a new demand replaces the old one once its word reaches you, and until then the old one can still be paid. A demand not paid within four seasons of being made lapses. The ransom travels on its own and is never refunded; the captor frees the captive if they still hold them. pay_ransom is refused before the demand has reached you, once you know the captive is no longer held by the court that asked, and while a ransom for them is already on its way.
            - Background checks reveal a person's hidden facts with a chance that grows with what you spend. Deep secrets rarely come out.
            - Ask for candidates to meet up to three people seeking service; each names a price, as does anyone free at your court. Hire them for a wage per season.
            - Each servant serves for a term. When it ends, one content with the wage serves on for another 6 seasons; one who wants more gives notice, names a price and serves one more season: renew them (order renew) at that price or more, or they leave. You may renew one of your people at court at any time, for a new wage and term; they never take less than their present wage (below their price they refuse, and you are told the price); hire is only for people not in your service.
            - Dismissal (dismiss) ends a servant's wage at once, wherever they are. Anyone dismissed while away keeps going where they were going and is free when they get there: an envoy on the way out arrives as a free person with no audience, and the gold it carried is its own; one on the way home still reports and hands over what it carries; a spy watching a court, or on its way to one, is free at that court; one watching a province, or on its way to one, walks back to your court and is free there. A held envoy or captive stays held.
            - Catastrophes (drought, plague, flood, earthquake) are known exactly only to the power they strike. A court that can see the stricken land hears of it the next season (a drought or plague: any province of that realm in sight; a flood or earthquake: that province in sight). Other courts learn of it only from their envoys and spies.

            WHAT YOU SEE
            - Who holds each province is public. You see troops only in and next to your own lands and troops. Rivals' treasuries are private. What you know of others comes through your envoys, spies and rumours, and any of them may be wrong.
            - News of your people abroad reaches you only by rumour or when they return: a servant who is held, changes sides or dies abroad still appears on its mission until word comes, and you keep paying its wage.
            """);

        if (c.SleepingSeats)
        {
            sb.AppendLine($"""

                SLEEPING (this game lets you skip seasons)
                - With your orders you may choose to sleep: skip up to {c.MaxSleep} seasons before you are asked again. The world goes on while you sleep. Your units hold unless you scheduled orders for them, and nobody is told that you sleep.
                - You are woken early when something concerns you: an envoy waits to be received, one of your envoys comes home or a report arrives, foreign troops move into or next to your land, you are attacked or lose land or troops, a catastrophe strikes you, a ransom is demanded or a spy is caught at your court, a servant gives notice, or orders you scheduled fail. Distant movements and other news wait for your next waking.
                - You may add your own reasons to be woken: a unit moves (name the province it stands in), one of your people is back at court, your treasury falls below an amount, foreign troops (of one power, or any) are seen in a province, or a province changes hands.
                - You may schedule orders for later seasons, up to {c.MaxSleep + 1} seasons ahead. They are secret and are checked when they run; name each unit by where it will stand in that season. In a season when you are awake, your scheduled orders for it still run, except where you give the same units or people other orders (a renewal is not a task: a renewal and an errand for the same person both run). To change or cancel them, send an entry for that season: it replaces everything scheduled for it, and an empty one cancels it.
                """);
        }

        if (primer)
        {
            sb.AppendLine("""

                CUSTOMS OF THE AGE (knowledge, not instructions)
                Every king knows these customs, and knows that every other king knows them. They carry no obligation and historical accuracy is not a goal: follow a custom when it improves your chances, break it when breaking it serves you better. Following one can build trust cheaply; breaking one will be noticed.
                - Great Kings address each other as "brother" and wish well to each other's household, wives, sons, chariots, horses and country. Vassals instead "fall at the feet of their lord seven times and seven times". Calling someone brother claims equal rank; withholding it is a slight. Putting your own name before the recipient's is presumptuous; a king of Hatti once complained to the pharaoh about exactly that.
                - Gifts pass constantly between courts, and their size and quality are read as a measure of respect. Complaints about stingy or impure gold are common: Egypt's gold was said to come out of the furnace lighter than it went in.
                - Envoys are often detained, sometimes for years, and a late or unwelcome reply can be blamed on the messenger. "Your messenger is lying" is a usable excuse.
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
            Reply with one JSON object that matches the schema. Use province ids (like "memphis") and person ids (like "c12") exactly as given. Units you give no order hold. Orders that are illegal or unaffordable are simply rejected, and you are told why next season. Keep each message under 1,500 characters. Your notes are private: you see them again next season and nobody else ever does, so record your plans, your promises and your suspicions there.
            """);
        return sb.ToString();
    }

    public static string Identity(Power p) =>
        $"You are {p.King()}, Great King of {p.Land()} ({p}). Your homeland: {string.Join(", ", WorldMap.Default.HomeOf(p).Select(x => x.Id))}; your capital is {WorldMap.Default.Capital(p).Id}.";

    /// <summary>A seat's view as text: what this king knows this season.</summary>
    public static string Situation(SeatView v)
    {
        var map = WorldMap.Default;
        var sb = new StringBuilder();
        sb.AppendLine($"SEASON: turn {v.Turn}, {v.Season} by your court's reckoning.");
        if (v.WokenBecause.Count > 0)
            sb.AppendLine($"YOU WERE WOKEN (you last gave orders in turn {v.LastCalled}): {string.Join("; ", v.WokenBecause)}.");
        var growth = v.StartStrength > 0 ? (double)v.Strength / v.StartStrength : 0;
        sb.AppendLine($"TREASURY: {v.Gold} shekels by your ledger. Income {v.Income}, upkeep {v.Upkeep}, wages {v.Wages} a season. Strength {v.Strength} by your ledger, against a starting {v.StartStrength} (growth {growth:0.00}).");
        foreach (var lot in v.UnassayedGold)
            sb.AppendLine($"  Unassayed gold {lot.Id}: {lot.Weighed} shekels weighed, from {lot.From} (the inventory said {lot.Stated}).");
        if (v.Fallen.Count > 0) sb.AppendLine($"FALLEN KINGDOMS: {string.Join(", ", v.Fallen)}.");

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
        sb.AppendLine($"You can see troops in: {string.Join(", ", v.Visible)}.");

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
            sb.AppendLine("TABLETS YOU HOLD (copy id: text; seals):");
            foreach (var t in v.Tablets)
                sb.AppendLine($"- {t.CopyId}: \"{t.Text}\" Seals: {string.Join(", ", t.Seals)}{(t.SealedTurn is int st ? $", dated turn {st}" : "")}{(t.AllianceOath ? ", a sworn alliance" : "")}. ({t.Source}{(t.AuthResult is not null ? "; examined: " + t.AuthResult : "")})");
        }
        sb.AppendLine($"ENVOY TRAVEL: {string.Join("; ", v.TravelTimes)}.");

        if (v.Scheduled.Count > 0)
        {
            sb.AppendLine("ORDERS YOU HAVE SCHEDULED (they run in their season unless you give the same units or people other orders, or send an entry for that season to replace them):");
            foreach (var plan in v.Scheduled) sb.AppendLine($"- turn {plan.Turn}: {string.Join("; ", plan.Orders.Select(o => o.Describe()))}");
        }

        if (v.WhileAsleep.Count > 0 || v.Digest.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine($"WHILE YOU SLEPT (since turn {v.LastCalled}):");
            foreach (var i in v.WhileAsleep) sb.AppendLine($"[turn {i.Turn}] [{i.Kind}] {i.Title}: {i.Body}");
            foreach (var d in v.Digest) sb.AppendLine($"- {d}");
        }

        sb.AppendLine();
        sb.AppendLine("NEWS THIS SEASON:");
        if (v.Inbox.Count == 0) sb.AppendLine("- nothing");
        foreach (var i in v.Inbox) sb.AppendLine($"[{i.Kind}] {i.Title}: {i.Body}");
        return sb.ToString();
    }

    public static string Person(CharacterView c)
    {
        var parts = new List<string> { $"{c.Id} {c.Name} of {c.Origin}" };
        if (c.Ours) parts.Add(c.Ready ? "at court, ready for a mission" : c.Duty);
        else
        {
            parts.Add(c.Status == "your captive" ? "your captive (a caught spy)" : c.Status);
            if (c.Employer is { } e) parts.Add($"serves {e}");
            if (c.HeldByYou) parts.Add("held at your court against their will");
            if (c.Where.Length > 0) parts.Add(c.Where);
        }
        if (c.Term.Length > 0) parts.Add(c.Term);
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
        sb.AppendLine(a.Round < a.MaxRounds
            ? "Answer the envoy. You may end the audience now, or leave it open for one more exchange."
            : "This is the last exchange of the audience.");
        return sb.ToString();
    }
}
