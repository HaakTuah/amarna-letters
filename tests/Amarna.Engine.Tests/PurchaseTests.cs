using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>A city bought in the season troops take it: nobody pays, every bidder is told, a scheduled bid wakes its seat.</summary>
public class PurchaseTests
{
    /// <summary>Babylonia holds Megiddo and Tyre, with an army in each, ready to storm Gaza's walls.</summary>
    private static GameState Board(GameConfig? config = null)
    {
        var s = GameFactory.NewGame(1, config);
        foreach (var city in new[] { "megiddo", "tyre" })
        {
            s.Owner[city] = Power.Babylonia;
            s.Garrisons.Remove(city);
        }
        s.Units.Add(new Unit { Id = "u90", Power = Power.Babylonia, Kind = UnitKind.Army, Province = "megiddo" });
        s.Units.Add(new Unit { Id = "u91", Power = Power.Babylonia, Kind = UnitKind.Army, Province = "tyre" });
        return s;
    }

    private static readonly TurnSubmission Storm = new() { Orders = [new MoveOrder("megiddo", "gaza"), new SupportOrder("tyre", "megiddo", "gaza")] };

    [Fact]
    public void A_city_taken_by_troops_is_not_sold_and_the_buyer_keeps_its_gold()
    {
        var s = Board();
        var e = new TurnEngine(s);
        e.BeginTurn();
        var gold = s.Treasuries[Power.Egypt].Gold;
        var valid = e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new BuyProvinceOrder("gaza")] },
            [Power.Babylonia] = Storm,
        });

        Assert.Single(valid[Power.Egypt].Accepted);
        Assert.Equal(Power.Babylonia, s.Owner["gaza"]);
        Assert.Equal(gold, s.Treasuries[Power.Egypt].Gold);
        var notice = s.InboxOf(Power.Egypt).Single(i => i.Title == "Purchase failed");
        Assert.Equal(InboxKind.Rejected, notice.Kind);
        Assert.Equal("Gaza was taken by Babylonia's troops last season before its elders could accept your gold. No gold was paid.", notice.Body);
        Assert.Equal(s.Turn, notice.Turn); // read next season
    }

    [Fact]
    public void Every_bidder_is_told_including_the_one_whose_own_troops_took_it()
    {
        var s = Board();
        var e = new TurnEngine(s);
        e.BeginTurn();
        var gold = s.Treasuries.ToDictionary(x => x.Key, x => x.Value.Gold);
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new BuyProvinceOrder("gaza")] },
            [Power.Babylonia] = new() { Orders = [.. Storm.Orders, new BuyProvinceOrder("gaza")] },
        });

        Assert.Equal(Power.Babylonia, s.Owner["gaza"]);
        Assert.Equal("Your own troops took Gaza last season; no gold was paid.", s.InboxOf(Power.Babylonia).Single(i => i.Title == "Purchase failed").Body);
        Assert.Contains("taken by Babylonia's troops", s.InboxOf(Power.Egypt).Single(i => i.Title == "Purchase failed").Body);
        Assert.Equal(gold[Power.Egypt], s.Treasuries[Power.Egypt].Gold);
        Assert.Equal(gold[Power.Babylonia], s.Treasuries[Power.Babylonia].Gold);
    }

    [Fact]
    public void A_scheduled_bid_for_a_city_taken_that_season_wakes_its_seat()
    {
        var s = Board(new GameConfig { SleepingSeats = true });
        s.Sleep[Power.Egypt] = new SleepState
        {
            Asleep = true,
            WakeAt = 50,
            Scheduled = [new ScheduledOrders { Turn = s.Turn, Orders = [new BuyProvinceOrder("gaza")] }],
        };
        var e = new TurnEngine(s);
        e.BeginTurn();
        var gold = s.Treasuries[Power.Egypt].Gold;
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = Storm });

        Assert.Equal(gold, s.Treasuries[Power.Egypt].Gold);
        Assert.Contains(s.Sleep[Power.Egypt].PendingWake, w => w.Contains("buy the city-state of gaza") && w.Contains("Babylonia's troops took it"));
    }
}
