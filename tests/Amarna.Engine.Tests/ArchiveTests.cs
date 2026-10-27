using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Tablets are objects in a place: archives at the capital, copied by spies, taken with the capital.</summary>
public class ArchiveTests
{
    private static TurnEngine Begin(GameState s)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        foreach (var r in e.MindRequests.ToList()) e.Fulfil(r, new MindReply { Text = $"[{r.Task}]" });
        return e;
    }

    private static Dictionary<Power, TurnSubmission> Orders(Power p, params Order[] orders) => new() { [p] = new TurnSubmission { Orders = orders.ToList() } };

    private static void Advance(GameState s, int seasons)
    {
        for (var i = 0; i < seasons; i++) Begin(s).Resolve(new Dictionary<Power, TurnSubmission>());
    }

    /// <summary>A tablet two courts sealed, with a copy in each one's archive.</summary>
    private static Tablet Sealed(GameState s, string id, Power a, Power b, int turn, string text)
    {
        var t = new Tablet { Id = id, Text = text, ProposedBy = a, Partner = b, Seals = [a, b], CreatedTurn = turn, SealedTurn = turn };
        s.Tablets.Add(t);
        s.Copies.Add(new TabletCopy { Id = s.NewId("k"), TabletId = id, Holder = a, AcquiredTurn = turn, Source = "sealed at audience" });
        s.Copies.Add(new TabletCopy { Id = s.NewId("k"), TabletId = id, Holder = b, AcquiredTurn = turn, Source = "brought home by your envoy" });
        return t;
    }

    /// <summary>A Babylonian spy of the highest skill already posted at the court of Assyria.</summary>
    private static (GameState S, Character Spy) SpyAtAssyria(ulong seed = 8)
    {
        var s = GameFactory.NewGame(seed, new GameConfig { CatastropheChance = 0 });
        var spy = s.Characters.First(c => c.Employer == Power.Babylonia);
        spy.SecretMaster = null;
        spy.Traits.Competence = 100;
        (spy.Duty, spy.At, spy.MissionTarget) = (Duty.SpyPosted, Power.Assyria, Power.Assyria);
        return (s, spy);
    }

    private static IEnumerable<Power> HoldersOf(GameState s, string tabletId) => s.Copies.Where(k => k.TabletId == tabletId).Select(k => k.Holder);

    [Fact]
    public void A_spy_copies_a_tablet_from_the_archive_it_watches_and_the_copy_comes_home_with_its_report()
    {
        // Seed 1: with save version 7's dice, seed 8's watchmen catch the spy in its first season.
        var (s, spy) = SpyAtAssyria(1);
        Sealed(s, "t900", Power.Assyria, Power.Hatti, 1, "Assyria and Hatti swear to stand together against Babylonia.");

        Begin(s).Resolve(new Dictionary<Power, TurnSubmission>());
        var journey = s.Journeys.Single(j => j.Kind == JourneyKind.SpyReport && j.CharacterId == spy.Id);
        Assert.Equal(["t900"], journey.Report!.TabletIds);
        // Copied, not yet home: the copy travels with the report.
        Assert.DoesNotContain(Power.Babylonia, HoldersOf(s, "t900"));
        Assert.Contains(spy.Memory, m => m.Text.StartsWith("I copied a tablet from the archive of Assyria", StringComparison.Ordinal));

        while (s.Journeys.Contains(journey)) Advance(s, 1);
        var copy = s.Copies.Single(k => k.TabletId == "t900" && k.Holder == Power.Babylonia);
        Assert.Equal($"copied from the archive of Assyria by your spy {spy.Name}", copy.Source);
        var report = s.InboxOf(Power.Babylonia).First(i => i.Kind == InboxKind.SpyReport);
        Assert.Contains($"[With this report came copies {spy.Name} made in the archive of Assyria, now in your archive: the tablet sealed by Assyria and Hatti, dated turn 1 (your copy {copy.Id}).]", report.Body);
        Assert.Contains(Views.For(s, Power.Babylonia).Tablets, t => t.CopyId == copy.Id && t.Text.Contains("against Babylonia"));
        Assert.Contains(s.Events, e => e.Signal == "archive-copied" && e.VisibleTo.SequenceEqual([Power.Babylonia]));

        // Nobody else learns of it: Assyria and Hatti keep their one copy each, no other court gains one, and nobody is told.
        Assert.Equal([Power.Assyria, Power.Hatti, Power.Babylonia], HoldersOf(s, "t900"));
        foreach (var p in Powers.All.Where(p => p != Power.Babylonia))
            Assert.DoesNotContain(s.InboxOf(p), i => i.Body.Contains("archive", StringComparison.OrdinalIgnoreCase) || i.Body.Contains(copy.Id, StringComparison.Ordinal));
    }

    [Fact]
    public void A_spy_copies_one_tablet_a_season_never_one_its_master_holds_agreements_and_the_newest_first()
    {
        // Seed 1: with save version 7's dice, seed 8's watchmen catch the spy in its first season.
        var (s, spy) = SpyAtAssyria(1);
        Sealed(s, "t900", Power.Assyria, Power.Hatti, 1, "The oldest treaty.");
        Sealed(s, "t901", Power.Assyria, Power.Babylonia, 2, "A treaty Babylonia holds already.");
        Sealed(s, "t902", Power.Assyria, Power.Egypt, 3, "The newest treaty.");
        // A tablet with one seal comes after every agreement, however new.
        s.Tablets.Add(new Tablet { Id = "t903", Text = "A note.", ProposedBy = Power.Hatti, Seals = [Power.Hatti], CreatedTurn = 4, SealedTurn = 4 });
        s.Copies.Add(new TabletCopy { Id = s.NewId("k"), TabletId = "t903", Holder = Power.Assyria, AcquiredTurn = 4, Source = "test" });

        var order = new List<string>();
        for (var i = 0; i < 5; i++)
        {
            Begin(s).Resolve(new Dictionary<Power, TurnSubmission>());
            var sent = s.Journeys.Where(j => j.Kind == JourneyKind.SpyReport && j.Report!.ObservedTurn == s.Turn - 1).SelectMany(j => j.Report!.TabletIds).ToList();
            Assert.True(sent.Count <= 1);
            order.AddRange(sent);
        }
        Assert.Equal(["t902", "t900", "t903"], order);
        Advance(s, 3);
        Assert.Single(s.Copies, k => k.TabletId == "t901" && k.Holder == Power.Babylonia);
        Assert.All(new[] { "t900", "t902", "t903" }, t => Assert.Single(s.Copies, k => k.TabletId == t && k.Holder == Power.Babylonia));
    }

    [Fact]
    public void A_spy_turned_by_the_court_it_watches_copies_nothing_and_a_clumsy_one_copies_seldom()
    {
        var (s, spy) = SpyAtAssyria();
        Sealed(s, "t900", Power.Assyria, Power.Hatti, 1, "A treaty.");
        spy.SecretMaster = Power.Assyria;
        spy.PoisonText = "All is quiet.";
        Advance(s, 6);
        Assert.DoesNotContain(Power.Babylonia, HoldersOf(s, "t900"));
        Assert.All(s.Journeys.Where(j => j.Report is not null), j => Assert.Empty(j.Report!.TabletIds));

        // Skill is the chance: a spy of no skill never copies.
        var (s2, clumsy) = SpyAtAssyria();
        Sealed(s2, "t900", Power.Assyria, Power.Hatti, 1, "A treaty.");
        clumsy.Traits.Competence = 0;
        Advance(s2, 6);
        Assert.DoesNotContain(Power.Babylonia, HoldersOf(s2, "t900"));
    }

    /// <summary>Assyria's capital, empty, with a Babylonian army one move from it.</summary>
    private static (GameState S, string Capital, string From) BabyloniaNextToAshur()
    {
        var s = GameFactory.NewGame(3, new GameConfig { CatastropheChance = 0 });
        var map = WorldMap.Default;
        var capital = map.Capital(Power.Assyria).Id;
        var from = map.MovesFrom(UnitKind.Army, capital).First(x => !map[x].IsSea && map[x].Home == Power.Assyria);
        s.Units.RemoveAll(u => u.Province == capital || u.Province == from);
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = from });
        // Ashur with its walls thrown down, for the test: a lone army walks in and takes it.
        s.Walls.Remove(capital);
        return (s, capital, from);
    }

    [Fact]
    public void Whoever_takes_a_capital_gains_copies_of_its_archive_and_its_king_keeps_his_own()
    {
        var (s, capital, from) = BabyloniaNextToAshur();
        Sealed(s, "t900", Power.Assyria, Power.Hatti, 1, "Assyria and Hatti swear peace.");
        Sealed(s, "t901", Power.Assyria, Power.Babylonia, 1, "Assyria and Babylonia swear peace.");
        // A tablet Hatti holds, not Assyria: not in Assyria's archive.
        Sealed(s, "t902", Power.Hatti, Power.Egypt, 1, "Hatti and Egypt swear peace.");

        Begin(s).Resolve(Orders(Power.Babylonia, new MoveOrder(from, capital)));
        Assert.Equal(Power.Babylonia, s.Owner[capital]);

        var taken = s.Copies.Where(k => k.Holder == Power.Babylonia && k.TabletId == "t900").ToList();
        Assert.Single(taken);
        Assert.Equal($"taken with the archive of Assyria at {WorldMap.Default[capital].Name}", taken[0].Source);
        // What it held already it does not gain twice; what Assyria never held is not in its archive.
        Assert.Single(s.Copies, k => k.Holder == Power.Babylonia && k.TabletId == "t901");
        Assert.DoesNotContain(Power.Babylonia, HoldersOf(s, "t902"));
        // Assyria keeps its own copies; no other court gains any.
        Assert.Equal([Power.Assyria, Power.Hatti, Power.Babylonia], HoldersOf(s, "t900"));

        var notice = s.InboxOf(Power.Babylonia).Single(i => i.Title == TurnEngine.ArchiveTakenTitle);
        Assert.Equal($"With {WorldMap.Default[capital].Name} you took the archive of Assyria: copies of 1 tablet you did not hold are now in your archive: the tablet sealed by Assyria and Hatti, dated turn 1 (your copy {taken[0].Id}).", notice.Body);
        // Read next season, with the rest of the season's news.
        Assert.Equal(s.Turn, notice.Turn);
        foreach (var p in Powers.All.Where(p => p != Power.Babylonia))
            Assert.DoesNotContain(s.InboxOf(p), i => i.Title == TurnEngine.ArchiveTakenTitle);
        Assert.Contains(s.Events, e => e.Signal == "archive-taken" && e.VisibleTo.SequenceEqual([Power.Babylonia]));
    }

    [Fact]
    public void Land_that_is_not_a_capital_holds_no_archive_and_a_capital_ceded_gives_its_archive_as_one_taken()
    {
        var (s, capital, from) = BabyloniaNextToAshur();
        Sealed(s, "t900", Power.Assyria, Power.Hatti, 1, "Assyria and Hatti swear peace.");
        // Babylonia takes a province of Assyria's homeland that is not its capital: no archive there.
        var other = WorldMap.Default.MovesFrom(UnitKind.Army, from).First(x => x != capital && WorldMap.Default[x].Home == Power.Assyria && !WorldMap.Default[x].Capital);
        s.Units.RemoveAll(u => u.Province == other);
        Begin(s).Resolve(Orders(Power.Babylonia, new MoveOrder(from, other)));
        Assert.Equal(Power.Babylonia, s.Owner[other]);
        Assert.DoesNotContain(Power.Babylonia, HoldersOf(s, "t900"));
        Assert.DoesNotContain(s.InboxOf(Power.Babylonia), i => i.Title == TurnEngine.ArchiveTakenTitle);

        // Ashur is Babylonia's (given to it, for the test), and Assyria falls with it as the season resolves; Babylonia cedes
        // the city to Egypt that season: the archive lies in the city, and Egypt gains copies of it. (A king cannot cede his
        // own capital since the siege package.)
        s.Owner[capital] = Power.Babylonia;
        Begin(s).Resolve(Orders(Power.Babylonia, new CedeProvinceOrder(capital, Power.Egypt)));
        Assert.Contains(Power.Assyria, s.Eliminated);
        Assert.Equal(Power.Egypt, s.Owner[capital]);
        Assert.Single(s.Copies, k => k.Holder == Power.Egypt && k.TabletId == "t900");
        Assert.Single(s.InboxOf(Power.Egypt), i => i.Title == TurnEngine.ArchiveTakenTitle);
        Assert.Single(s.Copies, k => k.Holder == Power.Assyria && k.TabletId == "t900");
    }

    [Fact]
    public void An_empty_archive_is_said_to_be_empty()
    {
        // (Until the siege package this test also had Assyria retake its capital and gain nothing from its own archive; a
        // kingdom now falls with its capital, so there is no king left to retake it.)
        var (s, capital, from) = BabyloniaNextToAshur();
        Begin(s).Resolve(Orders(Power.Babylonia, new MoveOrder(from, capital)));
        Assert.Equal("With " + WorldMap.Default[capital].Name + " you took the archive of Assyria; it held no tablet you did not hold already.",
            s.InboxOf(Power.Babylonia).Single(i => i.Title == TurnEngine.ArchiveTakenTitle).Body);
        Assert.Contains(Power.Assyria, s.Eliminated);
    }
}
