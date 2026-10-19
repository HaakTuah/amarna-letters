using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Inventory tablets, and an envoy who skimmed swapping the inventory for a forgery stating less.</summary>
public class InventoryTests
{
    /// <summary>Egypt's envoy, of the given skill, stands before Alashiya's king with 100 shekels of fine gold.</summary>
    private static (GameState S, TurnEngine E, Character Envoy, PendingAudience A) AtAudience(int competence)
    {
        var s = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0 });
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        envoy.Traits.Competence = competence;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Alashiya, "Greetings, brother.", Gold: 100)] } });
        while (s.Audiences.Count == 0)
        {
            e = new TurnEngine(s);
            e.BeginTurn();
            if (s.Audiences.Count == 0) e.Resolve(new Dictionary<Power, TurnSubmission>());
        }
        return (s, e, envoy, s.Audiences.Single());
    }

    private static AudienceRecord Record(PendingAudience a, int skim, bool swap, HostReply? host = null) => new()
    {
        AudienceId = a.Id,
        Delivered = "Greetings.",
        Skim = skim,
        SwapInventory = swap,
        Rounds = [new AudienceRound { Host = host ?? new HostReply { Speech = "Welcome.", End = true }, Envoy = new EnvoyReaction { Speech = "I thank you." } }],
    };

    private static Tablet InventoryHeldBy(GameState s, Power p) =>
        s.Tablets.Single(t => t.Inventory && s.Copies.Any(k => k.TabletId == t.Id && k.Holder == p));

    [Fact]
    public void A_skilled_envoy_who_kept_gold_swaps_the_inventory_and_the_host_sees_no_shortfall()
    {
        var (s, e, envoy, a) = AtAudience(competence: 70);
        // The host is shown the forgery: it states what its weighers find.
        var view = e.BuildAudienceView(a, "Greetings.", 20, [], 1, swap: true);
        Assert.Equal((80, 80), (view.GoldStated, view.GoldWeighed));
        Assert.Equal(100, e.BuildAudienceView(a, "Greetings.", 20, [], 1).GoldStated);

        e.ApplyAudience(Record(a, skim: 20, swap: true));

        var inventory = InventoryHeldBy(s, Power.Alashiya);
        Assert.True(inventory.Forged);
        Assert.Equal("The inventory of the gold Egypt sends to Alashiya: 1 mina 20 shekels.", inventory.Text);
        Assert.Equal([Power.Egypt], inventory.Seals);
        Assert.Equal((envoy.Id, (Power?)Power.Egypt, 70), (inventory.ForgerId, inventory.ForgerEmployer, inventory.ForgerSkill));
        Assert.Equal(80, s.Treasuries[Power.Alashiya].Lots.Single().Stated);

        // The host's record of the audience shows no gap and nothing of what the envoy did.
        var notice = s.InboxOf(Power.Alashiya).Single(i => i.Kind == InboxKind.Audience);
        Assert.Contains("The inventory lists 1 mina 20 shekels of gold; your weighers found 1 mina 20 shekels.", notice.Body);
        Assert.DoesNotContain("kept", notice.Body);
        Assert.DoesNotContain("forgery", notice.Body);
        // The record of the mission (the spectator's) keeps both; the envoy knows, and a deep secret is left.
        var outcomes = s.Trails.Single().Outcomes;
        Assert.Contains("kept 20 shekels of the gold", outcomes);
        Assert.Contains("replaced the inventory with a forgery stating 80 shekels", outcomes);
        Assert.Contains(envoy.Facts, f => f.Tag == "inventory-forgery" && f.Secrecy == Secrecy.Deep && f.KnownBy.Count == 0);
        Assert.Contains(envoy.Memory, m => m.Text.StartsWith("I put an inventory I forged myself, stating 1 mina 20 shekels", StringComparison.Ordinal));
        Assert.Contains(s.Events, x => x.Signal == "inventory-swapped" && x.VisibleTo.Count == 0);
        // Egypt, which sent 100, is told nothing.
        Assert.DoesNotContain(s.InboxOf(Power.Egypt), i => i.Body.Contains("inventory", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void An_envoy_without_the_forger_s_skill_or_with_nothing_kept_hands_over_the_true_inventory()
    {
        // Wanting to swap is not enough: a clumsy envoy's forgery would not pass, so the sealed inventory goes over.
        var (s, e, envoy, a) = AtAudience(competence: 40);
        Assert.Equal(100, e.BuildAudienceView(a, "Greetings.", 20, [], 1, swap: true).GoldStated);
        e.ApplyAudience(Record(a, skim: 20, swap: true));
        var inventory = InventoryHeldBy(s, Power.Alashiya);
        Assert.False(inventory.Forged);
        Assert.Equal("The inventory of the gold Egypt sends to Alashiya: 1 mina 40 shekels.", inventory.Text);
        Assert.Contains("The inventory lists 1 mina 40 shekels of gold; your weighers found 1 mina 20 shekels.", s.InboxOf(Power.Alashiya).Single(i => i.Kind == InboxKind.Audience).Body);
        Assert.Contains(envoy.Memory, m => m.Text.Contains("my hand could not fake the seal", StringComparison.Ordinal));
        Assert.DoesNotContain(s.Events, x => x.Signal == "inventory-swapped");

        // A skilled envoy that kept nothing has nothing to hide.
        var (s2, e2, _, a2) = AtAudience(competence: 90);
        e2.ApplyAudience(Record(a2, skim: 0, swap: true));
        Assert.False(InventoryHeldBy(s2, Power.Alashiya).Forged);
        Assert.Equal(100, s2.Treasuries[Power.Alashiya].Lots.Single().Stated);
    }

    [Fact]
    public void Gold_sent_home_comes_with_the_host_s_inventory_which_the_envoy_may_swap_on_the_way()
    {
        var (s, e, envoy, a) = AtAudience(competence: 70);
        e.ApplyAudience(Record(a, skim: 0, swap: false, new HostReply { Speech = "Take this home.", GoldBack = 60, End = true }));
        TurnEngine home;
        do
        {
            e.Resolve(new Dictionary<Power, TurnSubmission>());
            home = e = new TurnEngine(s);
            e.BeginTurn();
        } while (envoy.Duty != Duty.None);
        var report = home.MindRequests.Single(r => r.Task == MindTask.EnvoyReport);
        home.Fulfil(report, new MindReply { Text = "I am back.", Number = 15, SwapInventory = true });

        var inventory = InventoryHeldBy(s, Power.Egypt);
        Assert.True(inventory.Forged);
        Assert.Equal([Power.Alashiya], inventory.Seals);
        Assert.Equal("The inventory of the gold Alashiya sends to Egypt: 45 shekels.", inventory.Text);
        Assert.Equal(45, s.Treasuries[Power.Egypt].Lots.Single(l => l.From == Power.Alashiya).Stated);
        Assert.Contains("[The inventory lists 45 shekels of gold; your weighers found 45 shekels.]", s.InboxOf(Power.Egypt).Single(i => i.Kind == InboxKind.EnvoyReport).Body);
        Assert.Contains(s.Copies, k => k.Holder == Power.Egypt && k.TabletId == inventory.Id && k.Source == $"the inventory {envoy.Name} brought home with the gold of Alashiya");
        // Alashiya, which sent 60, keeps no copy and is told nothing.
        Assert.DoesNotContain(s.Copies, k => k.TabletId == inventory.Id && k.Holder != Power.Egypt);
    }

    [Fact]
    public void Examining_a_swapped_inventory_can_find_the_forgery_and_trace_it_to_the_envoy_who_brought_it()
    {
        var (s, e, envoy, a) = AtAudience(competence: 60);
        e.ApplyAudience(Record(a, skim: 20, swap: true));
        var copy = s.Copies.Single(k => k.Holder == Power.Alashiya && s.Tablets.Single(t => t.Id == k.TabletId).Inventory);
        e.Resolve(new Dictionary<Power, TurnSubmission>());
        var standing = Powers.All.ToDictionary(p => p, p => envoy.Reputation.GetValueOrDefault(p));

        // The forger's skill against what the examiner spends, as for any forgery; traced with the same chance.
        string? found = null;
        for (var i = 0; i < 20 && found is null; i++)
        {
            s.Treasuries[Power.Alashiya].Gold = 10000;
            var next = new TurnEngine(s);
            next.BeginTurn();
            next.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Alashiya] = new() { Orders = [new AuthenticateOrder(copy.Id, 400)] } });
            if (copy.AuthResult?.Contains("trace", StringComparison.Ordinal) == true) found = copy.AuthResult;
        }
        Assert.Equal($"The seals are false: this tablet is a forgery. The scribes trace it to the hand of {envoy.Name}, who brought it.", found);
        Assert.Contains(envoy.Facts, f => f.Tag == "forger" && f.Secrecy == Secrecy.Public && f.Text == "Exposed as the forger of an inventory of gold bearing the seal of Egypt.");
        Assert.All(Powers.All, p => Assert.Equal(standing[p] - 30, envoy.Reputation.GetValueOrDefault(p)));
        var rumour = $"The scribes of Alashiya declare that the inventory of gold bearing the seal of Egypt, brought by {envoy.Name}, envoy of Egypt, was forged by {envoy.Name}.";
        Assert.Contains(s.Journeys, j => j.Kind == JourneyKind.Rumor && j.To == Power.Egypt && j.Text == rumour);
        Assert.DoesNotContain(s.Journeys, j => j.Kind == JourneyKind.Rumor && j.To == Power.Alashiya && j.Text == rumour);
    }

    [Fact]
    public void A_true_inventory_examined_reads_genuine_as_any_genuine_tablet()
    {
        var (s, e, _, a) = AtAudience(competence: 90);
        e.ApplyAudience(Record(a, skim: 0, swap: false));
        var copy = s.Copies.Single(k => k.Holder == Power.Alashiya && s.Tablets.Single(t => t.Id == k.TabletId).Inventory);
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Alashiya] = new() { Orders = [new AuthenticateOrder(copy.Id, 40)] } });
        var next = new TurnEngine(s);
        next.BeginTurn();
        Assert.Contains(copy.AuthResult, new[] { "The seals are genuine.", "The scribes cannot agree; the result is inconclusive." });
    }
}
