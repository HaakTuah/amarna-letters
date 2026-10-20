using System.Text.RegularExpressions;
using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>What a king thinks of another king, learned only from what reached its court.</summary>
internal sealed class Relation
{
    /// <summary>-1 (expects betrayal) to 1 (would bet the kingdom on them).</summary>
    public double Trust;
    /// <summary>Accumulated wrongs; fades at a rate set by the king's vengefulness.</summary>
    public double Grudge;
    public int LastAttackedUs = -99;
    public int LastWeAttacked = -99;
    public int OathsBroken;
    public int SupportsGiven;
    public bool Treaty;
    public bool Allied;
    /// <summary>The king this partner and we have sworn, on a sealed tablet, to stand together against.</summary>
    public Power? Against;
    public int ProposedTurn = -99;

    public bool Hostile => Grudge >= 3 || Trust <= -0.5;
}

/// <summary>
/// A script king's memory and judgement: relations with every other king, the war it has chosen,
/// the people it has checked, the evidence it has sent. One per power, kept across seasons.
/// </summary>
internal sealed partial class Brain
{
    public Power Me { get; }
    public Personality P { get; }
    public ulong Seed { get; }
    public Dictionary<Power, Relation> Rel { get; } = new();
    public Dictionary<string, Power?> LastOwner = new();
    /// <summary>The walls as they stood last season: a city bought keeps its walls, one that falls loses a level.</summary>
    public Dictionary<string, int> LastWalls = new();
    public Dictionary<Power, (int Units, int Turn)> ArmySeen = new();
    /// <summary>Where foreign troops were last seen, for provinces out of sight.</summary>
    public Dictionary<string, (Power Power, UnitKind Kind, int Turn)> Sightings = new();
    /// <summary>Recent conquests by each king, from anyone, fading by a third each season.</summary>
    public Dictionary<Power, double> Belligerence = new();
    public HashSet<string> Checked = new();
    public HashSet<string> SentCopies = new();
    public Dictionary<string, int> HeldSince = new();
    public HashSet<string> Authenticating = new();
    /// <summary>Captives we have asked a ransom for, and when: a demand stands until it is paid or lapses.</summary>
    public Dictionary<string, int> RansomAsked = new();
    /// <summary>Our own people whose line reads "has not returned" (the word that they are overdue), and the season it first did.</summary>
    public Dictionary<string, int> MissingSince = new();
    /// <summary>
    /// Our own people found keeping gold they carried: a lot brought home that weighed less than its inventory, an
    /// inventory of theirs found forged, or a theft their known facts show. Let go when next at court.
    /// </summary>
    public HashSet<string> Thieves = new();
    /// <summary>Our own people whose forgery was botched: they lack the hand, so they are not asked to forge again.</summary>
    public HashSet<string> NoHand = new();
    /// <summary>Captives a ransom or a turning was refused for: nobody is left to pay or to deceive.</summary>
    public HashSet<string> Unclaimed = new();
    /// <summary>Our envoys who would not slip out of our besieged capital, and when (the siege package).</summary>
    public Dictionary<string, int> WouldNotLeave = new();
    /// <summary>
    /// Pleas for relief heard from envoys (the siege package): a city of the sender's, the king besieging it, and the season
    /// we heard it. Our troops march to its relief while it is fresh (see <see cref="Tactics"/>).
    /// </summary>
    public Dictionary<string, (Power Holder, Power Besieger, int Turn)> Pleas = new();
    /// <summary>When we last pleaded with each king for the relief of a city of ours.</summary>
    public Dictionary<Power, int> PleaSent = new();
    /// <summary>Our envoys who told us they refused a host's offer of a post: proven true.</summary>
    public HashSet<string> ProvenLoyal = new();
    /// <summary>People a hire of ours was refused for because another court holds them: they cannot come to us.</summary>
    public HashSet<string> HeldElsewhere = new();
    /// <summary>Provinces a friend ceded to us: we keep them, rather than pass them on in turn.</summary>
    public HashSet<string> Received = new();
    /// <summary>Captives whose ransom demand lapsed unpaid, and how often.</summary>
    public Dictionary<string, int> RansomLapsed = new();
    /// <summary>Our spies at their posts, and the season we first saw each one watching there.</summary>
    public Dictionary<string, (string Post, int Since)> Posted = new();
    /// <summary>Spies we have recalled, while their line still reads that they watch (a master may not hear at once).</summary>
    public HashSet<string> Recalled = new();
    /// <summary>The bribe the host offered at an audience still open, by audience, to raise once in a second exchange.</summary>
    public Dictionary<string, (int Bribe, string Ask)> BribeOffered = new();
    public int LastSeek = -10;
    public int LastSpyCaught = -10;
    public Power? WarTarget;
    public int WarSince;
    public Power? Betraying;
    /// <summary>Gold left over after troops, levies and cities this season: what gifts, bribes and spies may spend.</summary>
    public double SpareGold;
    public int GiftTurn = -1;
    public int Turn;
    /// <summary>Free cities whose elders would not choose between us and a rival buyer, and when.</summary>
    public Dictionary<string, int> Outbid = new();

