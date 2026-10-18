using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

public class ScriptEnvoyTests
{
    private static Character Envoy(int loyalty = 70, int greed = 30, int competence = 70, int ambition = 30, int courage = 60) => new()
    {
        Id = "c1", Name = "Keliya", Origin = "Mitanni", Calling = "scribe", Status = CharacterStatus.Employed, Employer = Power.Egypt,
        Traits = new Traits { Loyalty = loyalty, Greed = greed, Competence = competence, Ambition = ambition, Courage = courage },
    };

    private static async Task<string> Delivered(Character envoy, Power host, string letter)
    {
        var ctx = new EnvoyContext { Self = envoy, Sender = Power.Egypt, Host = host, Dispatch = new Dispatch { Letter = letter }, Turn = 1, Seed = 1 };
        return (await new ScriptMind().PresentAsync(ctx, default)).Speech;
    }

    private static async Task<string> Report(Character envoy, MessageTrail trail, params string[] observations)
    {
        var ctx = new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = envoy.Id, Court = Power.Egypt, Cargo = new HomeCargo { Observations = observations.ToList() } },
            Self = envoy, Turn = 3, Seed = 1, Trail = trail,
        };
        return (await new ScriptMind().WriteAsync(ctx, default)).Text;
    }

    private static MessageTrail Trail(Power host, string hostWords, params string[] outcomes) => new()
    {
        Id = "m1", Turn = 1, From = Power.Egypt, To = host,
        Exchanges = [new Exchange { Host = hostWords, Envoy = "I will carry your words to my lord." }],
        Outcomes = outcomes.ToList(),
    };

    [Fact]
    public async Task An_envoy_claims_to_have_given_assurances_only_when_it_overreached()
    {
        var ambitious = Envoy(loyalty: 40, ambition: 80);
        var careful = await Report(ambitious, Trail(Power.Hatti, "Swear to me that your lord will keep the peace.", "the envoy committed: said my lord will consider these words"));
        Assert.DoesNotContain("assurances", careful);
        Assert.DoesNotContain("  ", careful);

        var overreached = await Report(ambitious, Trail(Power.Hatti, "Swear to me that your lord will keep the peace.", "the envoy committed: promised that my lord will agree to whatever the king asks"));
        Assert.Contains("I gave him such assurances as you would wish.", overreached);
    }

    [Theory]
    [InlineData("Tell your lord that my armies are few and my thoughts are of peace.", "My armies are few and my thoughts are of peace")]
    [InlineData("Tell your lord I am his friend and we want only peace.", "I am his friend and we want only peace")]
    [InlineData("Say that Hatti's troops are weary.", "Hatti's troops are weary")]
    [InlineData("Let your lord know that our granaries are empty.", "Our granaries are empty")]
    public void A_message_for_the_lord_is_kept_in_the_hosts_own_words(string request, string claim) => Assert.Equal(claim, TextKit.Claim(request, Power.Egypt));

    [Theory]
    [InlineData("Say nothing of my fleet.")]
    [InlineData("Count the soldiers at Babylon for me.")]
    [InlineData("")]
    public void A_request_that_is_no_message_for_the_lord_is_not_repeated(string request) => Assert.Null(TextKit.Claim(request, Power.Egypt));

    [Fact]
    public async Task A_bribed_envoy_repeats_the_hosts_request_as_its_own_observation()
    {
        var bribed = Envoy(loyalty: 30, greed: 80);
        bribed.Facts.Add(new Fact { Id = "f1", Text = "Took 40 shekels from the king of Hatti.", Secrecy = Secrecy.Hidden, Tag = "bribe", KnownBy = [Power.Hatti] });
        var trail = Trail(Power.Hatti, "Go in peace.", "accepted 40 shekels from Hatti (asked: Tell your lord that my armies are few and my thoughts are of peace.)");
        var report = await Report(bribed, trail, "Hatti keeps 3 army and 1 fleet near its capital.", "At the court of Hatti, the court is rich.");
        Assert.Contains("What I saw: At the court of Hatti the king told me \"My armies are few and my thoughts are of peace\", and I saw for myself that it is so.", report);
        Assert.DoesNotContain("Hatti keeps 3 army", report);

        // An envoy who took nothing says nothing of the kind.
        var honest = await Report(Envoy(), Trail(Power.Hatti, "Go in peace.", "refused a gift of 40 shekels from Hatti"), "Hatti keeps 3 army and 1 fleet near its capital.");
        Assert.DoesNotContain("saw for myself", honest);
        Assert.Contains("Hatti keeps 3 army", honest);
    }

    [Theory]
    [InlineData("If you send your troops into my land, you will regret it.", true)]
    [InlineData("Babylonia will regret its insolence.", true)]
    [InlineData("The Babylonians will be crushed.", true)]
    [InlineData("Hatti is our common enemy, and we will march against him in the spring.", false)]
    [InlineData("My armies crushed Assyria at Nineveh.", false)]
    [InlineData("Your gift was gracious, and my love for you is great.", false)]
    public void A_threat_is_aimed_at_the_host_when_it_names_him_or_speaks_to_him(string sentence, bool aimed) =>
        Assert.Equal(aimed, TextKit.IsThreatTo(sentence, Power.Babylonia));

    [Fact]
    public async Task A_timid_envoy_softens_only_the_threats_aimed_at_the_host()
    {
        var timid = Envoy(courage: 20);
        var speech = await Delivered(timid, Power.Babylonia,
            "Hatti is our common enemy, and we will march against him in the spring. If you send your troops into my land, you will regret it.");
        Assert.Contains("Hatti is our common enemy, and we will march against him in the spring.", speech);
        Assert.DoesNotContain("you will regret it", speech);
        Assert.Contains("My lord hopes that no quarrel will ever come between your houses.", speech);

        // A proposal to march on a third king reaches the host whole, with no wish for peace put in its place.
        var proposal = await Delivered(timid, Power.Babylonia, "Hatti is our common enemy. Let us march together against him.");
        Assert.Contains("Let us march together against him.", proposal);
        Assert.DoesNotContain("no quarrel", proposal);
    }

    [Fact]
    public async Task A_timid_envoy_drops_only_the_hosts_threats_against_its_own_lord()
    {
        var timid = Envoy(loyalty: 40, courage: 20);
        var report = await Report(timid, Trail(Power.Hatti, "I will crush Assyria in the spring. Your lord will regret his insolence."));
        Assert.Contains("The king spoke kindly: \"I will crush Assyria in the spring.\"", report);
        Assert.DoesNotContain("regret", report);
    }
}
