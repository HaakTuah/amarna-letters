using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// What the engine's records and notices say, after the second agent simulation's defects in the views (the fix pass after
/// item 4, part 2).
/// </summary>
public class RecordTextTests
{
    /// <summary>Egypt's envoy stands before Alashiya's king.</summary>
    private static (GameState S, TurnEngine E, Character Envoy, PendingAudience A) AtAudience(DispatchOrder? letter = null)
    {
        var s = GameFactory.NewGame(5);
        var envoy = s.Characters.First(c => c.Employer == Power.Egypt);
        envoy.SecretMaster = null;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [letter ?? new DispatchOrder(envoy.Id, Power.Alashiya, "Greetings, brother.")] } });
        while (s.Audiences.Count == 0)
        {
            e = new TurnEngine(s);
            e.BeginTurn();
            if (s.Audiences.Count == 0) e.Resolve(new Dictionary<Power, TurnSubmission>());
        }
        return (s, e, envoy, s.Audiences.Single());
    }

    [Fact]
    public void The_host_reads_the_envoys_own_promise_apart_from_what_the_audience_brought_about()
    {
        var (s, e, envoy, a) = AtAudience();
        e.ApplyAudience(new AudienceRecord
        {
            AudienceId = a.Id,
            Delivered = "Greetings.",
            Rounds =
            [
                new AudienceRound
                {
                    Host = new HostReply { Speech = "Take this.", Bribe = 10, End = true },
                    Envoy = new EnvoyReaction { Speech = "I thank you.", AcceptBribe = true, Commitments = "the tablet sealed exactly as written" },
                },
            ],
        });

        // The record of the mission keeps the promise among its outcomes, marked as the envoy's own.
        var trail = s.Trails.Single();
        Assert.Contains(TurnEngine.CommittedPrefix + "the tablet sealed exactly as written", trail.Outcomes);
        Assert.Equal("the tablet sealed exactly as written", trail.Outcomes.Select(TurnEngine.Commitment).OfType<string>().Single());
        // The host reads it on a line of its own, as the envoy's promise, not among the outcomes.
        var body = s.InboxOf(Power.Alashiya).Single(i => i.Kind == InboxKind.Audience).Body;
        var outcome = body.Split('\n').Single(l => l.StartsWith("Outcome: ", StringComparison.Ordinal));
        Assert.DoesNotContain("sealed exactly", outcome);
        Assert.Contains($"accepted 10 shekels from Alashiya", outcome);
        Assert.Contains($"{envoy.Name} promised on behalf of Egypt: \"the tablet sealed exactly as written\"", body);
    }
}
