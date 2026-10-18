using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Each servant away shows when it set out and when it is due back, as its master can reckon it; a cover keeps the same words.</summary>
public class ViewTimingTests
{
    private static TurnEngine Begin(GameState s)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        foreach (var r in e.MindRequests.ToList()) e.Fulfil(r, new MindReply { Text = $"[{r.Task}]", Number = 15 });
        return e;
    }

    private static CharacterView Line(GameState s, Power p, string id) => Views.For(s, p).Court.Single(c => c.Id == id);

    [Fact]
    public void An_envoy_shows_when_it_set_out_is_received_and_is_due_back()
    {
        var s = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0 });
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var e = Begin(s);
        var travel = e.TravelTurns(Power.Egypt, Power.Hatti);
        Assert.Equal("", Line(s, Power.Egypt, envoy.Id).Timing); // at court, ready
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Hatti, "Greetings.")] } });

        var heard = 1 + travel;
        var back = heard + travel;
        var line = Line(s, Power.Egypt, envoy.Id);
        Assert.Equal(("travelling as envoy to Hatti", $"set out in turn 1 for Hatti; received there in turn {heard}; due back about turn {back}"), (line.Duty, line.Timing));

        while (s.Audiences.Count == 0) { e = Begin(s); if (s.Audiences.Count == 0) e.Resolve(new Dictionary<Power, TurnSubmission>()); }
        Assert.Equal(heard, s.Turn);
        Assert.Equal($"set out in turn 1 for Hatti; received there in turn {heard}; due back about turn {back}", Line(s, Power.Egypt, envoy.Id).Timing);
        e.ApplyAudience(new AudienceRecord { AudienceId = s.Audiences.Single().Id, Delivered = "Greetings.", Rounds = [new AudienceRound { Host = new HostReply { End = true }, Envoy = new EnvoyReaction() }] });
        line = Line(s, Power.Egypt, envoy.Id);
        Assert.Equal(("on the road home", $"set out in turn 1 for Hatti; due back about turn {back}"), (line.Duty, line.Timing));

        while (s.Turn < back) { e.Resolve(new Dictionary<Power, TurnSubmission>()); e = Begin(s); }
        line = Line(s, Power.Egypt, envoy.Id);
        Assert.True(line.Ready);
        Assert.Equal("", line.Timing);
    }

    [Fact]
    public void A_detained_envoy_is_due_back_in_its_lord_s_eyes_as_one_sent_home_would_be()
    {
        var s = GameFactory.NewGame(5, new GameConfig { CatastropheChance = 0 });
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var e = Begin(s);
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Alashiya, "Hello.")] } });
        while (s.Audiences.Count == 0) { e = Begin(s); if (s.Audiences.Count == 0) e.Resolve(new Dictionary<Power, TurnSubmission>()); }
        var at = s.Turn;
        var back = at + e.TravelTurns(Power.Alashiya, Power.Egypt);

        var held = Json.Clone(s);
        new TurnEngine(held).ApplyAudience(new AudienceRecord { AudienceId = held.Audiences.Single().Id, Delivered = "Hello.", Rounds = [new AudienceRound { Host = new HostReply { Detain = true }, Envoy = new EnvoyReaction() }] });
        var line = Line(held, Power.Egypt, envoy.Id);
        Assert.Equal(("on the road home", "travelling", $"set out in turn 1 for Alashiya; due back about turn {back}"), (line.Duty, line.Where, line.Timing));
    }

    [Fact]
    public void A_spy_on_its_way_shows_when_it_is_due_at_its_post()
    {
        var s = GameFactory.NewGame(8, new GameConfig { CatastropheChance = 0 });
        var spy = s.Characters.First(c => c.Employer == Power.Babylonia);
        var e = Begin(s);
        var travel = e.TravelTurns(Power.Babylonia, Power.Egypt);
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Babylonia] = new() { Orders = [new PlaceSpyOrder(spy.Id, Court: Power.Egypt)] } });
        Assert.Equal($"set out in turn 1; due there about turn {1 + travel}", Line(s, Power.Babylonia, spy.Id).Timing);
    }
}