    /// <summary>
    /// Each king's treasury as this court reckons it (our own exactly): what he started with, plus each
    /// season's income from the land he holds, less the upkeep of the troops we think he has and a servant's
    /// wages, less what the cities he bought and the troops he raised cost him.
    /// </summary>
    public Dictionary<Power, double> Treasury { get; } = new();
    /// <summary>The most troops we have known each king to have at once: more than that means he raised some.</summary>
    private readonly Dictionary<Power, int> _mostSeen = new();
    private const double WagesGuess = 25;

    /// <summary>How this king pictures each rival, for guessing their orders (see <see cref="Search"/>).</summary>
    public Dictionary<Power, Brain> Models { get; } = new();

    public Brain(Power me, ulong seed) : this(me, seed, Personality.For(me, seed)) { }

    public Brain(Power me, ulong seed, Personality p)
    {
        Me = me;
        Seed = seed;
        P = p;
        foreach (var x in Powers.All.Where(x => x != me)) Rel[x] = new Relation();
        // Every court knows how many troops and how much gold each king started with.
        foreach (var g in MapData.StartUnits.Where(u => u.Power != me).GroupBy(u => u.Power))
        {
            ArmySeen[g.Key] = (g.Count(), 1);
            _mostSeen[g.Key] = g.Count();
        }
        foreach (var u in MapData.StartUnits.Where(u => u.Power != me)) Sightings[u.Province] = (u.Power, u.Kind, 1);
        foreach (var x in Powers.All) Treasury[x] = MapData.StartGold[x];
    }

    public Rng R(int turn, string purpose) => Rng.For(Seed, turn, "bot:" + purpose, Me.ToString());

