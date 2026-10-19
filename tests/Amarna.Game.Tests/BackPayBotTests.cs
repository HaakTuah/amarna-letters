using Amarna.Engine;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// Back pay as kings and characters weigh it: script kings reckon strength by the game's own function and count back pay
/// owed as gold already spent; characters set what their lord owes them against an offer of service.
/// </summary>
public class BackPayBotTests
{
    /// <summary>Egypt owes one of its envoys, away on a mission, 45 shekels of back pay.</summary>
    private static (GameState S, Character Envoy) Owing()
    {
        var s = GameFactory.NewGame(3);
        var c = s.Characters.First(x => x.Employer == Power.Egypt);
        c.SecretMaster = null;
        (c.Duty, c.At, c.MissionTarget) = (Duty.EnvoyOutbound, null, Power.Hatti);
        c.BackPay[Power.Egypt] = 45;
        return (s, c);
    }

    private static int Land(GameState s, Power p) => s.OwnedBy(p).Sum(id => WorldMap.Default[id].Yield);

    [Fact]
    public void Engine_seat_view_and_script_king_reckon_strength_by_the_same_function()
    {
        var (s, _) = Owing();
        var e = new TurnEngine(s);
        // The score: true gold, less the back pay really owed.
        Assert.Equal(Scoring.Strength(s.Config, Land(s, Power.Egypt), s.Treasuries[Power.Egypt].Gold, 45), e.Strength(Power.Egypt));

        // The seat's own line: its ledger, less the back pay it believes it owes.
        var view = Views.For(s, Power.Egypt);
        Assert.Equal(45, view.BackPay);
        Assert.Equal(Scoring.Strength(s.Config, Land(s, Power.Egypt), view.Gold, 45), view.Strength);

        // The script king: its own as its view shows it, a rival's from public land and its own estimate of his gold,
        // with no back pay, which nobody can see.
        var brain = new Brain(Power.Egypt, 3);
        brain.Learn(view, new Board(view));
        var board = new Board(view, brain.Remembered(view), brain.Treasury);
        Assert.Equal(view.Strength, board.Strength(Power.Egypt));
        Assert.Equal((double)view.Strength / view.StartStrength, board.Growth(Power.Egypt), 9);
        Assert.Equal(Scoring.Strength<double>(10, Land(s, Power.Hatti), Math.Max(0, brain.Treasury[Power.Hatti]), 0), board.Strength(Power.Hatti));
        Assert.Equal(Scoring.Strength<double>(10, WorldMap.Default.HomeOf(Power.Hatti).Sum(x => x.Yield), MapData.StartGold[Power.Hatti], 0), board.StartStrength(Power.Hatti));
        // At the start, a rival's reckoning is the engine's own.
        Assert.Equal(s.StartStrength[Power.Hatti], board.StartStrength(Power.Hatti));
    }

    [Fact]
    public void A_script_king_counts_back_pay_owed_as_gold_already_spent()
    {
        var s = GameFactory.NewGame(3);
        var bought = false;
        foreach (var p in Powers.All)
        {
            var view = Views.For(s, p);
            (double Spare, List<Order> Orders) Treasury(int backPay)
            {
                view.BackPay = backPay;
                var brain = new Brain(p, 3);
                brain.Learn(view, new Board(view));
                var board = new Board(view, brain.Remembered(view), brain.Treasury);
                var orders = new List<Order>();
                Statecraft.Economy(board, brain, new MilitaryPlan(), orders, Rng.For(3, 1, "test", p.ToString()));
                return (brain.SpareGold, orders);
            }
            var clear = Treasury(0);
            // Owing its whole treasury, a king has nothing to spend: no city, no levy.
            var owing = Treasury(view.Gold);
            Assert.DoesNotContain(owing.Orders, o => o is BuyProvinceOrder or RaiseOrder);
            bought |= clear.Orders.Any(o => o is BuyProvinceOrder);
            // With nothing bought either way, what is spare differs by exactly what is owed.
            if (clear.Orders.Count == 0) Assert.Equal(clear.Spare - view.Gold, owing.Spare, 6);
        }
        Assert.True(bought, "some king should buy a city when it owes nothing");
    }

    private static Character Envoy(int loyalty, int ambition, Power? fondOf = null) => new()
    {
        Id = "c1", Name = "Keliya", Origin = "Mitanni", Calling = "scribe", Status = CharacterStatus.Employed, Employer = Power.Egypt,
        Contract = new Contract { Wage = 12, StartTurn = 1, UntilTurn = 10 },
        Traits = new Traits { Loyalty = loyalty, Greed = 30, Competence = 60, Ambition = ambition, Courage = 60, Sympathy = fondOf, SympathyStrength = fondOf is null ? 0 : 70 },
    };

    private static async Task<bool> Takes(Character envoy, int offer, int backPay = 0, bool doomed = false)
    {
        var ctx = new EnvoyContext { Self = envoy, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch(), Turn = 1, Seed = 1, Round = 1, BackPay = backPay, EmployerDoomed = doomed };
        return (await new ScriptMind().ReactAsync(ctx, new HostReply { JobOffer = offer }, default)).AcceptJob;
    }

