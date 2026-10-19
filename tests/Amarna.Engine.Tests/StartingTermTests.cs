using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>Starting envoys' terms end at different seasons, drawn from a stream of their own.</summary>
public class StartingTermTests
{
    /// <summary>Everything a starting character is apart from its term's end.</summary>
    private static string People(GameState s) => Json.Hash(s.Characters.Select(c => new
    {
        c.Id, c.Name, c.Origin, c.Calling, c.Traits, c.Facts, c.Status, c.Employer, c.At, c.SecretMaster, c.Persona, c.Reputation,
        Wage = c.Contract?.Wage, Start = c.Contract?.StartTurn,
    }).ToList());

    /// <param name="before">The fingerprint of the starting characters when every term ended with turn 10.</param>
    [Theory]
    [InlineData(1ul, "c455b6d36d51f07c")]
    [InlineData(7ul, "342da4dd85b17043")]
    [InlineData(42ul, "9e8e6ffad9208553")]
    public void Starting_terms_end_between_turns_7_and_13_and_every_other_draw_is_unchanged(ulong seed, string before)
    {
        var s = GameFactory.NewGame(seed);
        var envoys = s.Characters.Where(c => c.Contract is not null).ToList();
        Assert.Equal(14, envoys.Count);
        Assert.All(envoys, c =>
        {
            Assert.Equal(Rng.For(seed, 0, "start-term", c.Id).Range(7, 13), c.Contract!.UntilTurn);
            Assert.InRange(c.Contract.UntilTurn, 7, 13);
        });
        // Traits, facts, wages, posts and plants are what they were before terms were staggered.
        Assert.Equal(before, People(s));
    }

    [Fact]
    public void The_starting_corps_comes_up_for_renewal_over_several_seasons()
    {
        var ends = Enumerable.Range(1, 20).SelectMany(seed => GameFactory.NewGame((ulong)seed).Characters.Where(c => c.Contract is not null).Select(c => c.Contract!.UntilTurn)).ToList();
        Assert.Equal(Enumerable.Range(7, 7), ends.Distinct().Order());
        // No game has every starting envoy's term end in the same season.
        Assert.All(Enumerable.Range(1, 20), seed => Assert.True(GameFactory.NewGame((ulong)seed).Characters.Where(c => c.Contract is not null).Select(c => c.Contract!.UntilTurn).Distinct().Count() >= 3));
    }
}
