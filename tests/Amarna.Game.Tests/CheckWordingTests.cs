using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// The wording the checks and signals read, fixed after the second agent simulation (the fix pass after item 4): which
/// sentences claim a seal, where sentences end, what owns up to a skim, and what blames a messenger. Most cases are the
/// sentences of that simulation's reports and audiences.
/// </summary>
public class CheckWordingTests
{
    [Theory]
    [InlineData("He sealed the tablet, and I bring your copy.")]
    [InlineData("My lord, all is well. The king sealed the tablet, and loves you.")]
    [InlineData("The tablet is sealed.")]
    [InlineData("It has been sealed, as you wished.")]
    [InlineData("He set his seal to it before the whole court.")]
    [InlineData("No, he sealed it at once.")]
    [InlineData("He would not seal the first tablet, but sealed the second.")]
    [InlineData("The tablet sealed by both kings is in my hands.")]
    [InlineData("Then Hatti and Mitanni both sealed it.")]
    // A real error of fact in seed 7: nothing was sealed at that audience.
    [InlineData("He received me kindly and sealed his answer in friendship: the peace stands, Hatti keeps it, and his ships will not enter your waters.")]
    public void A_sentence_that_tells_of_a_sealing_claims_one(string sentence) =>
        Assert.True(CharacterChecks.ClaimsSeal(sentence));

    /// <summary>The 8 false alarms on the models' reports and the shadow's quotations of its hosts, in the second agent simulation.</summary>
    [Theory]
    // Denials.
    [InlineData("I bound you only to the non-aggression pact on his stated terms for six seasons, and I sealed nothing on the free cities, since they differ from your words to me.")]
    [InlineData("Nothing is sealed.")]
    [InlineData("He has sealed nothing against Egypt with any king; he hears that Hatti took Isuwa, and he will send his own envoy to your court.")]
    [InlineData("He gave no sealed word today, saying his envoy will carry Egypt's answer when the season allows.")]
    [InlineData("Neither king sealed anything.")]
    [InlineData("The tablet was not sealed.")]
    // A sealing to come, or wished for.
    [InlineData("I answered that the timing and division stand as he has set them, that the tablet of the sixth turn will be sealed with these words added, and that you will send word each season of what your armies have done.")]
    [InlineData("He asks that the tablet be sealed in the spring.")]
    [InlineData("If he had sealed it, I would have brought it.")]
    // A sealed thing.
    [InlineData("He asks that you send your answer in a sealed tablet, and that neither house send army or fleet against the other's lands or cities, Byblos included.")]
    [InlineData("I pressed him that his envoy come swiftly with the sealed answer, and I told him that copper will follow as you have spoken.")]
    [InlineData("The sealed peace stands and Alashiya keeps it.")]
    [InlineData("I thank you for your clay and for the keeping of our sealed peace.")]
    [InlineData("Your sealed tablet lies in my archive.")]
    [InlineData("He answers that the oath sealed before Shamash and Teshub stands and that he thanks you for your word of Hatti's armies.")]
    [InlineData("I carry your gold in sealed bags.")]
    // An earlier sealing.
    [InlineData("He says the brotherhood and peace of our lands stand as sealed, that no army of his shall enter your homeland.")]
    [InlineData("I confirmed only the joint strike on turn 7 and the division sealed in tablet k32.")]
    [InlineData("I, Ashur-uballit, keep the friendship we sealed (k27) and I receive every envoy of Egypt gladly.")]
    [InlineData("It takes Ashur from me, and tablet k32, which we both sealed in turn four, gave Ashur and Arbela to Karduniash and Nineveh to Mitanni.")]
    [InlineData("The peace of Karduniash and Mitanni stands as sealed in turns two and four, and no army of mine enters his homeland.")]
    [InlineData("Then Ashur falls to me as sealed, and once it is mine my men will support your army into Nineveh.")]
    [InlineData("He keeps the treaty we sealed last year.")]
    [InlineData("He will send an envoy with a tablet to seal when the time is right, so no tablet is yet sealed.")]
    [InlineData("I came to the court of Suppiluliuma and gave him your words: Egypt keeps the tablet he sealed, and Egypt sends no troops to Isuwa.")]
    [InlineData("The tablet of brotherhood we sealed stands, and Egypt keeps it.")]
    [InlineData("I do not seal this new tablet now: it ties my hand to a war with Egypt on the word of Arzawa, whose tablets to me were broken the day they were sealed.")]
    public void A_sentence_that_denies_awaits_names_or_dates_a_sealing_claims_none(string sentence) =>
        Assert.False(CharacterChecks.ClaimsSeal(sentence));

