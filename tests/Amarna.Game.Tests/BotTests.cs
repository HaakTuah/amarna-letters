using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class BotTests
{
    [Fact]
    public void Each_king_keeps_his_character_from_game_to_game_but_never_quite_the_same()
    {
        foreach (var p in Powers.All)
        {
            var a = Personality.Archetype(p);
            var games = Enumerable.Range(1, 20).Select(s => ScriptLeader.Temperament(p, (ulong)s)).ToList();
            Assert.All(games, t =>
            {
                Assert.Equal(a.Epithet, t.Epithet);
                Assert.InRange(t.Aggression, a.Aggression - 0.151, a.Aggression + 0.151);
                Assert.InRange(t.Honesty, a.Honesty - 0.151, a.Honesty + 0.151);
                Assert.InRange(t.Commerce, a.Commerce - 0.151, a.Commerce + 0.151);
            });
            Assert.True(games.Select(t => Math.Round(t.Aggression, 3)).Distinct().Count() > 5, $"{p} should vary between games");
            Assert.Equal(games[3], ScriptLeader.Temperament(p, 4));
        }
        // The archetypes are far enough apart to stay recognisable whatever the seed.
        for (ulong s = 1; s <= 20; s++)
        {
            Assert.True(ScriptLeader.Temperament(Power.Hatti, s).Aggression > ScriptLeader.Temperament(Power.Alashiya, s).Aggression);
            Assert.True(ScriptLeader.Temperament(Power.Alashiya, s).Commerce > ScriptLeader.Temperament(Power.Hatti, s).Commerce);
            Assert.True(ScriptLeader.Temperament(Power.Mitanni, s).Honesty > ScriptLeader.Temperament(Power.Assyria, s).Honesty);
        }
    }

    [Fact]
    public async Task The_same_view_gets_the_same_orders()
    {
        var state = GameFactory.NewGame(21);
        foreach (var p in Powers.All)
        {
            var view = Views.For(state, p);
            var first = await new ScriptLeader(21).DecideAsync(view, default);
            var second = await new ScriptLeader(21).DecideAsync(view, default);
            Assert.Equal(Json.Serialize(first), Json.Serialize(second));
            Assert.NotEmpty(first.Orders);
        }
    }

    [Fact]
    public async Task A_king_alone_on_the_new_brain_outgrows_the_same_king_on_the_old_one()
    {
        Func<GameState, GameRunner> Seats(Power? focus) => st =>
        {
            var baseline = new BaselineLeader(st.Seed);
            var seats = Powers.All.ToDictionary(x => x, x => x == focus ? (ISeat)new ScriptLeader(st.Seed) : baseline);
            return new GameRunner(st, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        };
        var gains = new List<double>();
        foreach (var seed in new ulong[] { 2, 3 })
        {
            var all = await BatchRunner.PlayAsync(seed, Seats(null), verifyReplay: false);
            foreach (var p in new[] { Power.Egypt, Power.Assyria, Power.Arzawa })
            {
                var one = await BatchRunner.PlayAsync(seed, Seats(p), verifyReplay: false);
                gains.Add(one.Growth[p] - all.Growth[p]);
            }
        }
        Assert.True(gains.Average() > 0.4, $"average gain {gains.Average():0.00}");
    }

    [Fact]
    public void Faced_with_a_supported_attack_a_king_supports_the_province_under_threat()
    {
        // Mitanni's Terqa borders Assyria's Ashur and Ekallatum: together they can take it unless Washukanni supports it.
        var state = GameFactory.NewGame(4);
        var view = Views.For(state, Power.Mitanni);
        var brain = new Brain(Power.Mitanni, 4);
        brain.Learn(view, new Board(view));
        var assyria = brain.Rel[Power.Assyria];
        assyria.Grudge = 6;
        assyria.Trust = -0.8;
        assyria.LastAttackedUs = view.Turn;
        var board = new Board(view, brain.Remembered(view));

        var plan = Tactics.Make(board, brain);
        Search.Improve(board, brain, plan, brain.R(view.Turn, "search"));

        Assert.Equal(new SupportOrder("washukanni", "terqa"), plan.Orders["washukanni"]);
        Assert.IsNotType<MoveOrder>(plan.Orders["terqa"]);
    }

    [Fact]
    public void A_king_never_marches_on_a_sworn_friend_unless_he_has_decided_to_betray_him()
    {
        // Egypt's Sinai and Gaza are a step from Alashiya's coast by sea; with a treaty in force, no order may enter its land.
        for (ulong seed = 1; seed <= 6; seed++)
        {
            var state = GameFactory.NewGame(seed);
            foreach (var p in Powers.All)
            {
                var view = Views.For(state, p);
                var brain = new Brain(p, seed);
                brain.Learn(view, new Board(view));
                foreach (var r in brain.Rel.Values) { r.Treaty = true; r.Trust = 0.5; }
                var board = new Board(view, brain.Remembered(view));
                var plan = Tactics.Make(board, brain);
                Search.Improve(board, brain, plan, brain.R(view.Turn, "search"));
                foreach (var m in plan.Orders.Values.OfType<MoveOrder>())
                    Assert.True(board.OwnerOf(m.To) is null || board.OwnerOf(m.To) == p, $"{p} moved into {m.To}, held by {board.OwnerOf(m.To)}");
            }
        }
    }

    [Fact]
    public void A_king_who_buys_cities_is_not_taken_for_a_conqueror()
    {
        var s = GameFactory.NewGame(3);
        var brain = new Brain(Power.Hatti, 3);
        var first = Views.For(s, Power.Hatti);
        brain.Learn(first, new Board(first));

        // Egypt buys two cities of the Levant: its land grows by a quarter, its treasury shrinks by as much.
        foreach (var city in new[] { "megiddo", "tyre" })
        {
            s.Owner[city] = Power.Egypt;
            s.Treasuries[Power.Egypt].Gold -= WorldMap.Default[city].Yield * s.Config.NeutralPriceFactor;
        }
        s.Turn = 6;
        var view = Views.For(s, Power.Hatti);
        brain.Learn(view, new Board(view));
        var board = new Board(view, brain.Remembered(view), brain.Treasury);

        Assert.True(board.LandGrowth(Power.Egypt) >= 1.2, "by land alone Egypt would seem to run away with the game");
        Assert.InRange(board.Growth(Power.Egypt), 0.95, 1.15);
        Assert.NotEqual(Power.Egypt, board.Leader());
    }

    [Fact]
    public void Sworn_partners_work_out_the_same_joint_blow_and_the_supporter_gives_the_support()
    {
        // Mitanni (Carchemish) and Egypt (Ugarit) have sworn against Hatti; both stand next to Hatti's Kizzuwatna, which lies empty.
        var s = GameFactory.NewGame(11);
        foreach (var (city, owner) in new[] { ("carchemish", Power.Mitanni), ("ugarit", Power.Egypt) })
        {
            s.Owner[city] = owner;
            s.Garrisons.Remove(city);
        }
        s.Units.RemoveAll(u => u.Province is "kizzuwatna" or "terqa" or "memphis");
        s.Units.Add(new Unit { Id = "u90", Power = Power.Mitanni, Kind = UnitKind.Army, Province = "carchemish" });
        s.Units.Add(new Unit { Id = "u91", Power = Power.Egypt, Kind = UnitKind.Army, Province = "ugarit" });
        s.Tablets.Add(new Tablet
        {
            Id = "t90", Text = "Mitanni and Egypt swear to stand together against Hatti.", ProposedBy = Power.Mitanni, Partner = Power.Egypt,
            Seals = [Power.Mitanni, Power.Egypt], CreatedTurn = 1, SealedTurn = 1,
        });
        foreach (var holder in new[] { Power.Mitanni, Power.Egypt })
            s.Copies.Add(new TabletCopy { Id = $"k9{(int)holder}", TabletId = "t90", Holder = holder, AcquiredTurn = 1, Source = "sealed at audience" });
        s.Turn = 5;

        (Board Board, Brain Brain) Court(Power p)
        {
            var view = Views.For(s, p);
            var brain = new Brain(p, 11);
            brain.Learn(view, new Board(view));
            return (new Board(view, brain.Remembered(view), brain.Treasury), brain);
        }
        var (mb, mitanni) = Court(Power.Mitanni);
        var (eb, egypt) = Court(Power.Egypt);

        var seen = new[] { Tactics.Joints(mb, mitanni), Tactics.Joints(eb, egypt) }
            .Select(js => js.Single(j => j.Target == "kizzuwatna")).ToList();
        Assert.All(seen, j =>
        {
            Assert.Equal(Power.Hatti, j.Against);
            // Mitanni holds less land, so Mitanni goes in and Egypt supports.
            Assert.Equal("carchemish", j.Lead.Province);
            Assert.Equal(["ugarit"], j.Support.Select(u => u.Province));
        });

        var plan = Tactics.Make(eb, egypt);
        Search.Improve(eb, egypt, plan, egypt.R(5, "search"));
        Assert.Equal(new SupportOrder("ugarit", "carchemish", "kizzuwatna"), plan.Orders["ugarit"]);
    }

    [Fact]
    public void A_king_who_seals_a_peace_at_an_audience_keeps_it_that_same_season()
    {
        var s = GameFactory.NewGame(5);
        var court = Views.For(s, Power.Hatti);
        var brain = new Brain(Power.Hatti, 5);
        brain.Learn(court, new Board(court));
        var board = new Board(court, treasuries: brain.Treasury);
        var audience = new AudienceView
        {
            AudienceId = "a1", Turn = 1, Round = 1, MaxRounds = 2, From = Power.Arzawa, Host = Power.Hatti,
            Proposal = new TabletView { Text = "Arzawa and Hatti are brothers. Neither king shall send troops into the lands of the other.", ProposedBy = Power.Arzawa, Partner = Power.Hatti },
        };

        var reply = Statecraft.Host(audience, board, brain, Rng.For(5, 1, "test", "host"));

        Assert.True(reply.SealProposal);
        Assert.True(brain.Rel[Power.Arzawa].Treaty);
        Assert.False(Tactics.Willing(board, brain, Power.Arzawa, board.Leader()));
    }

    [Fact]
    public void Babylon_will_not_call_Assyria_brother()
    {
        for (ulong seed = 1; seed <= 10; seed++)
        {
            var brain = new Brain(Power.Babylonia, seed);
            var greeting = Statecraft.Greet(brain, Power.Assyria);
            Assert.False(greeting.CallBrother);
            Assert.False(greeting.GrantGreatKing);
            Assert.True(Statecraft.Greet(brain, Power.Egypt).CallBrother);
        }
    }
}
