using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Every order the validator accepts but the season cannot carry out is reported to its king next season, as a
/// rejection notice with the reason in plain words.
/// </summary>
public class ResolutionFailureTests
{
    /// <summary>Babylonia holds Megiddo and Gaza with an army in each, next to Egypt's Sinai, where Egypt has an army too.</summary>
    private static GameState Board(bool sleeping = false)
    {
        var s = GameFactory.NewGame(4, new GameConfig { CatastropheChance = 0, SleepingSeats = sleeping });
        foreach (var (city, id) in new[] { ("megiddo", "u90"), ("gaza", "u91") })
        {
            s.Owner[city] = Power.Babylonia;
            s.Walls.Remove(city);
            s.Units.Add(new Unit { Id = id, Power = Power.Babylonia, Kind = UnitKind.Army, Province = city });
        }
        s.Units.Add(new Unit { Id = "u92", Power = Power.Egypt, Kind = UnitKind.Army, Province = "sinai" });
        return s;
    }

    /// <summary>Egypt's ledger counts 1,000 shekels of gold that was never fine: what it orders passes the check, then cannot be paid.</summary>
    private static void Debased(GameState s)
    {
        s.Treasuries[Power.Egypt].Gold = 0;
        s.Treasuries[Power.Egypt].Lots.Add(new GoldLot { Id = "g900", From = Power.Hatti, Stated = 1000, Face = 1000, True = 0, ArrivedTurn = 1 });
    }

    private static readonly Order[] TakeSinai = [new MoveOrder("megiddo", "sinai"), new SupportOrder("gaza", "megiddo", "sinai")];

    [Theory]
    [InlineData("cession of land lost in battle", "Cession failed", "Sinai was not ceded to Hatti: you no longer held it after movement.", true)]
    [InlineData("cession of land with own troops in it", "Cession failed", "Memphis was not ceded to Hatti: your own troops still stood in it after movement.", false)]
    [InlineData("gift of troops destroyed in battle", "Gift of troops failed", "No unit of yours stood in Sinai after movement, so none was given to Hatti.", false)]
    [InlineData("disband of a unit destroyed in battle", "Disband failed", "No unit of yours stood in Sinai after movement, so none was disbanded.", false)]
    [InlineData("levy in a province not empty", "Levy failed", "No army was raised in Thebes: Thebes was not empty after movement. No gold was paid.", false)]
    [InlineData("levy in land ceded that season", "Levy failed", "No army was raised in Sinai: you ceded Sinai to Hatti last season, before the levy. No gold was paid.", false)]
    [InlineData("levy that cannot be paid", "Not enough gold", "There was not enough gold to pay for a new army in Thebes; none was raised.", true)]
    [InlineData("purchase between rival buyers", "Purchase failed", "The elders of Tyre would not choose between 2 buyers last season. No gold was paid.", true)]
    [InlineData("purchase that cannot be paid", "Not enough gold", "There was not enough gold to pay for the city of Tyre; it was not bought.", true)]
    [InlineData("dispatch that cannot be paid", "Not enough gold", "mission to Hatti; {envoy} stayed at your court.", true)]
    [InlineData("background check that cannot be paid", "Not enough gold", "There was not enough gold to pay for inquiries into {stranger}; none were made.", true)]
    [InlineData("watchmen who cannot be paid", "Not enough gold", "There was not enough gold to pay for watchmen; none were set.", true)]
    [InlineData("assay that cannot be paid", "Not enough gold", "There was not enough gold to pay for an assay; gold lot g901 was not assayed.", true)]
    [InlineData("assay of gold weighed when a payment fell short", "Assay failed", "Gold lot g901 was not assayed: your treasurers had already weighed all your unassayed gold last season, when a payment fell short. No fee was paid.", true)]
    [InlineData("examination that cannot be paid", "Not enough gold", "There was not enough gold to pay for the examination of a tablet; tablet k900 was not examined.", true)]
    [InlineData("forgery that cannot be paid", "Not enough gold", "There was not enough gold to pay for a forger's materials; nothing was forged.", true)]
    [InlineData("forgery by a servant without the skill", "Forgery botched", "{envoy} lacks the skill; the clay is ruined and nothing usable came of it.", false)]
    [InlineData("ransom that cannot be paid", "Not enough gold", "There was not enough gold to pay for the ransom for {envoy}; none was sent.", true)]
    [InlineData("ransom for a captive let go that season", "Ransom not sent", "The ransom for {envoy} could not be sent: {envoy} is no longer held by Hatti.", true)]
    [InlineData("hire below the price", "Not hired", "{stranger} declined your offer of 1 shekels a season: they ask", false)]
    [InlineData("renewal below the price", "Not renewed", "{envoy} will not serve on for 1 shekels a season; they ask", false)]
    [InlineData("captive turned once its king dismissed it", "Captive order failed", "{envoy} serves no king now: nobody is left to deceive. {envoy} remains your captive.", true)]
    public void Every_order_that_fails_as_the_season_resolves_is_reported_with_the_reason(string order, string title, string expected, bool wakes)
    {
        Play(order, title, expected, scheduled: false, wakes);
        // The same order scheduled by a sleeping seat fails the same way, and wakes it with the reason if others foiled it.
        Play(order, title, expected, scheduled: true, wakes);
    }