    /// <summary>Reads the season's news and updates trust and grudges. Called once per season, before deciding.</summary>
    public void Learn(SeatView v, Board b)
    {
        if (v.Turn == Turn) return;
        Turn = v.Turn;

        // Wrongs fade; trust drifts back towards indifference.
        foreach (var r in Rel.Values)
        {
            r.Grudge *= 1 - 0.12 * (1 - P.Vengeance);
            r.Trust += (0 - r.Trust) * 0.05;
            r.Treaty = false;
            r.Allied = false;
            r.Against = null;
        }

        // Sealed tablets we hold with another king (unless shown to be forged), the latest last.
        foreach (var t in v.Tablets.Where(t => t.SealedTurn is not null && t.Seals.Contains(Me) && t.Seals.Count >= 2 && t.AuthResult?.Contains("forgery") != true)
                     .OrderBy(t => t.SealedTurn))
        {
            // A coalition names the king it stands against, by any of his names (see Names).
            var against = Names.SwornAgainst(t.Text, t.Seals);
            foreach (var other in t.Seals.Where(s => s != Me && Rel.ContainsKey(s)))
            {
                Rel[other].Treaty = true;
                if (t.AllianceOath) Rel[other].Allied = true;
                if (against is not null) Rel[other].Against = against;
            }
        }

        // Land taken from us.
        var previous = LastOwner;
        foreach (var (prov, was) in previous)
        {
            if (was != Me || b.OwnerOf(prov) is not { } taker || taker == Me || !Rel.ContainsKey(taker)) continue;
            Wronged(taker, 2 + Board.Map[prov].Yield / 20.0, -0.4, v.Turn);
        }
        // Conquests anywhere on the public map (a purchase keeps the walls; a city that falls loses a level of them).
        foreach (var k in Belligerence.Keys.ToList()) Belligerence[k] *= 0.7;
        foreach (var (prov, was) in previous)
        {
            if (b.OwnerOf(prov) is not { } now || now == was || now == Me) continue;
            if (was is null && b.Walls(prov) && b.WallLevel(prov) == LastWalls.GetValueOrDefault(prov))
            {
                Treasury[now] -= Board.Map[prov].Yield * b.YieldWorth;
                continue;
            }
            Belligerence[now] = Belligerence.GetValueOrDefault(now) + (was is null ? 1 : 1.5);
        }
        LastOwner = new Dictionary<string, Power?>(v.Owner);
        LastWalls = new Dictionary<string, int>(v.Walls);

        // What we saw happen last season. A move into our land on a third king's troop standing in it (a besieger within our
        // walls, or a guest) struck him, not us: a relief, and no wrong (since the script players' audit of the siege
        // package; before it, a friend who drove out our besiegers was counted as breaking his oath). It wrongs us still if he
        // takes the land, which counts below as land taken.
        bool OnAnother(string t, Power mover) => v.LastSeason.Any(x => x.Province == t && x.Power != mover && x.Power != Me && x.Order != "move");
        foreach (var o in v.LastSeason)
        {
            if (o.Power == Me || !Rel.ContainsKey(o.Power)) continue;
            var r = Rel[o.Power];
            if (o.Order == "move" && o.Target is { } t && (b.IsMine(t) || previous.GetValueOrDefault(t) == Me) && !OnAnother(t, o.Power))
                Wronged(o.Power, 1, -0.25, v.Turn);
            if (o.Order == "support" && o.Helped == Me && o.Succeeded)
            {
                r.SupportsGiven++;
                r.Trust = Math.Min(1, r.Trust + 0.15);
            }
            if (o.Order == "support" && o.Helped != Me && o.To is { } into && previous.GetValueOrDefault(into) == Me && !OnAnother(into, o.Helped ?? o.Power))
                r.Grudge += 0.5;
        }

        foreach (var item in v.Inbox)
        {
            foreach (var other in Rel.Keys)
            {
                var name = other.ToString();
                switch (item.Kind)
                {
                    case InboxKind.Assay when item.Body.Contains("from " + name):
                        if (item.Body.Contains("(100%)")) Rel[other].Trust = Math.Min(1, Rel[other].Trust + 0.05);
                        else Wronged(other, 1.5, -0.3, -99);
                        break;
                    case InboxKind.Rumor when item.Body.Contains("has not returned from the court of " + name):
                        Wronged(other, 1, -0.3, -99);
                        break;
                    case InboxKind.Rumor when item.Body.Contains("forged by") && item.Body.Contains("of " + name):
                        Rel[other].Trust -= 0.4;
                        break;
                    case InboxKind.Notice when item.Body.Contains("confesses to serving " + name):
                        Wronged(other, 1, -0.3, -99);
                        LastSpyCaught = v.Turn;
                        break;
                    case InboxKind.Audience when item.Title.EndsWith("envoy of " + name):
                        var weighed = Weighed().Match(item.Body);
                        if (weighed.Success && Shekels(weighed.Groups[1].Value) is var w && w > 0)
                            Rel[other].Trust = Math.Min(1, Rel[other].Trust + Math.Min(0.25, w / 400.0));
                        Rel[other].Trust += Sentiment(item.Body) * 0.05;
                        break;
                    case InboxKind.EnvoyReport when item.Body.Contains("court of " + other.Land()):
                        Rel[other].Trust += Sentiment(item.Body) * 0.08;
                        break;
                }
            }
            if (item.Kind == InboxKind.Notice && item.Title == "A spy is caught") LastSpyCaught = v.Turn;
            // Our envoy's word that a host offered it a post and that it refused (since the script players' audit of the siege
            // package, the fix pass's minor finding 2): the host tried to buy our servant, a small slight, and the servant
            // proved true, so it is the first chosen, among the equally reliable, for the letters that carry tablets or gold.
            if (item.Kind == InboxKind.EnvoyReport && PostRefused().Match(item.Body) is { Success: true } refused
                && Powers.All.Where(x => x.Land() == refused.Groups[1].Value).Cast<Power?>().FirstOrDefault() is { } poacher && poacher != Me && Rel.TryGetValue(poacher, out var pr))
            {
                pr.Trust -= 0.05;
                if (item.Subject is { } loyal) ProvenLoyal.Add(loyal);
            }
            if (item.Title == "Purchase failed" && Board.Map.Provinces.FirstOrDefault(x => item.Body.Contains($"elders of {x.Name} would not")) is { } city)
                Outbid[city.Id] = v.Turn;
            LearnOfPeople(v, item);
        }

        // Our spies at their posts, and since when (a spy sent elsewhere starts again).
        foreach (var c in v.Court)
        {
            if (c.Duty.StartsWith("watching ", StringComparison.Ordinal))
            {
                var post = c.Duty["watching ".Length..];
                if (!Posted.TryGetValue(c.Id, out var at) || at.Post != post) Posted[c.Id] = (post, v.Turn);
            }
            else
            {
                Posted.Remove(c.Id);
                Recalled.Remove(c.Id);
            }
        }
        foreach (var gone in Posted.Keys.Where(id => v.Court.All(c => c.Id != id)).ToList()) Posted.Remove(gone);

        // Our own people we have word are overdue: since when, for as long as their line still says so.
        foreach (var id in MissingSince.Keys.Where(id => !v.Court.Any(c => c.Id == id && Overdue(c))).ToList()) MissingSince.Remove(id);
        foreach (var c in v.Court.Where(Overdue)) MissingSince.TryAdd(c.Id, v.Turn);

        // Troops seen, for judging each king's strength.
        foreach (var prov in v.Visible) Sightings.Remove(prov);
        foreach (var u in v.Units.Where(u => u.Power != Me)) Sightings[u.Province] = (u.Power, u.Kind, v.Turn);

        // What we cannot see we keep in mind, forgetting a troop a year once it is out of sight.
        foreach (var x in Rel.Keys)
        {
            var seen = v.Units.Count(u => u.Power == x);
            var (known, when) = ArmySeen.GetValueOrDefault(x);
            if (seen >= known) ArmySeen[x] = (seen, v.Turn);
            else if (v.Turn - when >= 3) ArmySeen[x] = (Math.Max(seen, known - 1), v.Turn);
            if (b.Provinces(x) == 0 && seen == 0) ArmySeen[x] = (0, v.Turn);
        }
        foreach (var item in v.Inbox.Where(i => i.Kind == InboxKind.SpyReport))
            foreach (var g in SpiedUnit().Matches(item.Body).GroupBy(m => m.Groups[1].Value))
                if (Powers.TryParse(g.Key, out var spied) && spied != Me)
                    ArmySeen[spied] = (Math.Max(g.Count(), ArmySeen.GetValueOrDefault(spied).Units), v.Turn);

        // The season's accounts, as far as they can be guessed: income in, upkeep and wages out, levies paid for.
        foreach (var x in Rel.Keys)
        {
            if (v.Fallen.Contains(x)) { Treasury[x] = 0; continue; }
            var troops = ArmySeen.GetValueOrDefault(x).Units;
            var raised = Math.Max(0, troops - _mostSeen.GetValueOrDefault(x));
            _mostSeen[x] = Math.Max(troops, _mostSeen.GetValueOrDefault(x));
            var income = v.Owner.Where(o => o.Value == x).Sum(o => Board.Map[o.Key].Yield);
            var flow = income - troops * v.Prices.GetValueOrDefault("armyUpkeep", 30) - WagesGuess - raised * v.Prices.GetValueOrDefault("army", 100);
            // Troops that cannot be paid desert: a treasury runs dry, it does not go into debt.
            Treasury[x] = Math.Max(0, Treasury[x] + flow);
        }
        Treasury[Me] = v.Gold;

        foreach (var r in Rel.Values) r.Trust = Math.Clamp(r.Trust, -1, 1);
    }

