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

    /// <summary>
    /// Walls strengthened (<see cref="FortifyOrder"/>): a level higher at the end of the season, paid now, unless the province
    /// was lost in movement, is besieged, or has foreign troops within it after movement, which others brought about (a
    /// scheduled order then wakes its seat).
    /// </summary>
    private void Fortify(Power p, FortifyOrder f)
    {
        var name = Map[f.Province].Name;
        var why = S.Owner.GetValueOrDefault(f.Province) != p ? "you no longer held it after movement"
            : S.SiegeOf(f.Province) is not null ? "it was besieged"
            : S.UnitAt(f.Province) is { } within && within.Power != p ? "foreign troops stood within it after movement"
            : S.WallsOf(f.Province) >= S.Config.MaxWalls ? "its walls stood as high as walls go"
            : null;
        if (why is not null)
        {
            Failed(p, f, "Walls not strengthened", $"The walls of {name} were not strengthened: {why}. No gold was paid.", why, byOthers: true);
            return;
        }
        var level = S.WallsOf(f.Province) + 1;
        if (!Pay(p, S.Config.FortifyCost * level, $"the walls of {name}", f, "they were not strengthened")) return;
        S.Walls[f.Province] = level;
        var above = level - MapData.StartWalls.GetValueOrDefault(f.Province);
        S.Notify(p, InboxKind.Resolution, "Walls strengthened", $"The walls of {name} stand at level {level} now"
            + (above > 0 ? $"; the {above} level{(above == 1 ? "" : "s")} above its old walls cost {Money.Format(above * S.Config.WallUpkeep)} a season." : "."));
        S.Log("fortify", $"{p} strengthened the walls of {name} to level {level}.",
            Powers.All.Where(x => x == p || Views.Sight(S, Map, x).Contains(f.Province)), "fortify");
    }

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

    /// <summary>
    /// The siege of a king's own capital, if one is under way, with its tightness: the besieger's units in the city and next
    /// to it (any kind of link), from 1 to 3.
    /// </summary>
    public (Siege Siege, int Tightness)? CapitalSiege(Power p)
    {
        var capital = Map.Capital(p).Id;
        if (S.Owner.GetValueOrDefault(capital) != p || S.SiegeOf(capital) is not { } siege) return null;
        return (siege, Tightness(siege));
    }

    /// <summary>A siege's tightness: the besieger's units in the city and next to it, from 1 to 3.</summary>
    public int Tightness(Siege x)
    {
        var near = Map.Neighbors(x.Province).Append(x.Province).ToHashSet();
        return Math.Clamp(S.Units.Count(u => u.Power == x.Power && near.Contains(u.Province)), 1, 3);
    }

    /// <summary>
    /// The besiegers' roll for an envoy slipping out of, or into, its king's besieged capital: a chance in percent of 20 ×
    /// the tightness − its skill ÷ 4, between 5 and 75 (first guesses: question 5, plan step 12).
    /// </summary>
    private bool CaughtByBesiegers(Character c, int tightness)
    {
        var percent = Math.Clamp(S.Config.SiegeCatchPerUnit * tightness - c.Traits.Competence / 4, S.Config.SiegeCatchMin, S.Config.SiegeCatchMax);
        return R("siege-envoy", c.Id).Chance(percent / 100.0);
    }

    /// <summary>
    /// An envoy caught by the besiegers of its king's capital, leaving with a letter or coming home with what it brings: it
    /// is the besieger's captive (who may execute, ransom or release it, not turn it). The besieger reads the letter and the
    /// mandate, takes the gold and keeps the tablets it carried; its king goes on believing it on its way, and hears only,
    /// a season after it was due, that it has not returned.
    /// </summary>
    private void Intercept(Character c, Power lord, Siege siege, bool leaving, Dispatch? dispatch, HomeCargo? cargo, int due)
    {
        var besieger = siege.Power;
        var city = Map[siege.Province].Name;
        // What its king believed of it a moment before: on its way out, or on the road home.
        CoverFor(c, lord, leaving ? Duty.EnvoyOutbound : Duty.EnvoyHomebound);
        c.Status = CharacterStatus.Captured;
        c.HeldBy = besieger;
        c.At = besieger;
        c.Duty = Duty.None;
        c.MissionTarget = null;
        c.WatchProvince = null;
        c.Intercepted = true;
        var trail = Trail(dispatch?.TrailId ?? cargo?.TrailId);
        trail?.Outcomes.Add($"caught {(leaving ? "leaving" : "coming home to")} {city} by {besieger}'s besiegers");
        var lines = new List<string>();
        var gold = dispatch?.Gold ?? cargo?.Gold ?? 0;
        var purity = dispatch?.PurityPercent ?? cargo?.PurityPercent ?? 100;
        if (gold > 0)
        {
            var fine = (int)Math.Round(gold * purity / 100.0);
            S.Treasuries[besieger].Gold += fine;
            S.Treasuries[besieger].Lots.Add(new GoldLot { Id = S.NewId("g"), From = lord, Stated = gold, Face = gold, True = fine, ArrivedTurn = S.Turn + S.DeliveryOffset });
            lines.Add($"He carried {Money.Format(gold)} of gold, which your troops took.");
        }
        // The tablets it carried: the one it was to have sealed, those shown as evidence, those it brought home.
        var tablets = new List<string>();
        if (dispatch?.ProposalTabletId is { } proposal) tablets.Add(proposal);
        foreach (var copyId in dispatch?.CopyIds ?? []) if (S.Copies.FirstOrDefault(k => k.Id == copyId) is { } shown) tablets.Add(shown.TabletId);
        tablets.AddRange(cargo?.CopyIds ?? []);
        var held = S.Copies.Where(k => k.Holder == besieger).Select(k => k.TabletId).ToHashSet();
        foreach (var id in tablets.Distinct().Where(held.Add))
            S.Copies.Add(new TabletCopy { Id = S.NewId("k"), TabletId = id, Holder = besieger, AcquiredTurn = S.Turn, Source = $"taken from {c.Name}, envoy of {lord}, caught at {city}" });
        if (tablets.Count > 0) lines.Add($"The tablets he carried are in your archive now.");
        var said = dispatch is not null
            ? $"leaving the city for the court of {trail?.To}. The letter he was to speak: \"{dispatch.Letter}\"" + (dispatch.Mandate.Length > 0 ? $" His mandate: \"{dispatch.Mandate}\"" : "")
            : $"coming home to the city from the court of {trail?.To.ToString() ?? "abroad"}.";
        S.Notify(besieger, InboxKind.Notice, EnvoyCaughtTitle,
            $"Your troops besieging {city} caught {c.Name}, envoy of {lord}, {said} {string.Join(" ", lines)} He is your captive: you may execute, ransom or release him.".Replace("  ", " "), c.Id);
        c.Remember(S.Turn, $"{besieger.Land()}'s besiegers caught me {(leaving ? "slipping out of" : "slipping back into")} {city}.");
        S.Log("siege", $"{besieger}'s besiegers caught {c.Name}, envoy of {lord}, {(leaving ? "leaving" : "coming home to")} {city}.", [besieger], "envoy-caught");
        // The talk of the court that holds it, for envoys and spies there to carry home: whose envoy, plainly.
        S.Losses.Add(new LossAbroad { Turn = S.Turn, Kind = LossKind.Captured, CharacterId = c.Id, Court = besieger, Master = lord });
        Overdue(lord, c, trail?.To ?? besieger, due);
    }

    /// <summary>The notice to a besieger whose troops caught an envoy at the city it besieges.</summary>
    public const string EnvoyCaughtTitle = "An envoy is caught";

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
        TakenByForce(prov, x.Power);
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
        var strengths = $"strength {a.Strength} against walls {a.Walls} and defenders {a.Defenders}{GroundShare(a)}";
        if (a.Stormed) return $"it stormed the walls of {a.Province} ({strengths}), and {a.Province} is yours";
        if (a.Kind == UnitKind.Fleet) return $"your fleet stands within the walls of {a.Province} (walls {a.Walls}), but a fleet can neither storm walls nor besiege them, so it takes nothing";
        return $"it got within the walls of {a.Province} but did not storm them ({strengths}): your army stands inside and takes nothing; besiege the city to wear it down";
    }

    /// <summary>The ground's share of the defenders' strength in an assault on walls, if it had one (", 1 of it for the rough ground of lukka").</summary>
    private static string GroundShare(Assault a) => a.Ground is { } g ? $", {a.GroundBonus} of it for {g.Text}" : "";

    /// <summary>
    /// What a king reads of an assault on a walled city of his own, among his own lines: who came from where, his side of it
    /// (the walls and the defenders), the strengths, and what came of it.
    /// </summary>
    private string OwnWallsText(Assault a)
    {
        var who = $"{a.Power}'s {(a.Kind == UnitKind.Army ? "army" : "fleet")} from {a.From}";
        var strengths = $"its strength {a.Strength} against your walls {a.Walls} and defenders {a.Defenders}{GroundShare(a)}";
        var name = Map[a.Province].Name;
        return a.Stormed
            ? $"Your walled city of {name}: {who} stormed the walls ({strengths}): {name} is taken."
            : $"Your walled city of {name}: {who} got within the walls but did not storm them ({strengths}): it stands inside, and {name} stays yours unless a siege wears it down.";
    }
}
