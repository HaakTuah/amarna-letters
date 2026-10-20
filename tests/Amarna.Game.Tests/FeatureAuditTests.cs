using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// The feature audit of the fix pass after item 4 ("Every feature is every seat's"): the features script kings never
/// used, or used without success, and how they use them now.
/// </summary>
public class FeatureAuditTests
{
    private const ulong Seed = 9;

    private static Brain BrainFor(GameState s, Power me, Personality? p = null)
    {
        var v = Views.For(s, me);
        var brain = p is null ? new Brain(me, Seed) : new Brain(me, Seed, p);
        brain.Learn(v, new Board(v));
        return brain;
    }

    /// <summary>A tablet two kings sealed, with a copy in the first one's archive: a treaty (or an alliance), so the two are friends.</summary>
    private static void Treaty(GameState s, Power a, Power b, bool alliance = false)
    {
        var t = new Tablet
        {
            Id = s.NewId("t"), Text = alliance ? Statecraft.AllianceTablet(a, b) : Statecraft.PeaceTablet(a, b), ProposedBy = a, Partner = b,
            Seals = [a, b], CreatedTurn = 1, SealedTurn = 1, AllianceOath = alliance,
        };
        s.Tablets.Add(t);
        s.Copies.Add(new TabletCopy { Id = s.NewId("k"), TabletId = t.Id, Holder = a, AcquiredTurn = 1, Source = "sealed at audience" });
    }

    /// <summary>An inventory of gold <paramref name="from"/> sent, stating <paramref name="stated"/> shekels, in the receiver's archive.</summary>
    private static TabletCopy Inventory(GameState s, Power from, Power to, int stated, bool forged)
    {
        var t = new Tablet
        {
            Id = s.NewId("t"), Text = $"The inventory of the gold {from} sends to {to}: {Money.Format(stated)}.", ProposedBy = from, Seals = [from],
            CreatedTurn = 2, SealedTurn = 2, Inventory = true, Forged = forged, ForgerSkill = forged ? 60 : 0,
        };
        s.Tablets.Add(t);
        var copy = new TabletCopy { Id = s.NewId("k"), TabletId = t.Id, Holder = to, AcquiredTurn = 3, Source = $"the inventory brought by Mane, envoy of {from}" };
        s.Copies.Add(copy);
        return copy;
    }