    /// <summary>
    /// Plays one failing order. Scheduled, the failing king's orders run as a sleeping seat's scheduled orders; the order
    /// that fails is always the last it lists.
    /// </summary>
    private static void Play(string order, string title, string expected, bool scheduled, bool wakes)
    {
        var s = Board(scheduled);
        var e = new TurnEngine(s);
        e.BeginTurn();
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt && c.At == Power.Egypt);
        var stranger = s.Characters.First(c => c.Status == CharacterStatus.Free);
        var who = Power.Egypt;
        var orders = new Dictionary<Power, TurnSubmission>();
        void Egypt(params Order[] o) => orders[Power.Egypt] = new TurnSubmission { Orders = o.ToList() };

        switch (order)
        {
            case "cession of land lost in battle":
                orders[Power.Babylonia] = new() { Orders = [.. TakeSinai] };
                Egypt(new CedeProvinceOrder("sinai", Power.Hatti));
                break;
            case "cession of land with own troops in it":
                Egypt(new CedeProvinceOrder("memphis", Power.Hatti));
                break;
            case "gift of troops destroyed in battle":
                orders[Power.Babylonia] = new() { Orders = [.. TakeSinai] };
                Egypt(new GiftUnitOrder("sinai", Power.Hatti));
                break;
            case "disband of a unit destroyed in battle":
                orders[Power.Babylonia] = new() { Orders = [.. TakeSinai] };
                Egypt(new DisbandOrder("sinai"));
                break;
            case "levy in a province not empty":
                Egypt(new MoveOrder("akhetaten", "thebes"), new RaiseOrder("thebes", UnitKind.Army));
                break;
            case "levy in land ceded that season":
                // Ceded before the levy: the notice says so, not that the land was lost in movement.
                Egypt(new CedeProvinceOrder("sinai", Power.Hatti), new MoveOrder("sinai", "memphis"), new RaiseOrder("sinai", UnitKind.Army));
                s.Units.Single(u => u.Province == "memphis").Province = "thebes";
                break;
            case "levy that cannot be paid":
                Debased(s);
                Egypt(new RaiseOrder("thebes", UnitKind.Army));
                break;
            case "purchase between rival buyers":
                orders[Power.Babylonia] = new() { Orders = [new BuyProvinceOrder("tyre")] };
                Egypt(new BuyProvinceOrder("tyre"));
                break;
            case "purchase that cannot be paid":
                Debased(s);
                Egypt(new BuyProvinceOrder("tyre"));
                break;
            case "dispatch that cannot be paid":
                Debased(s);
                Egypt(new DispatchOrder(envoy.Id, Power.Hatti, "Greetings.", Gold: 50));
                break;
            case "background check that cannot be paid":
                Debased(s);
                Egypt(new BackgroundCheckOrder(stranger.Id, 40));
                break;
            case "watchmen who cannot be paid":
                Debased(s);
                Egypt(new CounterIntelOrder(30));
                break;
            case "assay that cannot be paid":
                Debased(s);
                s.Treasuries[Power.Egypt].Lots.Add(new GoldLot { Id = "g901", From = Power.Hatti, Stated = 40, Face = 40, True = 40, ArrivedTurn = 1 });
                s.Treasuries[Power.Egypt].Gold = 5;
                Egypt(new AssayOrder("g901"));
                break;
            case "assay of gold weighed when a payment fell short":
                // A levy the debased gold cannot pay for: the treasurers weigh all the unassayed gold, the fine lot included.
                Debased(s);
                s.Treasuries[Power.Egypt].Lots.Add(new GoldLot { Id = "g901", From = Power.Hatti, Stated = 40, Face = 40, True = 40, ArrivedTurn = 1 });
                s.Treasuries[Power.Egypt].Gold = 50;
                Egypt(new RaiseOrder("thebes", UnitKind.Army), new AssayOrder("g901"));
                break;
            case "examination that cannot be paid":
                Debased(s);
                s.Tablets.Add(new Tablet { Id = "t900", Text = "Peace.", ProposedBy = Power.Hatti, Partner = Power.Egypt, Seals = [Power.Hatti, Power.Egypt], CreatedTurn = 1, SealedTurn = 1 });
                s.Copies.Add(new TabletCopy { Id = "k900", TabletId = "t900", Holder = Power.Egypt, AcquiredTurn = 1, Source = "sealed at audience" });
                Egypt(new AuthenticateOrder("k900", 40));
                break;
            case "forgery that cannot be paid":
                Debased(s);
                envoy.Traits.Competence = 90;
                Egypt(new ForgeOrder(envoy.Id, "Hatti and Assyria swear to march together.", [Power.Hatti, Power.Assyria]));
                break;
            case "forgery by a servant without the skill":
                envoy.Traits.Competence = 10;
                Egypt(new ForgeOrder(envoy.Id, "Hatti and Assyria swear to march together.", [Power.Hatti, Power.Assyria]));
                break;
            case "ransom that cannot be paid":
            case "ransom for a captive let go that season":
                if (order.StartsWith("ransom that")) Debased(s);
                envoy.Status = CharacterStatus.Captured;
                envoy.HeldBy = Power.Hatti;
                envoy.At = Power.Hatti;
                s.Tasks.Add(new PendingTask { Id = "q900", Kind = TaskKind.RansomDemand, Requester = Power.Egypt, Other = Power.Hatti, CharacterId = envoy.Id, Spend = 60, DueTurn = 5, Announced = true });
                if (order.StartsWith("ransom for")) orders[Power.Hatti] = new() { Orders = [new CaptiveOrder(envoy.Id, CaptiveFate.Release)] };
                Egypt(new PayRansomOrder(envoy.Id));
                break;
            case "hire below the price":
                stranger.At = Power.Egypt;
                Egypt(new HireOrder(stranger.Id, 1));
                break;
            case "renewal below the price":
                Egypt(new RenewOrder(envoy.Id, 1));
                break;
            case "captive turned once its king dismissed it":
                who = Power.Hatti;
                envoy.Status = CharacterStatus.Captured;
                envoy.HeldBy = Power.Hatti;
                envoy.At = Power.Hatti;
                Egypt(new DismissOrder(envoy.Id));
                orders[Power.Hatti] = new() { Orders = [new CaptiveOrder(envoy.Id, CaptiveFate.Turn, Poison: "All is quiet.")] };
                break;
            default:
                throw new ArgumentException(order);
        }

