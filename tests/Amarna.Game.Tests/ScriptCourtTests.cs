using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>How a script king keeps its court: servants on notice it renews or lets go.</summary>
public class ScriptCourtTests
{
    private const ulong Seed = 9;

    /// <summary>The most a king of this temperament pays a servant: its hiring test.</summary>
    private static double Limit(Power me) => 15 + 25 * (1 - ScriptLeader.Temperament(me, Seed).Greed);

    /// <summary>A rich court whose first servant has given notice, asking <paramref name="price"/>; <paramref name="extra"/> more servants at court.</summary>
    private static (GameState S, Character OnNotice) Court(Power me, int? price, int extra = 0)
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 8;
        s.Treasuries[me].Gold = 5000;
        var c = s.Characters.First(x => x.Employer == me);
        c.Contract = new Contract { Wage = 10, StartTurn = 1, UntilTurn = 7, NoticePrice = price, LeavesTurn = price is null ? null : 9 };
        if (price is null) c.Contract.UntilTurn = 12;
        foreach (var more in s.Characters.Where(x => x.Status == CharacterStatus.Free).Take(extra))
        {
            more.Status = CharacterStatus.Employed;
            more.Employer = me;
            more.At = me;
            more.Contract = new Contract { Wage = 10, StartTurn = 1, UntilTurn = 20 };
        }
        return (s, c);
    }

    private static async Task<List<RenewOrder>> Renewals(GameState s, Power me) =>
        (await new ScriptLeader(Seed).DecideAsync(Views.For(s, me), default)).Orders.OfType<RenewOrder>().ToList();

    [Theory]
    [InlineData(Power.Egypt)]
    [InlineData(Power.Babylonia)]
    [InlineData(Power.Alashiya)]
    public async Task A_script_king_renews_a_servant_on_notice_it_still_wants_at_a_price_it_would_pay(Power me)
    {
        var price = (int)Math.Floor(Limit(me));
        var (s, c) = Court(me, price);
        Assert.Equal(new[] { new RenewOrder(c.Id, price, 6) }, await Renewals(s, me));

        // A price above what its greed allows: it lets the servant go.
        (s, _) = Court(me, price + 1);
        Assert.Empty(await Renewals(s, me));
    }

    [Fact]
    public async Task A_script_king_lets_a_servant_on_notice_go_when_its_court_is_big_enough_and_never_renews_early()
    {
        // Four others at court: as many as any script king wants.
        var (s, _) = Court(Power.Egypt, 10, extra: 3);
        Assert.Empty(await Renewals(s, Power.Egypt));

        (s, _) = Court(Power.Egypt, null);
        Assert.Empty(await Renewals(s, Power.Egypt));
    }

    /// <summary>
    /// Egypt's court, as Egypt sees it: one envoy whose line reads "has not returned from Hatti" (it went over to Hatti, as
    /// Egypt does not know), and one at court whose wage is so high that Egypt wants no third servant.
    /// </summary>
    private static (GameState S, Character Gone) Missing()
    {
        var s = GameFactory.NewGame(11);
        s.Treasuries[Power.Egypt].Gold = 10000;
        var servants = s.Characters.Where(c => c.Employer == Power.Egypt).ToList();
        var gone = servants[0];
        gone.Covers.Add(new Cover { For = Power.Egypt, Since = 2, Believed = Duty.Detained, DutyText = "has not returned from Hatti", WhereText = "unknown", Wage = 12, ContractUntil = 20 });
        gone.Employer = Power.Hatti;
        gone.At = Power.Hatti;
        servants[1].Contract = new Contract { Wage = 500, StartTurn = 1, UntilTurn = 30 };
        return (s, gone);
    }

    [Fact]
    public async Task A_script_king_dismisses_a_servant_that_has_not_returned_for_three_seasons_and_looks_for_another()
    {
        var (s, gone) = Missing();
        var king = new ScriptLeader(11);
        for (var turn = 5; turn <= 8; turn++)
        {
            s.Turn = turn;
            var orders = (await king.DecideAsync(Views.For(s, Power.Egypt), default)).Orders;
            // Read so in seasons 5, 6 and 7; given up in the fourth season it still reads so.
            Assert.Equal(turn == 8, orders.Contains(new DismissOrder(gone.Id)));
            // The court counts itself one short only once it has given the servant up.
            Assert.Equal(turn == 8, orders.OfType<SeekCandidatesOrder>().Any());
            Assert.DoesNotContain(orders, o => o is not DismissOrder && OrderKeys.CharacterOf(o) == gone.Id);
        }
    }

    [Fact]
    public async Task A_script_king_keeps_a_servant_that_comes_home_before_it_is_given_up()
    {
        var (s, gone) = Missing();
        var king = new ScriptLeader(11);
        for (var turn = 5; turn <= 9; turn++)
        {
            s.Turn = turn;
            if (turn == 7)
            {
                // Home after two seasons of "has not returned", and away again on an errand for two more.
                gone.Covers.Clear();
                gone.Employer = Power.Egypt;
                gone.At = null;
                gone.Duty = Duty.EnvoyOutbound;
                gone.MissionTarget = Power.Babylonia;
            }
            var orders = (await king.DecideAsync(Views.For(s, Power.Egypt), default)).Orders;
            Assert.DoesNotContain(new DismissOrder(gone.Id), orders);
        }
    }

    [Fact]
    public async Task Script_games_with_notices_and_renewals_replay_exactly()
    {
        // Twenty seasons: every starting term ends by turn 13, so notices are given and answered.
        var config = new GameConfig { MinTurns = 20, EndChance = 1.0 };
        var runner = new GameRunner(GameFactory.NewGame(Seed, config), Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(Seed)), new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        while (await runner.PlayTurnAsync()) { }
        Assert.Equal(20, runner.State.Scores.Max(x => x.Turn));
        Assert.Contains(runner.State.Inbox.Values.SelectMany(x => x), i => i.Title == "A servant gives notice");
        var renewals = runner.Log.Decisions.Where(d => d.Key.Contains("/orders/")).Select(d => Json.Deserialize<TurnSubmission>(d.Json)).SelectMany(x => x.Orders.OfType<RenewOrder>()).ToList();
        Assert.NotEmpty(renewals);

        var replay = GameRunner.ForReplay(GameLog.FromJsonl(runner.Log.ToJsonl()));
        replay.WriteChronicles = false;
        await replay.PrepareAsync();
        while (await replay.PlayTurnAsync()) { }
        Assert.Equal(Json.Hash(runner.State), Json.Hash(replay.State));
    }
}
