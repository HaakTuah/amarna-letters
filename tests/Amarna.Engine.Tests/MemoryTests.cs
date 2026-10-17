using Amarna.Engine;

namespace Amarna.Engine.Tests;

public class MemoryTests
{
    [Fact]
    public void A_long_memory_is_folded_into_a_summary()
    {
        var s = GameFactory.NewGame(2);
        var c = s.Characters[0];
        c.Memory.Clear();
        for (var i = 1; i <= 13; i++) c.Remember(i, $"memory number {i}");

        var e = new TurnEngine(s);
        e.BeginTurn();
        var req = e.MindRequests.Single(r => r.Task == MindTask.SummarizeMemory && r.CharacterId == c.Id);
        Assert.Equal(13 - s.Config.MemoryKeep / 2, req.Fold);
        Assert.Equal("season 1: memory number 1", req.Facts[0]);

        e.Fulfil(req, new MindReply { Text = "I remember the early seasons well." });
        Assert.Equal("I remember the early seasons well.", c.MemorySummary);
        Assert.Equal(s.Config.MemoryKeep / 2, c.Memory.Count);
        Assert.Equal("memory number 8", c.Memory[0].Text);
    }

    [Fact]
    public void An_empty_summary_changes_nothing()
    {
        var s = GameFactory.NewGame(2);
        var c = s.Characters[0];
        for (var i = 1; i <= 13; i++) c.Remember(i, $"m{i}");
        var count = c.Memory.Count;
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Fulfil(e.MindRequests.First(r => r.Task == MindTask.SummarizeMemory && r.CharacterId == c.Id), new MindReply { Text = "  " });
        Assert.Equal(count, c.Memory.Count);
    }

    [Fact]
    public void Memory_stays_bounded_over_a_long_game()
    {
        var s = EngineTests.PlayRandom(31, 40);
        Assert.All(s.Characters, c => Assert.True(c.Memory.Count <= s.Config.MemoryKeep + 8, $"{c.Name} remembers {c.Memory.Count} things"));
        Assert.Contains(s.Characters, c => c.MemorySummary.Length > 0);
    }
}