        var mine = orders[who].Orders;
        if (scheduled)
        {
            s.Sleep[who] = new SleepState { Asleep = true, WakeAt = 50, History = [new SleepSpell { From = s.Turn }], Scheduled = [.. mine.Select(o => new PlannedOrder { Turn = s.Turn, Order = o })] };
            orders.Remove(who);
        }
        var valid = e.Resolve(orders);
        Assert.Empty(valid[who].Rejected); // the validator accepted it: the failure came as the season resolved
        var text = expected.Replace("{envoy}", envoy.Name).Replace("{stranger}", stranger.Name);
        var notice = Assert.Single(s.InboxOf(who), i => i.Title == title);
        Assert.Equal(InboxKind.Rejected, notice.Kind);
        Assert.Contains(text, notice.Body);
        Assert.Equal(s.Turn, notice.Turn); // read next season
        if (!scheduled) return;

        var wake = $"orders you scheduled could not be carried out: {mine[^1].Describe()} (";
        if (!wakes)
        {
            // A failure of the seat's own making wakes nobody: it would let a king wake himself with an order he knows will
            // fail. (Troops destroyed in battle wake the seat by themselves, so a disband or gift of them wakes it for that.)
            Assert.DoesNotContain(s.Sleep[who].PendingWake, w => w.StartsWith(wake, StringComparison.Ordinal));
            new TurnEngine(s).BeginTurn();
            new TurnEngine(s).WakeCheck();
            Assert.DoesNotContain(s.Sleep[who].WokenBecause, w => w.StartsWith(wake, StringComparison.Ordinal));
            if (s.Sleep[who].Asleep) Assert.Contains($"an order was refused or failed ({title})", string.Join("\n", s.Sleep[who].Digest));
            else Assert.Contains(s.Sleep[who].WokenBecause, w => w.StartsWith("your army in sinai was destroyed", StringComparison.Ordinal));
            return;
        }
        // The failure wakes the sleeping seat next season, naming the order and why it failed.
        Assert.Contains(s.Sleep[who].PendingWake, w => w.StartsWith(wake, StringComparison.Ordinal) && !w.EndsWith("()", StringComparison.Ordinal));
        new TurnEngine(s).BeginTurn();
        new TurnEngine(s).WakeCheck();
        Assert.False(s.Sleep[who].Asleep);
        Assert.Contains(s.Sleep[who].WokenBecause, w => w.StartsWith(wake, StringComparison.Ordinal));
    }
}
