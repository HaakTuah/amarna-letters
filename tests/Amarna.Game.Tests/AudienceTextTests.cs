using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>What a host reads about gold sent back and gifts, in the audience, the schema and the rulebook.</summary>
public class AudienceTextTests
{
    private static AudienceView View(int round, int goldBackNamed = 0, int giftAccepted = 0) => new()
    {
        AudienceId = "a1",
        Turn = 3,
        Round = round,
        MaxRounds = 2,
        From = Power.Egypt,
        Host = Power.Alashiya,
        Envoy = new CharacterView { Id = "c1", Name = "Mane" },
        Spoken = "Greetings.",
        GoldBackNamed = goldBackNamed,
        GiftAccepted = giftAccepted,
    };

    [Fact]
    public void The_second_exchange_tells_the_host_what_it_already_named_and_gave()
    {
        var text = Prompts.Audience(View(2, goldBackNamed: 30, giftAccepted: 20));
        Assert.Contains("You have already named 30 shekels to send home with the envoy; a new amount replaces it, 0 keeps it.", text);
        Assert.Contains("Mane has already accepted your gift of 20 shekels. An envoy takes one gift per audience: another gift would not be given.", text);

        var first = Prompts.Audience(View(1));
        Assert.DoesNotContain("already named", first);
        Assert.DoesNotContain("already accepted", first);
    }

    [Fact]
    public void The_schema_and_the_rulebook_state_the_rules()
    {
        var schema = Schemas.HostReply().ToJsonString();
        Assert.Contains("a new amount replaces the one you named before, and 0 keeps it", schema);
        Assert.Contains("An envoy takes one gift per audience", schema);
        var rules = Prompts.LeaderRules(true, new GameConfig());
        Assert.Contains("An envoy takes one gift per audience. If you name gold to send back in more than one exchange, the latest amount named is sent; 0 keeps the amount named before.", rules);
    }
}