    private static void Add(GameState s, Power p, UnitKind kind, string province) =>
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = p, Kind = kind, Province = province });

    // ------------------------------------------------------------------ inventories and thieves

    [Fact]
    public async Task A_script_king_examines_an_inventory_that_weighed_light_and_spends_more_on_it()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        s.Treasuries[Power.Egypt].Gold = 5000;
        // Lots kings send come in round sums: these stop short of one, as a skimmer's forged inventory does.
        var light = Enumerable.Range(0, 10).Select(i => Inventory(s, Power.Hatti, Power.Egypt, 17 + 10 * i, forged: true).Id).ToHashSet();
        var sub = await new ScriptLeader(Seed).DecideAsync(Views.For(s, Power.Egypt), default);
        // One examination a season, of an inventory that weighed light, with 40 shekels more than for a tablet shown.
        var exam = Assert.Single(sub.Orders.OfType<AuthenticateOrder>());
        Assert.Contains(exam.Copy, light);
        Assert.Equal((int)(30 + 50 * ScriptLeader.Temperament(Power.Egypt, Seed).Caution) + 40, exam.Spend);
        Assert.Contains(exam, new OrderValidator(s).Validate(Power.Egypt, sub).Accepted);
    }

    [Fact]
    public async Task A_script_king_lets_go_a_servant_exposed_as_a_thief_once_it_is_at_court()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        s.Treasuries[Power.Egypt].Gold = 5000;
        var servants = s.Characters.Where(c => c.Employer == Power.Egypt).ToList();
        servants[0].Facts.Add(new Fact { Id = s.NewId("f"), Text = "Exposed as the forger of an inventory of gold bearing the seal of Egypt.", Secrecy = Secrecy.Public, Tag = "forger" });
        var orders = (await new ScriptLeader(Seed).DecideAsync(Views.For(s, Power.Egypt), default)).Orders;
        Assert.Contains(new DismissOrder(servants[0].Id), orders);
        Assert.DoesNotContain(new DismissOrder(servants[1].Id), orders);
        Assert.DoesNotContain(orders, o => o is not DismissOrder && OrderKeys.CharacterOf(o) == servants[0].Id);
    }

    [Fact]
    public async Task A_lot_brought_home_lighter_than_its_inventory_marks_the_envoy_as_a_thief()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        s.Treasuries[Power.Egypt].Gold = 5000;
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        s.Notify(Power.Egypt, InboxKind.EnvoyReport, $"{envoy.Name} returns",
            "My lord, I have returned from the court of Hatti.\n\n[The inventory lists 45 shekels of gold; your weighers found 40 shekels.]", envoy.Id);
        var orders = (await new ScriptLeader(Seed).DecideAsync(Views.For(s, Power.Egypt), default)).Orders;
        Assert.Contains(new DismissOrder(envoy.Id), orders);

        // A lot that weighed what its inventory said marks nobody.
        s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        s.Treasuries[Power.Egypt].Gold = 5000;
        envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        s.Notify(Power.Egypt, InboxKind.EnvoyReport, $"{envoy.Name} returns",
            "My lord, I have returned from the court of Hatti.\n\n[The inventory lists 40 shekels of gold; your weighers found 40 shekels.]", envoy.Id);
        Assert.DoesNotContain(new DismissOrder(envoy.Id), (await new ScriptLeader(Seed).DecideAsync(Views.For(s, Power.Egypt), default)).Orders);
    }

    [Fact]
    public void A_script_king_remembers_a_hand_that_botched_a_forgery_and_people_held_elsewhere()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 4;
        var forger = s.Characters.First(c => c.Employer == Power.Hatti);
        var held = s.Characters.First(c => c.Status == CharacterStatus.Free);
        s.Notify(Power.Hatti, InboxKind.Rejected, "Forgery botched", $"{forger.Name} lacks the skill; the clay is ruined and nothing usable came of it.", forger.Id);
        s.Notify(Power.Hatti, InboxKind.Rejected, "Orders that could not be carried out",
            $"- hire {held.Id} at 20 a season: {held.Name} is held at the court of Assyria and cannot come to yours");
        var brain = BrainFor(s, Power.Hatti);
        Assert.Contains(forger.Id, brain.NoHand);
        Assert.Contains(held.Id, brain.HeldElsewhere);
    }

    // ------------------------------------------------------------------ troops and land

    [Fact]
    public void A_unit_that_must_go_is_given_to_a_friend_next_to_it_but_never_one_in_our_own_land()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 5;
        s.Treasuries[Power.Egypt].Gold = 0;
        Treaty(s, Power.Egypt, Power.Alashiya);
        Add(s, Power.Egypt, UnitKind.Army, "thebes");
        Add(s, Power.Egypt, UnitKind.Army, "sinai");
        // A fleet at sea next to Enkomi, Alashiya's: upkeep the treasury cannot carry.
        Add(s, Power.Egypt, UnitKind.Fleet, "levantsea");
        // And Alashiya's land next to Sinai too.
        s.Owner["gaza"] = Power.Alashiya;
        s.Walls.Remove("gaza");

        var (plan, _) = Economy(s, Power.Egypt);
        Assert.Equal(new GiftUnitOrder("levantsea", Power.Alashiya), plan.Orders["levantsea"]);
        Assert.DoesNotContain(plan.Orders.Values, o => o is GiftUnitOrder g && g.Unit != "levantsea");

        // Without the fleet at sea, and with wages the treasury cannot carry, the unit that goes stands in Egypt's own land,
        // next to Alashiya's Gaza: it is disbanded, since a friend's army standing in Sinai would take Sinai with it.
        s.Units.RemoveAll(u => u.Province == "levantsea");
        foreach (var c in s.Characters.Where(c => c.Employer == Power.Egypt)) c.Contract!.Wage = 40;
        (plan, _) = Economy(s, Power.Egypt);
        Assert.Equal(new DisbandOrder("sinai"), plan.Orders["sinai"]);
        Assert.DoesNotContain(plan.Orders.Values, o => o is GiftUnitOrder);
    }

    /// <summary>The treasury step of a script king of <paramref name="me"/>, with every unit holding.</summary>
    private static (MilitaryPlan Plan, List<Order> Orders) Economy(GameState s, Power me, Action<Brain>? prepare = null)
    {
        var v = Views.For(s, me);
        var brain = BrainFor(s, me);
        prepare?.Invoke(brain);
        var board = new Board(v, brain.Remembered(v), brain.Treasury);
        var plan = new MilitaryPlan();
        foreach (var u in board.Mine)
        {
            plan.Orders[u.Province] = new HoldOrder(u.Province);
            plan.Role[u.Province] = "hold";
        }
        var orders = new List<Order>();
        Statecraft.Economy(board, brain, plan, orders, Rng.For(Seed, s.Turn, "test", "economy"));
        return (plan, orders);
    }

    [Fact]
    public void Land_a_king_cannot_keep_is_ceded_to_a_friend_before_a_rival_ahead_of_it_takes_it()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        // Egypt holds Qadesh, far from its troops. Hatti, hostile and well ahead, stands next to it; so does Mitanni, a friend.
        s.Owner["qadesh"] = Power.Egypt;
        s.Walls.Remove("qadesh");
        foreach (var x in new[] { "isuwa", "ugarit", "carchemish" })
        {
            s.Owner[x] = Power.Hatti;
            s.Walls.Remove(x);
        }
        Add(s, Power.Hatti, UnitKind.Army, "carchemish");
        Add(s, Power.Mitanni, UnitKind.Army, "mari");
        Treaty(s, Power.Egypt, Power.Mitanni);

        var (_, orders) = Economy(s, Power.Egypt, brain => brain.Rel[Power.Hatti].Grudge = 5);
        Assert.Contains(new CedeProvinceOrder("qadesh", Power.Mitanni), orders);

        // Land a friend ceded to it is kept, not passed on: the friend's word of it is remembered, with gratitude.
        s.Notify(Power.Egypt, InboxKind.Resolution, "Land received", "Mitanni has ceded Qadesh to you.");
        (_, orders) = Economy(s, Power.Egypt, brain =>
        {
            brain.Rel[Power.Hatti].Grudge = 5;
            Assert.Contains("qadesh", brain.Received);
            Assert.True(brain.Rel[Power.Mitanni].Trust >= 0.3);
        });
        Assert.DoesNotContain(orders, o => o is CedeProvinceOrder);

        // Without a rival near it there is nothing to deny: it is kept.
        s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        s.Owner["qadesh"] = Power.Egypt;
        s.Walls.Remove("qadesh");
        Add(s, Power.Mitanni, UnitKind.Army, "mari");
        Treaty(s, Power.Egypt, Power.Mitanni);
        (_, orders) = Economy(s, Power.Egypt, brain => brain.Rel[Power.Hatti].Grudge = 5);
        Assert.DoesNotContain(orders, o => o is CedeProvinceOrder);
    }

    /// <summary>
    /// Alashiya alone on the map: an army on Tamassos and a fleet, with Lukka a free city whose walls are down; late enough
    /// that the troops every court saw at the start are out of mind.
    /// </summary>
    private static GameState Island(string fleetAt)
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        s.Units.Clear();
        Add(s, Power.Alashiya, UnitKind.Army, "tamassos");
        Add(s, Power.Alashiya, UnitKind.Fleet, fleetAt);
        s.Walls.Remove("lukka");
        return s;
    }

    [Fact]
    public async Task An_army_with_nothing_to_take_by_land_is_carried_over_the_sea()
    {
        // The fleet is at sea next to the army's coast: the army is convoyed to the empty coast beyond.
        var s = Island("greatgreen");
        var orders = (await new ScriptLeader(Seed).DecideAsync(Views.For(s, Power.Alashiya), default)).Orders;
        var convoy = Assert.Single(orders.OfType<ConvoyOrder>());
        Assert.Equal(("greatgreen", "tamassos"), (convoy.Unit, convoy.Army));
        Assert.Contains(new MoveOrder("tamassos", convoy.To), orders);

        // The fleet is in port: it puts to sea next to the army's coast first, ready to carry it.
        s = Island("enkomi");
        orders = (await new ScriptLeader(Seed).DecideAsync(Views.For(s, Power.Alashiya), default)).Orders;
        Assert.Contains(new MoveOrder("enkomi", "cilicia"), orders);
        Assert.Empty(orders.OfType<ConvoyOrder>());
    }

    // ------------------------------------------------------------------ spies, captives, held envoys

    [Fact]
    public async Task A_spy_watching_a_court_that_has_fallen_is_recalled()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 8;
        s.Treasuries[Power.Egypt].Gold = 5000;
        var spy = s.Characters.First(c => c.Employer == Power.Egypt);
        spy.Duty = Duty.SpyPosted;
        spy.MissionTarget = Power.Assyria;
        spy.At = Power.Assyria;
        var king = new ScriptLeader(Seed);
        Assert.DoesNotContain(new RecallSpyOrder(spy.Id), (await king.DecideAsync(Views.For(s, Power.Egypt), default)).Orders);

        s.Turn = 9;
        s.Eliminated.Add(Power.Assyria);
        var sub = await king.DecideAsync(Views.For(s, Power.Egypt), default);
        Assert.Contains(new RecallSpyOrder(spy.Id), sub.Orders);
        Assert.Contains(new RecallSpyOrder(spy.Id), new OrderValidator(s).Validate(Power.Egypt, sub).Accepted);
    }

    [Fact]
    public async Task A_captive_nobody_will_pay_for_goes_free_unless_the_captor_is_vengeful()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 6;
        var spy = s.Characters.First(c => c.Employer == Power.Hatti);
        spy.Status = CharacterStatus.Captured;
        spy.HeldBy = Power.Mitanni;
        spy.At = Power.Mitanni;
        spy.Duty = Duty.None;
        s.Notify(Power.Mitanni, InboxKind.Rejected, "Orders that could not be carried out",
            $"- ransom the captive {spy.Id}: Hatti's kingdom has fallen: nobody is left to pay. {spy.Name} remains your captive");
        var orders = (await new ScriptLeader(Seed).DecideAsync(Views.For(s, Power.Mitanni), default)).Orders;
        var fate = Assert.Single(orders.OfType<CaptiveOrder>()).Fate;
        Assert.Equal(ScriptLeader.Temperament(Power.Mitanni, Seed).Vengeance > 0.75 ? CaptiveFate.Execute : CaptiveFate.Release, fate);
    }

    [Fact]
    public async Task A_held_envoy_whose_king_is_gone_is_let_go_like_any_other()
    {
        var s = GameFactory.NewGame(Seed);
        var held = s.Characters.First(c => c.Status == CharacterStatus.Free);
        held.HeldBy = Power.Egypt;
        held.At = Power.Egypt;
        var king = new ScriptLeader(Seed);
        var wait = (int)Math.Round(1 + 3 * ScriptLeader.Temperament(Power.Egypt, Seed).Vengeance);
        s.Turn = 3;
        Assert.DoesNotContain((await king.DecideAsync(Views.For(s, Power.Egypt), default)).Orders, o => o is ReleaseOrder);
        s.Turn = 3 + wait;
        Assert.Contains((await king.DecideAsync(Views.For(s, Power.Egypt), default)).Orders, o => o is ReleaseOrder r && r.Character == held.Id);
    }

    [Fact]
    public void A_careful_rich_king_pays_watchmen_only_when_spies_are_likely_to_come()
    {
        // Egypt at its starting strength, leading nobody; its spare gold set high.
        var s = GameFactory.NewGame(Seed);
        s.Turn = 8;
        List<Order> Court(Action<Brain> prepare)
        {
            var v = Views.For(s, Power.Egypt);
            var brain = BrainFor(s, Power.Egypt, Personality.Archetype(Power.Egypt) with { Caution = 0.9 });
            brain.SpareGold = 1000;
            prepare(brain);
            var orders = new List<Order>();
            Statecraft.Court(new Board(v, brain.Remembered(v), brain.Treasury), brain, orders, new HashSet<string>(), Rng.For(Seed, 8, "test", "court"));
            return orders;
        }
        Assert.DoesNotContain(Court(_ => { }), o => o is CounterIntelOrder);
        // A king that attacked us lately may send a spy after his troops.
        Assert.Contains(Court(brain => brain.Rel[Power.Hatti].LastAttackedUs = 7), o => o is CounterIntelOrder);
    }

    // ------------------------------------------------------------------ audiences

    private static (AudienceView View, Board Board, Brain Brain) Audience(Personality? p = null, Action<AudienceView>? shape = null)
    {
        var s = GameFactory.NewGame(5);
        var court = Views.For(s, Power.Hatti);
        var brain = p is null ? new Brain(Power.Hatti, 5) : new Brain(Power.Hatti, 5, p);
        brain.Learn(court, new Board(court));
        brain.SpareGold = 500;
        var view = new AudienceView { AudienceId = "a1", Turn = 1, Round = 1, MaxRounds = 2, From = Power.Arzawa, Host = Power.Hatti, Spoken = "Great King, I bring the words of my lord." };
        shape?.Invoke(view);
        return (view, new Board(court, treasuries: brain.Treasury), brain);
    }

    [Fact]
    public void A_host_whose_gift_was_refused_offers_half_as_much_again_in_a_second_exchange()
    {
        var cunning = Personality.Archetype(Power.Hatti) with { Cunning = 1 };
        // The gift is a matter of chance: the first roll that brings one.
        var a = Audience(cunning);
        var first = Statecraft.Host(a.View, a.Board, a.Brain, Rng.For(5, 1, "test", "host0"));
        for (var k = 1; first.Bribe == 0; k++)
        {
            a = Audience(cunning);
            first = Statecraft.Host(a.View, a.Board, a.Brain, Rng.For(5, 1, "test", $"host{k}"));
        }
        Assert.False(first.End);

        var refused = new AudienceView { AudienceId = "a1", Turn = 1, Round = 2, MaxRounds = 2, From = Power.Arzawa, Host = Power.Hatti };
        var second = Statecraft.Host(refused, a.Board, a.Brain, Rng.For(5, 1, "test", "round2"));
        Assert.True(second.End);
        Assert.Equal((int)Math.Round(first.Bribe * 1.5 / 10) * 10, second.Bribe);
        Assert.Equal(first.BribeAsk, second.BribeAsk);
        // Asked once: a third offer is never made.
        Assert.Equal(0, Statecraft.Host(refused, a.Board, a.Brain, Rng.For(5, 1, "test", "round2")).Bribe);
    }

    [Fact]
    public async Task A_host_sealing_an_alliance_asks_the_envoy_to_swear_and_a_script_envoy_gives_its_word()
    {
        var (view, board, brain) = Audience(shape: v => v.Proposal = new TabletView { Text = Statecraft.AllianceTablet(Power.Arzawa, Power.Hatti), ProposedBy = Power.Arzawa, Partner = Power.Hatti, AllianceOath = true });
        var reply = Statecraft.Host(view, board, brain, Rng.For(5, 1, "test", "host"));
        Assert.True(reply.SealProposal);
        Assert.Contains("Swear to me that your lord's troops will stand with mine", reply.Speech);

        var s = GameFactory.NewGame(5);
        var envoy = s.Characters.First(c => c.Employer == Power.Arzawa);
        var ctx = new EnvoyContext
        {
            Self = envoy, Sender = Power.Arzawa, Host = Power.Hatti, Turn = 1, Seed = 5, Round = 1, MaxRounds = 2,
            Dispatch = new Dispatch { Letter = "Let us swear alliance.", Mandate = "You may swear a full alliance. Promise no land." },
        };
        var reaction = await new ScriptMind().ReactAsync(ctx, reply, default);
        Assert.NotEqual("", reaction.Commitments);
    }

    [Fact]
    public void A_host_reads_a_humble_greeting_kindly_and_a_planted_envoys_true_orders_darkly()
    {
        double Trust(Action<AudienceView> shape)
        {
            var (view, board, brain) = Audience(shape: shape);
            Statecraft.Host(view, board, brain, Rng.For(5, 1, "test", "host"));
            return brain.Rel[Power.Arzawa].Trust;
        }
        var plain = Trust(_ => { });
        Assert.True(Trust(v => v.GreetingDeviations = ["the sender does not claim to be a Great King"]) > plain);
        Assert.True(Trust(v => { v.SecretMandate = "Speak only of friendship. Promise nothing."; v.SecretLetter = "Why should there be anything but friendship between us?"; }) < plain - 0.25);
    }

    // ------------------------------------------------------------------ letters

    [Fact]
    public void A_proud_king_writes_no_greeting_to_an_oath_breaker_and_a_modest_one_sends_tribute_humbly()
    {
        var s = GameFactory.NewGame(Seed);
        var proud = BrainFor(s, Power.Babylonia, Personality.Archetype(Power.Babylonia) with { Pride = 0.9 });
        Assert.False(Statecraft.Greet(proud, Power.Hatti).Omit);
        proud.Rel[Power.Hatti].OathsBroken = 1;
        proud.Rel[Power.Hatti].Grudge = 5;
        Assert.True(Statecraft.Greet(proud, Power.Hatti).Omit);

        var modest = BrainFor(s, Power.Alashiya, Personality.Archetype(Power.Alashiya) with { Pride = 0.3 });
        Assert.False(Statecraft.Greet(modest, Power.Egypt, humble: true).ClaimGreatKing);
        Assert.True(Statecraft.Greet(modest, Power.Egypt).ClaimGreatKing);
        Assert.True(Statecraft.Greet(proud, Power.Egypt, humble: true).ClaimGreatKing);
    }

    [Fact]
    public void A_grievance_backed_by_strength_threatens_war_in_words_a_timid_envoy_would_drop()
    {
        Assert.True(TextKit.IsThreatTo("If you do not withdraw, my troops will march into your land.", Power.Hatti, Power.Egypt));
    }

    [Fact]
    public void A_faithless_king_debases_only_the_gold_it_sends_a_friend_who_trusts_it()
    {
        var s = GameFactory.NewGame(Seed);
        s.Turn = 5;
        s.Treasuries[Power.Alashiya].Gold = 3000;
        var faithless = Personality.Archetype(Power.Alashiya) with { Honesty = 0.1, Generosity = 1, Diplomacy = 1 };
        List<DispatchOrder> Letters(Action<Brain> prepare, int k)
        {
            var v = Views.For(s, Power.Alashiya);
            var brain = BrainFor(s, Power.Alashiya, faithless);
            brain.SpareGold = 1000;
            prepare(brain);
            var orders = new List<Order>();
            Statecraft.Letters(new Board(v, brain.Remembered(v), brain.Treasury), brain, orders, new HashSet<string>(), Rng.For(Seed, 5, "test", $"letters{k}"));
            return orders.OfType<DispatchOrder>().ToList();
        }
        // Peace letters with gold, to neighbours that have sealed nothing with it: fine gold.
        var peace = Enumerable.Range(0, 10).SelectMany(k => Letters(_ => { }, k)).Where(d => d.Gold > 0).ToList();
        Assert.NotEmpty(peace);
        Assert.All(peace, d => Assert.Equal(100, d.PurityPercent));

        // A gift to an ally that trusts it may be debased. (Sworn to every other king too, it owes nobody a peace letter,
        // which would carry the season's one gift of gold first.)
        Treaty(s, Power.Alashiya, Power.Egypt, alliance: true);
        foreach (var x in Powers.All.Where(x => x is not (Power.Alashiya or Power.Egypt))) Treaty(s, Power.Alashiya, x);
        var gifts = Enumerable.Range(0, 30).SelectMany(k => Letters(b => b.Rel[Power.Egypt].Trust = 0.6, k)).Where(d => d.To == Power.Egypt && d.Gold > 0).ToList();
        Assert.Contains(gifts, d => d.PurityPercent < 100);
    }
}