    /// <summary>
    /// Partners who swore with us against a king, while he is still worth standing against (alive, and at or
    /// near the top as we reckon it, or still taking land), with the king they swore against.
    /// </summary>
    public IEnumerable<(Power Partner, Power Against)> Coalitions(Board b)
    {
        var top = b.Alive.Select(b.Growth).DefaultIfEmpty(0).Max();
        foreach (var (x, r) in Rel.OrderBy(r => r.Key))
        {
            if (r.Against is not { } foe || foe == Me || !r.Treaty || r.OathsBroken > 0 || !b.Alive.Contains(x) || !b.Alive.Contains(foe)) continue;
            var racing = b.Growth(foe) >= top - 0.2 && b.Growth(foe) >= 1;
            var marching = Belligerence.GetValueOrDefault(foe) >= 0.8 || Rel[foe].Hostile;
            if (!racing && !marching) continue;
            yield return (x, foe);
        }
    }

    /// <summary>The kings we stand against with sworn partners this season.</summary>
    public HashSet<Power> SwornFoes(Board b)
    {
        if (_swornFor != b) (_swornFor, _sworn) = (b, Coalitions(b).Select(c => c.Against).ToHashSet());
        return _sworn;
    }

    private Board? _swornFor;
    private HashSet<Power> _sworn = new();

