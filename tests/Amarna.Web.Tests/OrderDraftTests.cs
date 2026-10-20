using Amarna.Engine;
using Amarna.Web.Components;

namespace Amarna.Web.Tests;

/// <summary>
/// A human seat's orders as the orders panel writes them: standing orders, which every seat may keep (the additions to the
/// fix pass after item 4), go with the season's orders, and so do the ids of those it cancels.
/// </summary>
public class OrderDraftTests
{
    [Fact]
    public void A_human_seat_s_draft_carries_its_new_standing_orders_and_the_ones_it_cancels()
    {
        var s = GameFactory.NewGame(31);
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Babylonia] = new()
            {
                Standing =
                [
                    new StandingRequest { When = StandingWhen.UnitAttacked, Province = "sippar", Orders = [new SupportOrder("durkurigalzu", "sippar")] },
                    new StandingRequest { When = StandingWhen.UnitEnters, Power = Power.Assyria, Province = "nippur", Orders = [new MoveOrder("babylon", "nippur")] },
                ],
            },
        });
        var view = Views.For(s, Power.Babylonia);
        Assert.Equal(["s1", "s2"], view.Standing.Select(x => x.Id));

        var draft = new OrderDraft(view);
        draft.CancelStanding.Add("s2");
        draft.CancelStanding.Add("s9");
        var support = OrderDraft.UnitOrder("babylon", "support", "sippar", "");
        Assert.Equal(new SupportOrder("babylon", "sippar"), support);
        Assert.Null(OrderDraft.UnitOrder("babylon", "move", "", ""));
        draft.Standing.Add(new StandingRequest { When = StandingWhen.UnitEnters, Province = "ur", Orders = [OrderDraft.UnitOrder("babylon", "move", "nippur", null)!] });
        var sub = draft.Build();
        // Only ids the seat holds are cancelled; the new standing order goes as written.
        Assert.Equal(["s2"], sub.CancelStanding);
        var given = Assert.Single(sub.Standing);
        Assert.Equal((StandingWhen.UnitEnters, "ur", (Power?)null), (given.When, given.Province, given.Power));
        Assert.Equal([new MoveOrder("babylon", "nippur")], given.Orders);
        Assert.Equal("when Assyria's troops enter Nippur", OrderDraft.When(StandingWhen.UnitEnters, Power.Assyria, "nippur", Power.Babylonia));
        Assert.Equal("when your troop in Sippar is attacked", OrderDraft.When(StandingWhen.UnitAttacked, null, "sippar", Power.Babylonia));

        // The engine keeps the human seat's new standing order and drops the one it cancelled.
        e = new TurnEngine(s);
        e.BeginTurn();
        e.WakeCheck();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = sub });
        Assert.Equal(["s1", "s3"], s.Standing[Power.Babylonia].Orders.Select(x => x.Id));
    }

    [Fact]
    public void A_human_seat_besieges_a_city_its_army_stands_within()
    {
        // The siege package (Build order item 5): the orders panel offers Besiege to an army within walls the seat does not hold.
        var s = GameFactory.NewGame(31);
        s.Units.First(u => u.Province == "sippar").Province = "mari";
        var draft = new OrderDraft(Views.For(s, Power.Babylonia));
        draft.Units["mari"].Kind = "besiege";
        draft.Other.Add(new FortifyOrder("nippur"));
        var sub = draft.Build();
        Assert.Contains(new BesiegeOrder("mari"), sub.Orders);
        Assert.Contains(new FortifyOrder("nippur"), sub.Orders);
        Assert.Empty(new OrderValidator(s).Validate(Power.Babylonia, sub).Rejected);
    }
}
