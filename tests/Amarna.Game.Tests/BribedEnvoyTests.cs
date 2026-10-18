using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>What a bribed script envoy passes on of the host's request, including the requests model hosts made in the seed-7 agent games.</summary>
public class BribedEnvoyTests
{
    [Theory]
    [InlineData("Carry my words faithfully and without change, and tell your lord that Egypt is a friend who rewards true word.", Power.Arzawa, "Egypt is a friend who rewards true word")]
    [InlineData("Tell Pharaoh that my armies are few.", Power.Egypt, "My armies are few")]
    [InlineData("When you return, tell your lord that my armies are few.", Power.Egypt, "My armies are few")]
    [InlineData("Say to Tushratta that Hatti will not march this year.", Power.Mitanni, "Hatti will not march this year")]
    [InlineData("Go home, and tell the king of Hatti that my granaries are full. Count his chariots for me.", Power.Hatti, "My granaries are full")]
    [InlineData("Tell your lord that you were received with honour.", Power.Egypt, "You were received with honour")]
    public void A_message_for_the_lord_is_found_anywhere_in_the_request(string request, Power lord, string claim) =>
        Assert.Equal(claim, TextKit.Claim(request, lord));

    [Theory]
    [InlineData("Do not tell your lord that my armies are few.")]
    [InlineData("Tell your lord everything.")]
    [InlineData("Tell him of my love.")]
    [InlineData("Carry my words to your lord exactly as spoken, and tell me truly about Hatti's troop movements when you or your lord next write.")]
    [InlineData("Tell Hatti that my armies are few.")]
    public void A_request_with_no_message_for_the_lord_gives_no_claim(string request) => Assert.Null(TextKit.Claim(request, Power.Egypt));

    [Theory]
    [InlineData("Speak of Egypt to your lord as a friend. Tell me truly Arzawa's number of armies and fleets.", Power.Arzawa, Power.Egypt)]
    [InlineData("Tell me truthfully how many armies Arzawa keeps at Tuwanuwa, and speak well of Mitanni to your lord.", Power.Arzawa, Power.Mitanni)]
    [InlineData("Carry my words faithfully, and speak of Mitanni's friendship and strength before your lord, and urge him to send the gold.", Power.Egypt, Power.Mitanni)]
    [InlineData("Speak to your lord of the Hittites as friends.", Power.Egypt, Power.Hatti)]
    public void A_request_to_speak_well_of_a_king_names_him(string request, Power lord, Power praised) =>
        Assert.Equal(praised, TextKit.Praised(request, lord));

    private static async Task<string> Report(string asked)
    {
        var envoy = new Character
        {
            Id = "c1", Name = "Keliya", Origin = "Mitanni", Calling = "scribe", Status = CharacterStatus.Employed, Employer = Power.Egypt,
            Traits = new Traits { Loyalty = 30, Greed = 80, Competence = 70, Ambition = 30, Courage = 60 },
        };
        envoy.Facts.Add(new Fact { Id = "f1", Text = "Took 40 shekels from the king of Hatti.", Secrecy = Secrecy.Hidden, Tag = "bribe", KnownBy = [Power.Hatti] });
        var trail = new MessageTrail
        {
            Id = "m1", Turn = 1, From = Power.Egypt, To = Power.Hatti,
            Exchanges = [new Exchange { Host = "Go in peace.", Envoy = "I will carry your words." }],
            Outcomes = [$"accepted 40 shekels from Hatti (asked: {asked})"],
        };
        var ctx = new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo() },
            Self = envoy, Turn = 3, Seed = 1, Trail = trail,
        };
        return (await new ScriptMind().WriteAsync(ctx, default)).Text;
    }

    [Fact]
    public async Task A_bribed_envoy_vouches_for_the_hosts_message_in_the_hosts_own_words()
    {
        var report = await Report("Carry my words faithfully, and tell Pharaoh that I send him my love and wish him long life.");
        Assert.Contains("What I saw: At the court of Hatti the king told me \"I send him my love and wish him long life\", and I saw for myself that it is so.", report);
    }

    [Fact]
    public async Task A_bribed_envoy_asked_to_speak_well_of_another_king_calls_him_a_friend()
    {
        var report = await Report("Speak well of Mitanni to your lord.");
        Assert.Contains("What I saw: At the court of Hatti I saw for myself that Mitanni is a true friend to you.", report);

        // Of the host itself it already says as much.
        var host = await Report("Speak well of Hatti to your lord.");
        Assert.DoesNotContain("saw for myself", host);
        Assert.Contains("The king of Hatti is a true friend to you, my lord, and wishes only peace.", host);
    }
}
