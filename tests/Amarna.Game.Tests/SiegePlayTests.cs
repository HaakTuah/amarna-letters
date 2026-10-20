using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// The script players' audit of the siege package (Build order item 5, "Every feature is every seat's"): weaknesses found in
/// script games on the new rules, each patched and tested here.
/// </summary>
public class SiegePlayTests
{
    /// <summary>
    /// Seed 1: Babylonia's army besieges Ashur (walls 3), just begun, with a second army in Ekallatum to support it, and Assyria's
    /// envoy is sure to be caught leaving.
    /// </summary>
    private static (GameState S, Character Envoy) AshurBesieged()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0, SiegeCatchMin = 100, SiegeCatchMax = 100 });
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

    private static void Season(GameState s, Dictionary<Power, TurnSubmission> orders)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders);
    }

    [Fact]
    public async Task A_script_captor_lets_go_at_once_an_envoy_whose_king_has_fallen()
    {
        // The envoy is caught leaving Ashur; the next season Ashur surrenders, and Assyria falls.
        var (s, envoy) = AshurBesieged();
        var press = new TurnSubmission { Orders = [new BesiegeOrder("ashur"), new SupportOrder("ekallatum", "ashur")] };
        Season(s, new() { [Power.Assyria] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Egypt, "Send your armies, brother: Ashur is besieged.", "Promise anything.")] }, [Power.Babylonia] = press });
        Assert.Equal((CharacterStatus.Captured, (Power?)Power.Babylonia), (envoy.Status, envoy.HeldBy));
        Season(s, new() { [Power.Babylonia] = press });
        Assert.Contains(Power.Assyria, s.Eliminated);
        Assert.Equal((CharacterStatus.Captured, (Power?)Power.Babylonia), (envoy.Status, envoy.HeldBy));
        var v = Views.For(s, Power.Babylonia);
        // The captor knows whose envoy it was, and that his kingdom is no more: nobody is left to pay a ransom.
        Assert.Equal(Power.Assyria, v.Known.Single(c => c.Id == envoy.Id).Employer);
        var sub = await new ScriptLeader(1).DecideAsync(v, default);
        // Babylonia's temperament asks a ransom of a captive (honesty above 0.5); for this one it would wait in vain.
        Assert.True(ScriptLeader.Temperament(Power.Babylonia, 1).Honesty > 0.5);
        Assert.Contains(sub.Orders, o => o is CaptiveOrder { Fate: CaptiveFate.Release } c && c.Character == envoy.Id);
        Assert.DoesNotContain(sub.Orders, o => o is CaptiveOrder { Fate: CaptiveFate.Ransom } c && c.Character == envoy.Id);
    }
}
