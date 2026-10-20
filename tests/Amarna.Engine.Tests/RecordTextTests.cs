using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// What the engine's records and notices say, after the second agent simulation's defects in the views (the fix pass after
/// item 4, part 2).
/// </summary>
public class RecordTextTests
{
    /// <summary>Egypt's envoy stands before Alashiya's king.</summary>
    private static (GameState S, TurnEngine E, Character Envoy, PendingAudience A) AtAudience(DispatchOrder? letter = null)
    {
        var s = GameFactory.NewGame(5);
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [letter ?? new DispatchOrder(envoy.Id, Power.Alashiya, "Greetings, brother.")] } });
        while (s.Audiences.Count == 0)
        {
            e = new TurnEngine(s);
            e.BeginTurn();
            if (s.Audiences.Count == 0) e.Resolve(new Dictionary<Power, TurnSubmission>());
        }
        return (s, e, envoy, s.Audiences.Single());
    }

    /// <summary>A game where Egypt holds its copy k900 of a peace it sealed with Hatti, and Hatti its own, k901.</summary>
    private static GameState WithPeace()
    {
        var s = GameFactory.NewGame(5);
        s.Tablets.Add(new Tablet { Id = "t900", Text = "Peace between Egypt and Hatti for all time.", ProposedBy = Power.Egypt, Partner = Power.Hatti, Seals = [Power.Egypt, Power.Hatti], CreatedTurn = 1, SealedTurn = 1 });
        s.Copies.Add(new TabletCopy { Id = "k900", TabletId = "t900", Holder = Power.Egypt, AcquiredTurn = 1, Source = "sealed at audience" });
        s.Copies.Add(new TabletCopy { Id = "k901", TabletId = "t900", Holder = Power.Hatti, AcquiredTurn = 1, Source = "sealed at audience" });
        return s;
    }

    [Fact]
    public void A_tablet_is_named_by_its_seals_and_date_the_same_at_every_court()
    {
        var s = WithPeace();
        var egypt = Views.For(s, Power.Egypt).Tablets.Single();
        var hatti = Views.For(s, Power.Hatti).Tablets.Single();
        Assert.Equal(("k900", "k901"), (egypt.CopyId, hatti.CopyId));
        Assert.Equal("the tablet sealed by Egypt and Hatti, dated turn 1", egypt.Name);
        Assert.Equal(egypt.Name, hatti.Name);

        // Two of the same seals and date in one archive: each named with its opening words, the same at every court.
        s.Tablets.Add(new Tablet { Id = "t902", Text = "Egypt shall send Hatti forty shekels of gold every year, and Hatti shall send horses.", ProposedBy = Power.Egypt, Partner = Power.Hatti, Seals = [Power.Egypt, Power.Hatti], CreatedTurn = 1, SealedTurn = 1 });
        s.Copies.Add(new TabletCopy { Id = "k902", TabletId = "t902", Holder = Power.Egypt, AcquiredTurn = 1, Source = "sealed at audience" });
        var names = Views.For(s, Power.Egypt).Tablets.Select(t => t.Name).ToList();
        Assert.Equal(["the tablet sealed by Egypt and Hatti, dated turn 1, beginning \"Peace between Egypt and Hatti for all time.\"",
            "the tablet sealed by Egypt and Hatti, dated turn 1, beginning \"Egypt shall send Hatti forty shekels of gold…\""], names);
    }

    [Fact]
    public void A_kings_marks_for_his_copies_and_person_ids_reach_other_courts_as_names()
    {
        var s = WithPeace();
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var other = s.Characters.First(c => c.Id != envoy.Id);
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new()
            {
                Orders = [new DispatchOrder(envoy.Id, Power.Hatti, $"The peace of k900 stands, and Tablet K900 binds us. Ask {other.Name} ({other.Id}) and {other.Id}. Your k901 is yours.",
                    $"May confirm k900.", Proposal: new TabletProposal { Text = "As the tablet k900 says, peace." })],
            },
        });

        var name = "the tablet sealed by Egypt and Hatti, dated turn 1";
        var trail = s.Trails.Single();
        Assert.Equal($"The peace of {name} stands, and The tablet sealed by Egypt and Hatti, dated turn 1 binds us. Ask {other.Name} and {other.Name}. Your k901 is yours.", trail.LeaderLetter);
        Assert.Equal($"May confirm {name}.", trail.Mandate);
        Assert.Equal($"As {name} says, peace.", trail.ProposalText);
        var dispatch = s.Journeys.Single(j => j.Kind == JourneyKind.EnvoyOutbound).Dispatch!;
        Assert.Equal((trail.LeaderLetter, trail.Mandate, trail.ProposalText), (dispatch.Letter, dispatch.Mandate, dispatch.Proposal!.Text));
        Assert.Equal(trail.ProposalText, s.Tablets.Single(t => t.Id == dispatch.ProposalTabletId).Text);
        // The envoy remembers the letter as the scribes wrote it.
        Assert.Contains(envoy.Memory, m => m.Text.Contains($"\"The peace of {name} stands"));
    }

    [Fact]
    public void An_examination_names_the_tablet_and_gives_its_text_in_full()
    {
        var s = WithPeace();
        var long_ = string.Concat(Enumerable.Repeat("Peace and brotherhood between our houses. ", 10)).Trim();
        s.Tablets.Single(t => t.Id == "t900").Text = long_;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new AuthenticateOrder("k900", 40)] } });
        e = new TurnEngine(s);
        e.BeginTurn();
        var notice = s.InboxOf(Power.Egypt).Single(i => i.Kind == InboxKind.Authentication);
        Assert.StartsWith($"The tablet sealed by Egypt and Hatti, dated turn 1 (your copy k900): \"{long_}\" — ", notice.Body);
    }

    private static string Battle(GameState s, Power p) =>
        s.InboxOf(p).Single(i => i.Kind == InboxKind.Battle && i.Title.StartsWith("Movements", StringComparison.Ordinal)).Body;

    [Fact]
    public void A_stopped_move_says_where_the_unit_now_stands()
    {
        // Assyria and Mitanni meet head to head between Ekallatum and Terqa at equal strength: both bounce and stay.
        var s = GameFactory.NewGame(1);
        new TurnEngine(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "terqa")] },
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "ekallatum")] },
        });

        Assert.Contains("- A ekallatum -> terqa: fails: it met the unit from terqa (Mitanni's army) coming the other way; your strength 1 against 1; so your army stays in ekallatum", Battle(s, Power.Assyria));
        Assert.Contains("- A terqa -> ekallatum: fails: it met the unit from ekallatum (Assyria's army) coming the other way; your strength 1 against 1; so your army stays in terqa", Battle(s, Power.Mitanni));

        // A unit whose move failed and that was then destroyed is not said to stay: its own line says it was destroyed.
        var t = GameFactory.NewGame(1);
        new TurnEngine(t).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Assyria] = new() { Orders = [new MoveOrder("ekallatum", "terqa"), new SupportOrder("ashur", "ekallatum", "terqa")] },
            [Power.Mitanni] = new() { Orders = [new MoveOrder("terqa", "ekallatum")] },
            [Power.Babylonia] = new() { Orders = [new SupportOrder("sippar", "terqa", "ekallatum"), new SupportOrder("durkurigalzu", "terqa", "ekallatum")] },
        });
        var assyria = Battle(t, Power.Assyria);
        Assert.Contains("- A ekallatum is destroyed", assyria);
        Assert.DoesNotContain("stays in ekallatum", assyria);
    }

    [Fact]
    public void The_host_reads_the_envoys_own_promise_apart_from_what_the_audience_brought_about()
    {
        var (s, e, envoy, a) = AtAudience();
        e.ApplyAudience(new AudienceRecord
        {
            AudienceId = a.Id,
            Delivered = "Greetings.",
            Rounds =
            [
                new AudienceRound
                {
                    Host = new HostReply { Speech = "Take this.", Bribe = 10, End = true },
                    Envoy = new EnvoyReaction { Speech = "I thank you.", AcceptBribe = true, Commitments = "the tablet sealed exactly as written" },
                },
            ],
        });

        // The record of the mission keeps the promise among its outcomes, marked as the envoy's own.
        var trail = s.Trails.Single();
        Assert.Contains(TurnEngine.CommittedPrefix + "the tablet sealed exactly as written", trail.Outcomes);
        Assert.Equal("the tablet sealed exactly as written", trail.Outcomes.Select(TurnEngine.Commitment).OfType<string>().Single());
        // The host reads it on a line of its own, as the envoy's promise, not among the outcomes.
        var body = s.InboxOf(Power.Alashiya).Single(i => i.Kind == InboxKind.Audience).Body;
        var outcome = body.Split('\n').Single(l => l.StartsWith("Outcome: ", StringComparison.Ordinal));
        Assert.DoesNotContain("sealed exactly", outcome);
        Assert.Contains($"accepted 10 shekels from Alashiya", outcome);
        Assert.Contains($"{envoy.Name} promised on behalf of Egypt: \"the tablet sealed exactly as written\"", body);
    }
}
