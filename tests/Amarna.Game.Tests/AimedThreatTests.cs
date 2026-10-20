using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>Which sentences a timid or fond envoy softens: threats aimed at the king who hears them, and only those.</summary>
public class AimedThreatTests
{
    [Theory]
    [InlineData("If you send your troops into my land, you will regret it.")]
    [InlineData("Babylonia will regret its insolence.")]
    [InlineData("The Babylonians will be crushed.")]
    [InlineData("If you do not withdraw, there will be war.")]
    [InlineData("I will burn your fields, or else send me gold.")]
    [InlineData("My armies will march on your capital.")]
    [InlineData("I will make war on you.")]
    [InlineData("Withdraw from Mari, or my armies will crush you.")]
    [InlineData("Pay what you owe, or I will march.")]
    [InlineData("This is my last warning.")]
    [InlineData("You are my enemy, and I will remember it.")]
    [InlineData("Your cities will burn.")]
    [InlineData("Karduniash will be destroyed if it does not yield.")]
    [InlineData("Cross the river and I will destroy the armies of Karduniash.")]
    [InlineData("For your insolence I will punish you.")]
    [InlineData("With these armies I will crush you.")]
    [InlineData("If the Babylonians cross the river, there will be war.")]
    [InlineData("You have been warned.")]
    [InlineData("Be warned.")]
    [InlineData("Let Karduniash be warned.")]
    [InlineData("Consider yourself warned.")]
    public void A_threat_aimed_at_the_host_is_found(string sentence) =>
        Assert.True(TextKit.IsThreatTo(sentence, Power.Babylonia, Power.Egypt));

    /// <summary>Sentences the old filter cut from letters in the seed-7 agent games, none of them a threat to the king who heard it.</summary>
    [Theory]
    [InlineData("Karduniash will not march against Hatti, and I ask the same of my brother; let each warn the other of any muster.", Power.Hatti, Power.Babylonia)]
    [InlineData("Mitanni will not march against Arzawa; I ask that Arzawa aid Hatti in nothing.", Power.Arzawa, Power.Mitanni)]
    [InlineData("I will not move against Ugarit, Tamassos or Enkomi, and I will support you if you are attacked in that sea.", Power.Alashiya, Power.Arzawa)]
    [InlineData("I propose that Mitanni and Karduniash do not attack one another nor aid any who does, and that each warns the other of any muster against him.", Power.Babylonia, Power.Mitanni)]
    [InlineData("Of Mitanni I warn you as a brother: he has swallowed Ashur and Nineveh, holds Carchemish and Isuwa on your northern border and has eight provinces.", Power.Egypt, Power.Arzawa)]
    [InlineData("I have sworn brotherhood with Karduniash, but that oath makes no war on you.", Power.Assyria, Power.Mitanni)]
    [InlineData("Do not aid Hatti or Arzawa against me, and I will aid no enemy against you.", Power.Egypt, Power.Mitanni)]
    [InlineData("Let us act together the season after next (turn 5): your army at Terqa supports my army from Sippar into Ekallatum, my second army at Dur-Kurigalzu supports it too, and I will support your march on Ashur or Nineveh in turn.", Power.Mitanni, Power.Babylonia)]
    [InlineData("Held by me it is a shut gate against Egypt, and your fleet is free for your war with Hatti.", Power.Arzawa, Power.Alashiya)]
    [InlineData("The tablets of turns 2 to 4 stand: Mari, Susa and the southern roads are yours, Isuwa and Carchemish are mine, and I march on no land of yours.", Power.Babylonia, Power.Mitanni)]
    [InlineData("Warn me at once of any muster against Mitanni, and I will warn you.", Power.Babylonia, Power.Mitanni)]
    [InlineData("If your army at Terqa supports my march into Ashur, and your men at Taidu go against Nineveh, then Nineveh is yours and Ashur and Arbela mine.", Power.Mitanni, Power.Babylonia)]
    [InlineData("I propose friendship: no war between Mitanni and Babylonia, and if Assyria marches on either of us, we speak at once and each presses it from his own side.", Power.Babylonia, Power.Mitanni)]
    [InlineData("My men stand on the roads of Kanesh and Sapinuwa to keep them from Arzawa, not to march on your capital.", Power.Hatti, Power.Mitanni)]
    [InlineData("Send word of the season you will march.", Power.Mitanni, Power.Babylonia)]
    [InlineData("In the same season your army took Ashur and destroyed my men there, and your army from Mari came against Terqa.", Power.Babylonia, Power.Mitanni)]
    // A joint strike against a third king, from seed 15 of the second agent simulation: the timid shadow dropped it, and
    // the check flagged that as softening a threat to the host.
    [InlineData("Assyria's three provinces prop each other up, so we must strike all at once, in the season of turn 7, before they can be warned.", Power.Mitanni, Power.Babylonia)]
    [InlineData("Let Hatti be warned of nothing until our armies stand at his border.", Power.Mitanni, Power.Babylonia)]
    public void A_peace_offer_a_pledge_or_a_brothers_warning_is_no_threat_to_the_host(string sentence, Power host, Power sender) =>
        Assert.False(TextKit.IsThreatTo(sentence, host, sender));

