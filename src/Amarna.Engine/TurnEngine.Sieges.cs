namespace Amarna.Engine;

/// <summary>
/// Walls and sieges (Build order item 5, the siege package; question 5 of <c>docs/rounds/2026-10-18-sleep-and-simulation.md</c>,
/// plan steps 1 to 9). Walls set how long a city holds out, not how many armies a field battle needs: combat resolves as
/// always, and a move that wins its way into a walled province its mover does not hold either storms the walls (its strength
/// beats their level and the defenders it beat together) and takes the province at once, or stands inside and takes nothing.
/// An army standing within walls may then besiege the city: each season it holds there the city is worn down a step, two
/// with an uncut support, and when that reaches the level of the walls the city surrenders and its walls fall a level.
/// </summary>
public sealed partial class TurnEngine
{
    /// <summary>The season's battle as the adjudicator resolved it: its assaults on walls and the supports given.</summary>
    private AdjudicationResult? _battle;

    /// <summary>The unit orders that ran this season, by the province their unit stood in as the season began.</summary>
    private Dictionary<string, Order> _unitOrdersNow = new();

    /// <summary>The notice of the season's sieges: those a court presses, and those of its cities.</summary>
    public const string SiegesTitle = "Sieges";

    /// <summary>The walls of a province fall a level (to none from level 1).</summary>
    private void LowerWalls(string province)
    {
        var level = S.WallsOf(province) - 1;
        if (level > 0) S.Walls[province] = level;
        else S.Walls.Remove(province);
    }

    /// <summary>A unit that is gone lifts any siege it pressed.</summary>
    private void LiftSiegesOf(string unitId) => S.Sieges.RemoveAll(x => x.UnitId == unitId);

    /// <summary>Sieges whose army no longer stands in the city for its king, or whose city its besieger now holds, are over.</summary>
    private void LiftLostSieges() => S.Sieges.RemoveAll(x => !Stands(x));

    /// <summary>Whether a siege still stands: its army is in the city, still its king's, and the city's walls are another's.</summary>
    private bool Stands(Siege x) =>
        S.Units.Any(u => u.Id == x.UnitId && u.Power == x.Power && u.Province == x.Province)
        && S.Owner.GetValueOrDefault(x.Province) != x.Power && S.WallsOf(x.Province) > 0;

    /// <summary>
    /// After movement: sieges whose army left or was destroyed are lifted, and their progress lost; each besiege order whose
    /// army still stands within the walls begins a siege; each siege whose army held there this season (it was ordered to hold
    /// or besiege, or given no order) wears the city down a step, two if a support to hold was given to the army and not cut;
    /// and a city worn down to the level of its walls surrenders to the besieger, its walls a level lower. Each court reads the
    /// season's sieges, its own and those of its cities, in one notice.
    /// </summary>
    private void Sieges(IReadOnlyDictionary<Power, ValidationResult> valid)
    {
        var news = new Dictionary<Power, List<string>>();
        void Tell(Power? p, string line)
        {
            if (p is not { } q || !S.IsAlive(q)) return;
            if (!news.TryGetValue(q, out var lines)) news[q] = lines = new();
            lines.Add(line);
        }

        foreach (var x in S.Sieges.ToList())
        {
            if (Stands(x)) continue;
            S.Sieges.Remove(x);
            var name = Map[x.Province].Name;
            var owner = S.Owner.GetValueOrDefault(x.Province);
            var unit = S.Units.FirstOrDefault(u => u.Id == x.UnitId);
            var why = unit is null || unit.Power != x.Power ? "the besieging army is gone"
                : unit.Province != x.Province ? "the besieging army marched out"
                : owner == x.Power ? $"{name} is now {x.Power}'s"
                : $"the walls of {name} are down";
            Tell(x.Power, $"Your siege of {name} is lifted: {why}. A new siege starts again from the beginning.");
            if (owner != x.Power) Tell(owner, $"{x.Power}'s siege of your city of {name} is lifted: {why}.");
            S.Log("siege", $"{x.Power}'s siege of {name} was lifted.", Parties(x.Power, owner));
        }

        foreach (var p in Powers.All.Where(valid.ContainsKey))
            foreach (var b in valid[p].Accepted.OfType<BesiegeOrder>())
            {
                // An army destroyed this season besieges nothing; one already besieging presses on below.
                if (S.UnitAt(b.Unit) is not { } unit || unit.Power != p || S.Sieges.Any(x => x.UnitId == unit.Id)) continue;
                var owner = S.Owner.GetValueOrDefault(b.Unit);
                if (owner == p || S.WallsOf(b.Unit) <= 0) continue;
                S.Sieges.Add(new Siege { Province = b.Unit, Power = p, UnitId = unit.Id, Since = S.Turn });
                S.Log("siege", $"{p} laid siege to {Map[b.Unit].Name}{(owner is { } o ? $", held by {o}" : "")}.", Parties(p, owner), "siege-begun");
            }

        foreach (var x in S.Sieges.OrderBy(x => x.Since).ThenBy(x => x.Province, StringComparer.Ordinal).ToList())
        {
            var name = Map[x.Province].Name;
            var owner = S.Owner.GetValueOrDefault(x.Province);
            var walls = S.WallsOf(x.Province);
            var begun = x.Since == S.Turn;
            // Only an army that held there presses the siege: one that tried to march out, or gave a support or convoy, did not.
            if (_unitOrdersNow.GetValueOrDefault(x.Province) is not (null or HoldOrder or BesiegeOrder))
            {
                Tell(x.Power, $"Your army in {x.Province} did not hold there, so the siege of {name} (walls {walls}) did not advance: it stands at {x.Progress} of {walls}.");
                Tell(owner, $"{x.Power}'s army besieging your city of {name} did not press the siege this season: it stands at {x.Progress} of {walls}.");
                continue;
            }
            var supported = _battle?.HoldSupported.Contains(x.Province) == true;
            x.Progress += supported ? 2 : 1;
            if (x.Progress >= walls)
            {
                Surrender(x, owner, Tell);
                continue;
            }
            var how = supported ? "two steps, with a support" : "a step";
            Tell(x.Power, $"{(begun ? "Your siege of" : "The siege of")} {name} (walls {walls}{(owner is { } h ? $", held by {h}" : ", a free city")}) {(begun ? "has begun, and it " : "")}wore the city down {how}: it stands at {x.Progress} of {walls}. The city surrenders when that reaches {walls}, if your army holds there.");
            Tell(owner, $"{x.Power}'s army {(begun ? "has laid siege to" : "besieges")} your city of {name} (walls {walls}) and wore it down {how}: it stands at {x.Progress} of {walls}. The city yields you nothing while it is besieged, and surrenders when that reaches {walls}, unless the besieging army is driven out or leaves.");
        }

        foreach (var (p, lines) in news.OrderBy(x => x.Key))
            S.Notify(p, InboxKind.Battle, SiegesTitle, string.Join("\n", lines.Select(l => "- " + l)));
    }