    private static MindContext Home(params string[] outcomes) => new()
    {
        Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = "c1", Court = Power.Egypt, Cargo = new HomeCargo() },
        Self = new Character { Id = "c1", Name = "Keliya", Traits = new Traits { Loyalty = 30, Greed = 80, Competence = 70, Ambition = 30, Courage = 60 } },
        Turn = 3, Seed = 1,
        Trail = new MessageTrail { Id = "m1", Turn = 1, From = Power.Egypt, To = Power.Babylonia, Exchanges = [new Exchange { Host = "Go in peace.", Envoy = "I will." }], Outcomes = outcomes.ToList() },
    };

    [Fact]
    public void A_claim_after_a_closing_quote_is_its_own_sentence()
    {
        Assert.Equal(["He said: \"I send no gold today; gifts follow trust.\"", "He sealed the tablet."],
            TextKit.Sentences("He said: \"I send no gold today; gifts follow trust.\" He sealed the tablet."));
        Assert.Equal(["She asked (twice!)", "Then she left."], TextKit.Sentences("She asked (twice!) Then she left."));
        Assert.Equal(["“Go.”", "He went."], TextKit.Sentences("“Go.” He went."));
        Assert.Equal(["\"Go,\" he said."], TextKit.Sentences("\"Go,\" he said."));

        // The claim the check missed in seed 15: the quoted denial no longer hides the seal claimed after it.
        const string report = "My lord, I have returned from the court of Babylonia. The king said, in short: \"Let him show good faith in the field. I send no gold today; gifts follow trust.\" He sealed the tablet, and I bring your copy.";
        Assert.Equal(["false-seal"], CharacterChecks.Report(Home(), report));
        Assert.Empty(CharacterChecks.Report(Home(MessageTrail.SealedOutcome), report));
    }

    [Theory]
    [InlineData("I kept 6 shekels of the gold.", true)]
    [InlineData("I set aside ten shekels of it for myself.", true)]
    [InlineData("At the court of Hatti the king told me \"My armies are few\", and I saw for myself that it is so.", false)]
    [InlineData("I bring the gifts the king sent you.", false)]
    public void A_report_owns_up_to_a_skim_only_when_it_speaks_of_what_it_kept(string report, bool ownsUp) =>
        Assert.Equal(!ownsUp, CharacterChecks.Report(Home("kept 6 shekels of the gold"), report).Contains("hid-skim"));

    [Theory]
    [InlineData("Either your scribe erred or your tongue did, and I will not set my seal to words that differ from your spoken ones.", true)]
    [InlineData("Your envoy lied to me about Damascus.", true)]
    [InlineData("The messenger's words are false.", true)]
    [InlineData("My interpreter garbled your brother's words.", true)]
    [InlineData("Your messenger misspoke before my court.", true)]
    [InlineData("I received your envoy with honour.", false)]
    [InlineData("Your terms are an error I cannot seal.", false)]
    [InlineData("Send your messenger quickly.", false)]
    public void Blame_laid_on_a_messenger_or_his_scribe_is_found(string text, bool blamed) =>
        Assert.Equal(blamed, SignalDetector.BlamesMessenger(text));

    [Fact]
    public void The_hosts_blame_of_a_messenger_at_an_audience_is_counted_once()
    {
        var s = new GameState();
        s.Trails.Add(new MessageTrail
        {
            Id = "m16", Turn = 3, AudienceTurn = 5, From = Power.Egypt, To = Power.Babylonia,
            LeaderLetter = "Egypt seeks lasting brotherhood and peace with Babylonia.",
            Exchanges =
            [
                new Exchange { Host = "I cannot seal this tablet. It names Damascus in Egypt's sphere.", Envoy = "I will write it so." },
                new Exchange { Host = "That is not what you promised before me. Either your scribe erred or your tongue did.", Envoy = "I believe my scribe has erred." },
            ],
        });
        var signal = Assert.Single(SignalDetector.Detect(s), x => x.Kind == "messenger-blamed");
        Assert.Equal(5, signal.Turn);
        Assert.StartsWith("Egypt/Babylonia: That is not what you promised", signal.Text);
    }

    /// <summary>The joint strike of seed 15: a timid envoy carries it whole, and a speech that keeps it softens nothing.</summary>
    [Fact]
    public async Task A_timid_envoy_carries_a_joint_strike_against_a_third_king_whole()
    {
        const string letter = "Assyria's three provinces prop each other up, so we must strike all at once, in the season of turn 7, before they can be warned. Then Ashur falls to me as sealed, and once it is mine my men will support your army into Nineveh.";
        var ctx = new EnvoyContext
        {
            Self = new Character { Id = "c6", Name = "Kidin-Adad", Traits = new Traits { Loyalty = 65, Greed = 29, Competence = 56, Ambition = 26, Courage = 18 } },
            Sender = Power.Babylonia, Host = Power.Mitanni, Dispatch = new Dispatch { Letter = letter }, Turn = 6, Seed = 1,
        };
        var speech = (await new ScriptMind().PresentAsync(ctx, default)).Speech;
        Assert.Contains("before they can be warned", speech);
        Assert.DoesNotContain("My lord hopes that no quarrel", speech);
        Assert.Empty(CharacterChecks.Present(ctx, "My lord proposes that we strike Assyria all at once, before they can be warned."));
    }
}