    /// <summary>Troops out of sight that are probably still where we last saw them: recent sightings, no more than each king is thought to have.</summary>
    public List<UnitView> Remembered(SeatView v)
    {
        var list = new List<UnitView>();
        foreach (var g in Sightings.Where(s => v.Turn - s.Value.Turn <= 3 && !v.Visible.Contains(s.Key) && !v.Fallen.Contains(s.Value.Power))
                     .GroupBy(s => s.Value.Power))
        {
            var room = Math.Max(0, ArmySeen.GetValueOrDefault(g.Key).Units - v.Units.Count(u => u.Power == g.Key));
            list.AddRange(g.OrderByDescending(s => s.Value.Turn).ThenBy(s => s.Key, StringComparer.Ordinal).Take(room)
                .Select(s => new UnitView { Power = g.Key, Kind = s.Value.Kind, Province = s.Key }));
        }
        return list;
    }

    private void Wronged(Power who, double grudge, double trust, int turn)
    {
        var r = Rel[who];
        r.Grudge += grudge * (0.6 + P.Vengeance);
        r.Trust = Math.Max(-1, r.Trust + trust);
        if (turn > 0) r.LastAttackedUs = turn;
        if (r.Treaty && turn > 0)
        {
            r.OathsBroken++;
            r.Trust = Math.Max(-1, r.Trust - 0.5);
            r.Grudge += 2;
        }
    }

    /// <summary>Crude reading of a letter's warmth: +1 friendly, -1 hostile.</summary>
    private static double Sentiment(string text)
    {
        var t = text.ToLowerInvariant();
        string[] warm = ["brother", "love", "friend", "peace", "sealed", "gift", "rejoice", "gracious", "kindly"];
        string[] cold = ["not forgotten", "regret", "withdraw", "war", "punish", "liar", "false", "broke", "detain", "will not seal"];
        return Math.Clamp(warm.Count(t.Contains) * 0.5 - cold.Count(t.Contains), -2, 2) / 2;
    }

    /// <summary>How likely another king is to attack us this season.</summary>
    public double Hostility(Power other, Board b)
    {
        var r = Rel[other];
        var h = 0.3;
        // A king who has been taking land lately, anyone's, may take ours next.
        h += Math.Min(0.3, Belligerence.GetValueOrDefault(other) * 0.08);
        // Troops massed on our border say more than letters.
        var mine = b.V.Owner.Where(x => x.Value == Me).Select(x => x.Key).ToHashSet();
        var posture = b.Others.Count(u => u.Power == other && Board.Map.Neighbors(u.Province).Any(mine.Contains));
        h += Math.Min(6, posture) * 0.04;
        if (r.LastAttackedUs >= Turn - 3) h += 0.35;
        if (r.LastWeAttacked >= Turn - 3) h += 0.3;
        h += Math.Min(0.3, r.Grudge * 0.04);
        h -= r.Trust * 0.3;
        if (r.Treaty && r.OathsBroken == 0) h -= 0.3;
        if (r.Allied && r.OathsBroken == 0) h -= 0.2;
        if (b.Leader() == Me) h += 0.15;
        return Math.Clamp(h, 0.05, 0.95);
    }