    [Theory]
    [InlineData("My armies will never march against you.")]
    [InlineData("If Hatti attacks you, my armies will march to your side.")]
    [InlineData("Hatti will attack you in the spring.")]
    [InlineData("We will march with you against Hatti.")]
    [InlineData("Hatti is our common enemy, and we will march against him in the spring.")]
    [InlineData("I thank you for the warning.")]
    public void Help_a_pledge_and_another_kings_plans_are_no_threat(string sentence) =>
        Assert.False(TextKit.IsThreatTo(sentence, Power.Babylonia, Power.Egypt));

    [Theory]
    [InlineData("If his troops cross the river again, I will burn his cities.", true)]
    [InlineData("Tell your lord that I will crush him.", true)]
    [InlineData("Egypt will regret this.", true)]
    [InlineData("I will crush Assyria and burn his cities.", false)]
    [InlineData("Tell me now, envoy: how many armies does your lord have near Terqa and Mari, and in what season does he march?", false)]
    [InlineData("A captain who marches without his king's leave is rightly rebuked, and I will hold my own captains to the same rule.", false)]
    public void A_host_speaking_of_the_lord_aims_at_him_as_he_him_and_his(string sentence, bool aimed) =>
        Assert.Equal(aimed, TextKit.IsThreatTo(sentence, Power.Egypt, Power.Hatti, spokenOf: true));

    private static Character Envoy(int loyalty, int courage) => new()
    {
        Id = "c1", Name = "Keliya", Origin = "Mitanni", Calling = "scribe", Status = CharacterStatus.Employed, Employer = Power.Arzawa,
        Traits = new Traits { Loyalty = loyalty, Greed = 30, Competence = 70, Ambition = 30, Courage = courage },
    };

    [Fact]
    public async Task A_timid_envoy_carries_a_peace_offer_whole()
    {
        const string letter = "I will not move against Ugarit, Tamassos or Enkomi, and I will support you if you are attacked in that sea. If you take Lukka, you will regret it.";
        var ctx = new EnvoyContext { Self = Envoy(70, 20), Sender = Power.Arzawa, Host = Power.Alashiya, Dispatch = new Dispatch { Letter = letter }, Turn = 1, Seed = 1 };
        var speech = (await new ScriptMind().PresentAsync(ctx, default)).Speech;
        Assert.Contains("I will support you if you are attacked in that sea.", speech);
        Assert.DoesNotContain("regret", speech);
        Assert.Contains("My lord hopes that no quarrel will ever come between your houses.", speech);
    }

    [Fact]
    public async Task A_timid_envoy_drops_the_hosts_threats_against_him_its_lord()
    {
        // Loyalty below 60: not faithful enough to repeat the host word for word.
        var timid = Envoy(40, 20);
        var trail = new MessageTrail
        {
            Id = "m1", Turn = 1, From = Power.Arzawa, To = Power.Hatti,
            Exchanges = [new Exchange { Host = "I will crush Assyria in the spring. If his troops cross the river again, I will burn his cities.", Envoy = "I will carry your words." }],
        };
        var ctx = new MindContext
        {
            Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = timid.Id, Court = Power.Arzawa, Cargo = new HomeCargo() },
            Self = timid, Turn = 3, Seed = 1, Trail = trail,
        };
        var report = (await new ScriptMind().WriteAsync(ctx, default)).Text;
        Assert.Contains("The king spoke kindly: \"I will crush Assyria in the spring.\"", report);
        Assert.DoesNotContain("burn", report);
    }
}
