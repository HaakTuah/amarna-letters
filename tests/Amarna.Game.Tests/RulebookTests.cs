using Amarna.Engine;
using Amarna.Llm;

namespace Amarna.Game.Tests;

public class RulebookTests
{
    [Fact]
    public void Kings_read_nothing_of_shared_victory_unless_the_house_rule_is_on()
    {
        var off = new GameConfig();
        Assert.DoesNotContain("Shared victory", Prompts.LeaderRules(true, off));
        Assert.DoesNotContain("win together", Prompts.LeaderRules(true, off));
        Assert.DoesNotContain("shared victory", Schemas.LeaderOrders(off).ToJsonString());

        var on = new GameConfig { SharedVictory = true };
        Assert.Contains("Shared victory: two powers that sealed a tablet marked as a sworn alliance win together", Prompts.LeaderRules(true, on));
        Assert.Contains("shared victory", Schemas.LeaderOrders(on).ToJsonString());
    }
}