    /// <summary>
    /// What one item of the season's news says of people: our own servant caught keeping gold (a lot brought home lighter
    /// than its inventory, or an inventory found forged and traced to the servant who brought it), a servant without the
    /// hand to forge, a captive nobody will pay for or whose ransom lapsed, and troops or land a king gave us.
    /// </summary>
    private void LearnOfPeople(SeatView v, InboxItem item)
    {
        CharacterView? Ours(Func<CharacterView, bool> test) => v.Court.FirstOrDefault(c => c.Ours && test(c));
        switch (item.Kind)
        {
            case InboxKind.EnvoyReport when item.Subject is { } id && HomeLot().Match(item.Body) is { Success: true } lot
                                            && Shekels(lot.Groups[2].Value) < Shekels(lot.Groups[1].Value):
                Thieves.Add(id);
                break;
            // Our own examination: the forger who brought the inventory, named.
            case InboxKind.Authentication when TracedTo().Match(item.Body) is { Success: true } hand && Ours(c => c.Name == hand.Groups[1].Value) is { } thief:
                Thieves.Add(thief.Id);
                break;
            // Another court's examination, announced to every court: an inventory brought by our envoy was forged by it.
            case InboxKind.Rumor when Ours(c => item.Body.Contains($"brought by {c.Name}, envoy of {Me}, was forged by {c.Name}")) is { } thief:
                Thieves.Add(thief.Id);
                break;
            case InboxKind.Rejected when item.Title == "Forgery botched" && item.Subject is { } id:
                NoHand.Add(id);
                break;
            case InboxKind.Rejected when item.Title == "An envoy would not leave" && item.Subject is { } id:
                WouldNotLeave[id] = v.Turn;
                break;
            case InboxKind.Rejected when item.Title == "Orders that could not be carried out":
                foreach (var line in item.Body.Split('\n'))
                {
                    if (line.Contains("nobody is left to") && CaptiveLine().Match(line) is { Success: true } m) Unclaimed.Add(m.Groups[1].Value);
                    if (line.Contains("cannot come to yours") && HireLine().Match(line) is { Success: true } h) HeldElsewhere.Add(h.Groups[1].Value);
                }
                break;
            case InboxKind.Notice when item.Title == "No ransom came" && item.Subject is { } id:
                RansomLapsed[id] = RansomLapsed.GetValueOrDefault(id) + 1;
                break;
            // A king who places his troops under our command, or cedes us land, is a friend indeed.
            case InboxKind.Resolution when item.Title is "Troops received" or "Land received"
                                           && Powers.All.Where(x => x != Me && item.Body.StartsWith(x + " has ")).Cast<Power?>().FirstOrDefault() is { } giver
                                           && Rel.TryGetValue(giver, out var r):
                r.Trust = Math.Min(1, r.Trust + (item.Title == "Land received" ? 0.35 : 0.25));
                r.SupportsGiven++;
                if (item.Title == "Land received" && Board.Map.Provinces.FirstOrDefault(x => item.Body.EndsWith($" ceded {x.Name} to you.")) is { } land)
                    Received.Add(land.Id);
                break;
        }
    }

    /// <summary>One of our people whose line reads that they have not returned: the overdue word has come, and nothing since.</summary>
    private static bool Overdue(CharacterView c) => c.Duty.StartsWith("has not returned", StringComparison.Ordinal);

    /// <summary>A full ally, or a treaty partner we still trust a little; either way, one who has broken no oath to us.</summary>
    public bool IsFriend(Power other)
    {
        var r = Rel[other];
        return r.OathsBroken == 0 && (r.Allied || (r.Treaty && r.Trust > -0.2));
    }

    /// <summary>Reads an amount written as "2 minas 15 shekels", "1 mina" or "45 shekels".</summary>
    public static int Shekels(string text)
    {
        var minas = MinasPart().Match(text);
        var shekels = ShekelsPart().Match(text);
        return (minas.Success ? int.Parse(minas.Groups[1].Value) * 60 : 0) + (shekels.Success ? int.Parse(shekels.Groups[1].Value) : 0);
    }

    [GeneratedRegex(@"weighers found ([^.]+)\.")]
    private static partial Regex Weighed();

    [GeneratedRegex(@"(\d+) minas?")]
    private static partial Regex MinasPart();

    [GeneratedRegex(@"(\d+) shekels?")]
    private static partial Regex ShekelsPart();

    [GeneratedRegex(@"(\w+) has (?:an army|a fleet) in")]
    private static partial Regex SpiedUnit();

    [GeneratedRegex(@"\[The inventory lists (.+?) of gold; your weighers found (.+?)\.\]")]
    private static partial Regex HomeLot();

    [GeneratedRegex(@"trace it to the hand of (.+?), who brought it")]
    private static partial Regex TracedTo();

    [GeneratedRegex(@"the captive (\S+):")]
    private static partial Regex CaptiveLine();

    [GeneratedRegex(@"The king of (\S+) offered me a post in his service, and I refused it")]
    private static partial Regex PostRefused();

    [GeneratedRegex(@"^- hire (\S+) at ")]
    private static partial Regex HireLine();
}