    /// <summary>The besieger and, if the city has one, its holder: who reads of a siege in the record.</summary>
    private static IEnumerable<Power> Parties(Power besieger, Power? owner) => owner is { } o ? [besieger, o] : [besieger];

    /// <summary>A city worn down to the level of its walls surrenders to its besieger, its walls a level lower.</summary>
    private void Surrender(Siege x, Power? owner, Action<Power?, string> tell)
    {
        var prov = x.Province;
        var name = Map[prov].Name;
        var seasons = S.Turn - x.Since + 1;
        S.Sieges.Remove(x);
        LowerWalls(prov);
        S.Owner[prov] = x.Power;
        var left = S.WallsOf(prov) is > 0 and var w ? $"walls {w}" : "no walls";
        tell(x.Power, $"{name} surrendered to you after a siege of {seasons} season{(seasons == 1 ? "" : "s")}: it is yours, with its walls a level lower ({left}).");
        if (owner is { } loser)
        {
            S.Notify(loser, InboxKind.Battle, "Land lost", $"{name} has surrendered to {x.Power} after a siege of {seasons} season{(seasons == 1 ? "" : "s")}.");
            S.Log("conquest", $"{x.Power} took {name} from {loser}.", [x.Power, loser]);
        }
        S.Notify(x.Power, InboxKind.Battle, "Land taken", $"{name} is now yours.");
        S.Log("siege", $"{name} surrendered to {x.Power} after a siege of {seasons} season{(seasons == 1 ? "" : "s")}.",
            Powers.All.Where(p => p == x.Power || p == owner || Views.Sight(S, Map, p).Contains(prov)), "siege-won");
        // A court's capital holds its archive: whoever takes it gains a copy of every tablet in it.
        TakeArchive(x.Power, prov);
    }

    /// <summary>What a king reads of his own move that got within walls he does not hold: whether it stormed them, with the strengths.</summary>
    private static string AssaultText(Assault a)
    {
        var strengths = $"strength {a.Strength} against walls {a.Walls} and defenders {a.Defenders}";
        if (a.Stormed) return $"it stormed the walls of {a.Province} ({strengths}), and {a.Province} is yours";
        if (a.Kind == UnitKind.Fleet) return $"your fleet stands within the walls of {a.Province} (walls {a.Walls}), but a fleet can neither storm walls nor besiege them, so it takes nothing";
        return $"it got within the walls of {a.Province} but did not storm them ({strengths}): your army stands inside and takes nothing; besiege the city to wear it down";
    }

    /// <summary>
    /// What a king reads of an assault on a walled city of his own, among his own lines: who came from where, his side of it
    /// (the walls and the defenders), the strengths, and what came of it.
    /// </summary>
    private string OwnWallsText(Assault a)
    {
        var who = $"{a.Power}'s {(a.Kind == UnitKind.Army ? "army" : "fleet")} from {a.From}";
        var strengths = $"its strength {a.Strength} against your walls {a.Walls} and defenders {a.Defenders}";
        var name = Map[a.Province].Name;
        return a.Stormed
            ? $"Your walled city of {name}: {who} stormed the walls ({strengths}): {name} is taken."
            : $"Your walled city of {name}: {who} got within the walls but did not storm them ({strengths}): it stands inside, and {name} stays yours unless a siege wears it down.";
    }
}
