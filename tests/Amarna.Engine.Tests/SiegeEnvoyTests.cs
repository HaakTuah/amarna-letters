using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Envoys and a besieged capital (Build order item 5; question 5, plan steps 12 and 13): the besieged king's envoys leaving,
/// or coming home, may be caught; one whose courage the siege outweighs will not go; a caught envoy is the besieger's
/// captive, its letter read, its gold and tablets taken, and its king hears only that it has not returned.
/// </summary>
public class SiegeEnvoyTests
{
    /// <summary>Seed 1: Babylonia's army besieges Ashur (just begun, walls 3), with its army in Ekallatum next to it (tightness 2).</summary>
    private static (GameState S, Character Envoy) Besieged(GameConfig config)
    {
        var s = GameFactory.NewGame(1, config with { CatastropheChance = 0 });
        s.Units.RemoveAll(u => u.Province is "ashur" or "ekallatum");
        var army = new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "ashur" };
        s.Units.Add(army);
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "ekallatum" });
        s.Owner["ekallatum"] = Power.Babylonia;
        s.Sieges.Add(new Siege { Province = "ashur", Power = Power.Babylonia, UnitId = army.Id, Progress = 0, Since = 1 });
        var envoy = s.Characters.First(c => c.Employer == Power.Assyria && c.SecretMaster is null);
        envoy.Traits.Courage = 100;
        return (s, envoy);
    }

    private static TurnEngine Season(GameState s, Dictionary<Power, TurnSubmission> orders)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders);
        return e;
    }

    private static Dictionary<Power, TurnSubmission> Letter(Character envoy, int gold = 0, TabletProposal? tablet = null) => new()
    {
        [Power.Assyria] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Egypt, "Send your armies, brother: Ashur is besieged.", "Promise anything.", Gold: gold, Proposal: tablet)] },
        // The besieger holds and presses the siege.
        [Power.Babylonia] = new() { Orders = [new HoldOrder("ashur"), new SupportOrder("ekallatum", "ashur")] },
    };

    [Fact]
    public void An_envoy_caught_leaving_is_the_besieger_s_captive_with_its_letter_gold_and_tablet()
    {
        var (s, envoy) = Besieged(new GameConfig { SiegeCatchMin = 100, SiegeCatchMax = 100 });
        Assert.Equal(2, new TurnEngine(s).Tightness(s.Sieges[0]));
        var babylonGold = s.Treasuries[Power.Babylonia].Gold;
        Season(s, Letter(envoy, 60, new TabletProposal { Text = "Egypt and Assyria stand together." }));

        Assert.Equal((CharacterStatus.Captured, (Power?)Power.Babylonia, true), (envoy.Status, envoy.HeldBy, envoy.Intercepted));
        Assert.DoesNotContain(s.Journeys, j => j.CharacterId == envoy.Id && j.Kind == JourneyKind.EnvoyOutbound);
        var caught = s.InboxOf(Power.Babylonia).Single(i => i.Title == TurnEngine.EnvoyCaughtTitle).Body;
        Assert.Contains($"Your troops besieging Ashur caught {envoy.Name}, envoy of Assyria, leaving the city for the court of Egypt. The letter he was to speak: \"Send your armies, brother: Ashur is besieged.\" His mandate: \"Promise anything.\"", caught);
        Assert.Contains("He carried 1 mina of gold, which your troops took.", caught);
        Assert.Contains("He is your captive: you may execute, ransom or release him.", caught);
        Assert.Contains(s.Copies, k => k.Holder == Power.Babylonia && s.Tablets.Single(t => t.Id == k.TabletId).Text == "Egypt and Assyria stand together.");
        Assert.Contains(s.Treasuries[Power.Babylonia].Lots, l => l.From == Power.Assyria && l.Face == 60);
        // Its king still sees it on its way, and will hear that it has not returned.
        var seen = Views.For(s, Power.Assyria).Court.Single(c => c.Id == envoy.Id);
        Assert.Equal("travelling as envoy to Egypt", seen.Duty);
        Assert.Contains(s.Journeys, j => j.Kind == JourneyKind.Rumor && j.To == Power.Assyria && j.CharacterId == envoy.Id && j.News == NewsKind.Overdue);
        Assert.Contains(s.Events, e => e.Signal == "envoy-caught");
        // The besieger may ransom him, but not turn him.
        Assert.Equal($"{envoy.Name} is an envoy your besiegers caught, not a spy at a post, and cannot be turned. {envoy.Name} remains your captive",
            OrderValidator.CaptiveRefusal(s, envoy, CaptiveFate.Turn));
        Assert.Null(OrderValidator.CaptiveRefusal(s, envoy, CaptiveFate.Ransom));
        Assert.True(Views.For(s, Power.Babylonia).Known.Single(c => c.Id == envoy.Id).Intercepted);
    }

    [Fact]
    public void An_envoy_whose_courage_the_siege_outweighs_will_not_leave_and_nothing_is_paid()
    {
        var (s, envoy) = Besieged(new GameConfig());
        envoy.Traits.Courage = 39; // below 20 x tightness 2
        var e = new TurnEngine(s);
        e.BeginTurn();
        var gold = s.Treasuries[Power.Assyria].Gold;
        e.Resolve(Letter(envoy, 60));
        Assert.Equal((CharacterStatus.Employed, Duty.None, (Power?)Power.Assyria), (envoy.Status, envoy.Duty, envoy.At));
        Assert.Equal(gold, s.Treasuries[Power.Assyria].Gold);
        Assert.Equal($"{envoy.Name} would not leave Ashur while Babylonia's army besieges it: the siege is too tight for {envoy.Name}'s courage this season. No gold was paid.",
            s.InboxOf(Power.Assyria).Single(i => i.Title == "An envoy would not leave").Body);
    }

    [Fact]
    public void An_envoy_that_slips_out_goes_on_and_other_kings_envoys_come_and_go_freely()
    {
        var (s, envoy) = Besieged(new GameConfig { SiegeCatchMin = 0, SiegeCatchMax = 0 });
        Season(s, Letter(envoy));
        Assert.Equal(Duty.EnvoyOutbound, envoy.Duty);
        Assert.Contains(s.Events, e => e.Signal == "envoy-out");

        // Egypt's envoy to Assyria arrives at besieged Ashur and is received: only the besieged king's own envoys are caught.
        (s, _) = Besieged(new GameConfig { SiegeCatchMin = 100, SiegeCatchMax = 100 });
        s.Sieges[0].Progress = 0;
        var egyptian = s.Characters.First(c => c.Employer == Power.Egypt && c.SecretMaster is null);
        Season(s, new() { [Power.Egypt] = new() { Orders = [new DispatchOrder(egyptian.Id, Power.Assyria, "Greetings.")] } });
        for (var i = 0; i < 4; i++)
        {
            var e = new TurnEngine(s);
            e.BeginTurn();
            if (egyptian.Duty != Duty.EnvoyOutbound) break;
            e.Resolve(new Dictionary<Power, TurnSubmission>());
        }
        Assert.Equal((CharacterStatus.Employed, Duty.EnvoyAtCourt), (egyptian.Status, egyptian.Duty));
    }

    [Fact]
    public void An_envoy_coming_home_to_a_besieged_capital_may_be_caught_with_what_it_brings()
    {
        var (s, envoy) = Besieged(new GameConfig { SiegeCatchMin = 100, SiegeCatchMax = 100 });
        (envoy.Duty, envoy.At) = (Duty.EnvoyHomebound, null);
        s.Journeys.Add(new Journey
        {
            Id = s.NewId("j"), Kind = JourneyKind.EnvoyHomebound, DepartTurn = 0, ArriveTurn = 1, From = Power.Egypt, To = Power.Assyria, CharacterId = envoy.Id,
            Cargo = new HomeCargo { Gold = 40, GoldStated = 40 },
        });
        new TurnEngine(s).BeginTurn();
        Assert.Equal((CharacterStatus.Captured, (Power?)Power.Babylonia), (envoy.Status, envoy.HeldBy));
        Assert.Contains("coming home to the city", s.InboxOf(Power.Babylonia).Single(i => i.Title == TurnEngine.EnvoyCaughtTitle).Body);
        Assert.Contains(s.Treasuries[Power.Babylonia].Lots, l => l.Face == 40);
    }
}