    [Fact]
    public async Task A_script_envoy_owed_back_pay_wants_an_offer_that_makes_it_up_unless_its_lord_looks_doomed()
    {
        // Tempted by half again its wage of 12; owed 60, it wants 60 / 6 = 10 more a season over the new contract.
        var tempted = Envoy(loyalty: 40, ambition: 60);
        Assert.True(await Takes(tempted, 18));
        Assert.False(await Takes(tempted, 27, backPay: 60));
        Assert.True(await Takes(tempted, 28, backPay: 60));
        Assert.True(await Takes(tempted, 18, backPay: 60, doomed: true));

        // Drawn to the host's court for its own wage; owed 60, for 10 more.
        var drawn = Envoy(loyalty: 80, ambition: 30, fondOf: Power.Hatti);
        Assert.True(await Takes(drawn, 12));
        Assert.False(await Takes(drawn, 21, backPay: 60));
        Assert.True(await Takes(drawn, 22, backPay: 60));
        Assert.True(await Takes(drawn, 12, backPay: 60, doomed: true));
    }

    [Fact]
    public void A_court_looks_doomed_once_it_has_lost_its_capital_or_most_of_its_homeland()
    {
        var s = GameFactory.NewGame(3);
        Assert.All(Powers.All, p => Assert.False(Views.LooksDoomed(s.Owner, s.Eliminated, p)));
        var map = WorldMap.Default;
        var owner = new Dictionary<string, Power?>(s.Owner) { [map.Capital(Power.Egypt).Id] = Power.Hatti };
        Assert.True(Views.LooksDoomed(owner, [], Power.Egypt));

        // Half its homeland still holds: not yet; fewer than half: doomed.
        var home = map.HomeOf(Power.Babylonia).Where(x => !x.Capital).ToList();
        var all = home.Count + 1;
        Assert.True(home.Count > all / 2);
        owner = new Dictionary<string, Power?>(s.Owner);
        foreach (var x in home.Take(all / 2)) owner[x.Id] = Power.Assyria;
        Assert.False(Views.LooksDoomed(owner, [], Power.Babylonia));
        foreach (var x in home.Take(all / 2 + 1)) owner[x.Id] = Power.Assyria;
        Assert.True(Views.LooksDoomed(owner, [], Power.Babylonia));
        Assert.True(Views.LooksDoomed(s.Owner, [Power.Mitanni], Power.Mitanni));
    }

    /// <summary>Sends one envoy to Alashiya in the first season, then does nothing.</summary>
    private sealed class Sender(string envoyId) : ISeat
    {
        public string Label => "Sender";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(view.Turn == 1
            ? new TurnSubmission { Orders = [new DispatchOrder(envoyId, Power.Alashiya, "Greetings, brother.")] }
            : new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    /// <summary>Does nothing, every season.</summary>
    private sealed class Idle : ISeat
    {
        public string Label => "Idle";
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => Task.FromResult(new TurnSubmission());
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => Task.FromResult(new HostReply { End = true });
    }

    /// <summary>Script characters that keep every context they are given, with what the envoy was owed then.</summary>
    private sealed class Watching : ICharacterMind
    {
        private readonly ScriptMind _script = new();
        public List<(int BackPay, bool Doomed, int Owed)> Seen { get; } = new();
        public string Label => "Watching";
        public Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct)
        {
            lock (Seen) Seen.Add((ctx.BackPay, ctx.EmployerDoomed, ctx.Self.BackPay.GetValueOrDefault(Power.Egypt)));
            return _script.PresentAsync(ctx, ct);
        }
        public Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct) => _script.ReactAsync(ctx, host, ct);
        public Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct) => _script.WriteAsync(ctx, ct);
    }

    [Fact]
    public async Task The_runner_tells_an_envoy_what_its_lord_owes_it()
    {
        var state = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0, MinTurns = 40 });
        var envoy = state.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var seats = Powers.All.ToDictionary(p => p, p => p == Power.Egypt ? new Sender(envoy.Id) : (ISeat)new Idle());
        var mind = new Watching();
        var runner = new GameRunner(state, seats, mind, new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        for (var i = 0; i < 6 && mind.Seen.Count == 0; i++) await runner.PlayTurnAsync();

        var (backPay, doomed, owed) = Assert.Single(mind.Seen);
        Assert.True(backPay > 0);
        Assert.Equal(owed, backPay);
        Assert.False(doomed);
    }

    [Fact]
    public void A_model_character_reads_the_back_pay_its_lord_owes_it()
    {
        var (_, c) = Owing();
        Assert.Contains("Your lord owes you 45 shekels of back pay, paid when you return to his court.", LlmCharacterMind.Self(c, 2));
        var ctx = new EnvoyContext { Self = c, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch(), Turn = 2, Seed = 1, BackPay = 45 };
        Assert.Contains("and owes you 45 shekels of back pay, which you would never be paid if you left his service", LlmCharacterMind.OfferLine(ctx, 30));

        // Owed nothing, it reads nothing of it.
        c.BackPay.Clear();
        Assert.DoesNotContain("back pay", LlmCharacterMind.Self(c, 2));
        Assert.DoesNotContain("back pay", LlmCharacterMind.OfferLine(new EnvoyContext { Self = c, Sender = Power.Egypt, Host = Power.Hatti, Dispatch = new Dispatch(), Turn = 2, Seed = 1 }, 30));
    }
}
