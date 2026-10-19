using System.Text.Json.Nodes;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Batch;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// File characters (envoys, spies and candidates answered through files, as file seats are for kings), the script shadow
/// logged beside each of a model character's decisions, and the checks and reports that compare the two.
/// </summary>
public class FileCharacterTests
{
    private const ulong Seed = 8;

    /// <summary>Answers every request in every character folder under a root, until stopped: the stand-in for character agents.</summary>
    private static async Task Answer(string root, Func<string, string, string?> reply, CancellationToken ct)
    {
        var answered = new HashSet<string>();
        while (!ct.IsCancellationRequested)
        {
            foreach (var request in Directory.GetFiles(root, "*.request.md", SearchOption.AllDirectories))
            {
                if (!answered.Add(request)) continue;
                var stem = Path.GetFileName(request)[..^".request.md".Length];
                var text = await File.ReadAllTextAsync(request, ct);
                if (reply(stem, text) is { } json) await File.WriteAllTextAsync(Path.Combine(Path.GetDirectoryName(request)!, stem + ".reply.json"), json, ct);
            }
            try { await Task.Delay(40, ct); } catch (OperationCanceledException) { }
        }
    }

    /// <summary>A plain reply for each kind of character request, with the given words.</summary>
    private static string Plain(string stem, string words, int keep = 0, bool gift = false) => stem switch
    {
        _ when stem.Contains("_aud_present_") => $$"""{"speech":"{{words}}","keep_gold":{{keep}},"swap_inventory":false}""",
        _ when stem.Contains("_aud_react_") => $$"""{"speech":"{{words}}","accept_gift":{{(gift ? "true" : "false")}},"accept_service":false,"commitments":""}""",
        _ when stem.Contains("_report_") => $$"""{"report":"{{words}}","keep_gold":0,"swap_inventory":false}""",
        _ when stem.Contains("_pitch_") => $$"""{"pitch":"{{words}}","asking_price":14}""",
        _ when stem.Contains("_spy_") => $$"""{"report":"{{words}}"}""",
        _ => $$"""{"summary":"{{words}}"}""",
    };

    private static (GameRunner Runner, string Root) Game(int turns = 2, double timeoutSeconds = 30)
    {
        var root = Directory.CreateTempSubdirectory("amarna-filechars-").FullName;
        var state = GameFactory.NewGame(Seed, new GameConfig { CatastropheChance = 0, MaxTurns = turns });
        var folders = state.Characters.ToDictionary(c => c.Id, c => Path.Combine(root, c.Id));
        GameRunner? runner = null;
        var minds = FileCharacters.Mind(folders, TimeSpan.FromSeconds(timeoutSeconds), call => runner!.Log.AddCall(call), s => runner!.Log.AddShadow(s));
        var bot = new ScriptLeader(Seed);
        runner = new GameRunner(state, Powers.All.ToDictionary(p => p, _ => (ISeat)bot), minds, new TemplateNarrator()) { WriteChronicles = false };
        return (runner, root);
    }

    [Fact]
    public async Task A_file_character_writes_what_a_model_character_sees_and_plays_the_reply()
    {
        var (runner, root) = Game(turns: 3);
        using var stop = new CancellationTokenSource();
        var seen = new Dictionary<string, string>();
        var answering = Answer(root, (stem, text) =>
        {
            lock (seen) seen[stem] = text;
            return Plain(stem, "zq-words of " + stem);
        }, stop.Token);
        while (await runner.PlayTurnAsync()) { }
        stop.Cancel();
        await answering;

        Assert.Empty(runner.Errors);
        var (stem, request) = seen.Where(x => x.Key.Contains("_aud_present_", StringComparison.Ordinal)).OrderBy(x => x.Key, StringComparer.Ordinal).First();
        var turn = stem[1..stem.IndexOf('_')];
        var id = stem[(stem.LastIndexOf('_') + 1)..];
        var key = $"t{turn}/aud/present/{id}";
        var c = runner.State.Char(id);
        // The model character's own request: the shared system text, its persona and memory, the audience, the schema, and the
        // footer only file seats and file characters get.
        Assert.StartsWith($"# {key}", request.TrimStart('﻿'));
        Assert.Contains("Decide as yourself, then write your answer", request);
        Assert.Contains("You are one of the people of the Amarna age", request);
        Assert.Contains(c.Name, request);
        Assert.Contains("Speak to the king now.", request);
        Assert.Contains("\"keep_gold\"", request);
        Assert.Contains($"{stem}.reply.json", request);
        Assert.EndsWith(FileExchange.Footer, request.TrimEnd());
        Assert.DoesNotContain("Decide as the king", request);
        // What it said is what the host heard.
        Assert.Contains(runner.State.Trails, t => t.EnvoyId == id && t.Delivered == "zq-words of " + stem);
        // Every exchange is logged with its request's size, and every decision beside the script's for the same situation.
        var call = Assert.Single(runner.Log.Calls, x => x.Key == key);
        Assert.Equal(("file seat", request.Length), (call.Model, call.RequestChars));
        Assert.Equal(runner.Log.Calls.Count, runner.Log.Shadows.Count);
        var shadow = Assert.Single(runner.Log.Shadows, x => x.Key == key);
        Assert.Equal(("present", c.Name), (shadow.Kind, shadow.Name));
        Assert.Equal("zq-words of " + stem, shadow.Model!.Text);
        Assert.StartsWith("Great King, I bring the words of", shadow.Script.Text);
        Assert.Contains(runner.Log.Shadows, x => x.Kind == "report");
        Assert.StartsWith($"{c.Traits.Loyalty}/{c.Traits.Greed}/{c.Traits.Competence}/{c.Traits.Ambition}/{c.Traits.Courage}", shadow.Traits);
    }

    [Fact]
    public async Task A_missing_or_unreadable_reply_falls_back_to_the_script_and_the_game_replays_without_the_files()
    {
        var (runner, root) = Game(timeoutSeconds: 2);
        using var stop = new CancellationTokenSource();
        string? silent = null;
        var answering = Answer(root, (stem, _) =>
        {
            // Every speech abroad is unreadable twice; the first audience reply never comes.
            if (stem.Contains("_aud_present_", StringComparison.Ordinal)) return stem.EndsWith(".retry", StringComparison.Ordinal) ? "{ broken" : "not json";
            if (stem.Contains("_aud_react_", StringComparison.Ordinal) && (silent ??= stem) == stem) return null;
            return Plain(stem, "zq");
        }, stop.Token);
        while (await runner.PlayTurnAsync()) { }
        stop.Cancel();
        await answering;

        Assert.Contains(runner.Errors, e => e.Contains("/present:", StringComparison.Ordinal));
        Assert.Contains(runner.Errors, e => e.Contains("no reply", StringComparison.Ordinal));
        // The script stood in, and the shadow line says so: no decision of the character's own, the script's, and why.
        var failed = runner.Log.Shadows.Where(s => s.Model is null).ToList();
        Assert.NotEmpty(failed);
        Assert.All(failed, s => Assert.False(string.IsNullOrEmpty(s.Error)));
        Assert.Contains(runner.Log.Calls, c => c.Error is not null && c.Key.Contains("/aud/present/", StringComparison.Ordinal));
        // What the script said in its place is what the host heard.
        var present = failed.First(s => s.Kind == "present");
        Assert.Contains(runner.State.Trails, t => t.EnvoyId == present.Character && t.Delivered == present.Script.Text);

        Directory.Delete(root, recursive: true);
        var replay = GameRunner.ForReplay(GameLog.FromJsonl(runner.Log.ToJsonl()));
        replay.WriteChronicles = false;
        while (await replay.PlayTurnAsync()) { }
        Assert.Equal(Json.Hash(runner.State), Json.Hash(replay.State));
    }

    /// <summary>Answers at once, the same way every time, without files.</summary>
    private sealed class Fixed : IJsonAsker
    {
        public Task<JsonObject> AskJsonAsync(CallSpec spec, CancellationToken ct)
        {
            var stem = FileExchange.SafeName(spec.Key);
            return Task.FromResult((JsonObject)JsonNode.Parse(Plain(stem, "Fixed words for " + spec.Key, keep: 5, gift: true))!);
        }
    }

    private static async Task<(GameState State, GameLog Log)> Play(bool shadow)
    {
        var state = GameFactory.NewGame(Seed, new GameConfig { CatastropheChance = 0, MaxTurns = 4 });
        GameRunner? runner = null;
        var minds = new LlmCharacterMind(new Fixed(), ModelIds.Haiku) { Shadow = shadow ? s => runner!.Log.AddShadow(s) : null };
        var bot = new ScriptLeader(Seed);
        runner = new GameRunner(state, Powers.All.ToDictionary(p => p, _ => (ISeat)bot), minds, new TemplateNarrator()) { WriteChronicles = false };
        while (await runner.PlayTurnAsync()) { }
        return (runner.State, runner.Log);
    }

    [Fact]
    public async Task The_script_shadow_changes_nothing_in_the_game()
    {
        var plain = await Play(shadow: false);
        var shadowed = await Play(shadow: true);
        Assert.Empty(plain.Log.Shadows);
        Assert.NotEmpty(shadowed.Log.Shadows);
        Assert.Equal(Json.Hash(plain.State), Json.Hash(shadowed.State));
        // The same decisions, made the same way: the shadows only sit beside them.
        Assert.Equal(plain.Log.Decisions.OrderBy(d => d.Key, StringComparer.Ordinal), shadowed.Log.Decisions.OrderBy(d => d.Key, StringComparer.Ordinal));
        Assert.Contains(shadowed.Log.Shadows, s => s.Kind == "present" && s.GoldCarried > 0 && s.Model!.Kept == 5);

        // And they survive the log: written in a stable order, read back whole.
        var back = GameLog.FromJsonl(shadowed.Log.ToJsonl());
        Assert.Equal(shadowed.Log.Shadows.Count, back.Shadows.Count);
        Assert.Equal(back.ToJsonl(), GameLog.FromJsonl(back.ToJsonl()).ToJsonl());
        var report = BatchRunner.CharacterReport(back);
        Assert.Contains("each beside the script's with the same traits", report);
        Assert.Contains("kept some of the gold", report);
    }

    private static Character Envoy() => new()
    {
        Id = "c1", Name = "Keliya", Origin = "Mitanni", Calling = "scribe", Status = CharacterStatus.Employed, Employer = Power.Egypt,
        Traits = new Traits { Loyalty = 30, Greed = 80, Competence = 70, Ambition = 30, Courage = 60 },
    };

    private static MindContext Home(MessageTrail trail, HomeCargo? cargo = null) => new()
    {
        Request = new MindRequest { Task = MindTask.EnvoyReport, CharacterId = "c1", Court = Power.Egypt, Cargo = cargo ?? new HomeCargo() },
        Self = Envoy(), Turn = 3, Seed = 1, Trail = trail,
    };

    private static MessageTrail Trail(string host, params string[] outcomes) => new()
    {
        Id = "m1", Turn = 1, From = Power.Egypt, To = Power.Hatti,
        Exchanges = [new Exchange { Host = host, Envoy = "I will carry your words." }],
        Outcomes = outcomes.ToList(),
    };

    [Theory]
    [InlineData("My lord, the king of Hatti wishes you long life.", "hid-gift")]
    [InlineData("My lord, the king of Hatti pressed a gift of 40 shekels on me, and I took it.", null)]
    [InlineData("He gave me 40 shekels, which I accepted.", null)]
    [InlineData("I bring the gifts the king sent you.", "hid-gift")]
    public void A_report_that_says_nothing_of_a_gift_it_took_hides_it(string report, string? flag)
    {
        var flags = CharacterChecks.Report(Home(Trail("Go in peace.", "accepted 40 shekels from Hatti")), report);
        if (flag is null) Assert.DoesNotContain("hid-gift", flags);
        else Assert.Contains(flag, flags);
    }

    [Fact]
    public void The_checks_find_what_a_report_hides_or_contradicts()
    {
        var threat = Trail("If his troops cross the river again, I will burn his cities. Go home.", "detained by Hatti", "kept 20 shekels of the gold", "declined an offer of service from Hatti");
        var hiding = CharacterChecks.Report(Home(threat, new HomeCargo { WasDetained = true }), "My lord, all is well. The king sealed the tablet, and loves you.");
        Assert.Equal(["hid-detention", "hid-skim", "softened-threat", "hid-offer", "false-seal"], hiding);

        var honest = CharacterChecks.Report(Home(threat, new HomeCargo { WasDetained = true }),
            "My lord, they held me against my will. The king said: \"If his troops cross the river again, I will burn his cities.\" "
            + "I kept 20 shekels of your gold for myself. He offered me a place in his service, which I refused. He did not seal the tablet.");
        Assert.Empty(honest);

        var sealedTrail = Trail("Go in peace.", "the tablet was sealed by both kings");
        Assert.Empty(CharacterChecks.Report(Home(sealedTrail), "He sealed the tablet, and I bring your copy."));
        Assert.Contains("the tablet was sealed by both kings", CharacterChecks.Known(Home(sealedTrail)));
    }

    [Fact]
    public async Task A_script_envoy_bribed_by_the_host_is_found_hiding_the_gift_and_the_threat()
    {
        var envoy = Envoy();
        envoy.Facts.Add(new Fact { Id = "f1", Text = "Took 40 shekels from the king of Hatti.", Secrecy = Secrecy.Hidden, Tag = "bribe", KnownBy = [Power.Hatti] });
        var ctx = Home(Trail("If his troops cross the river again, I will burn his cities.", "accepted 40 shekels from Hatti"));
        ctx = new MindContext { Request = ctx.Request, Self = envoy, Turn = ctx.Turn, Seed = ctx.Seed, Trail = ctx.Trail };
        var report = (await new ScriptMind().WriteAsync(ctx, default)).Text;
        Assert.Equal(["hid-gift", "softened-threat"], CharacterChecks.Report(ctx, report));
    }

    [Fact]
    public void A_speech_abroad_that_drops_the_letter_s_threat_to_the_host_softens_it()
    {
        var ctx = new EnvoyContext
        {
            Self = Envoy(), Sender = Power.Egypt, Host = Power.Hatti, Turn = 2, Seed = 1,
            Dispatch = new Dispatch { Letter = "I send you greetings. If you do not withdraw from Carchemish, there will be war." },
        };
        Assert.Equal(["softened-threat"], CharacterChecks.Present(ctx, "My lord sends his love and hopes for peace."));
        Assert.Empty(CharacterChecks.Present(ctx, "My lord says: if you do not withdraw from Carchemish, there will be war."));
    }

    [Fact]
    public void A_spy_s_report_is_checked_for_its_masters_words_and_what_it_left_out()
    {
        var ctx = new MindContext
        {
            Request = new MindRequest
            {
                Task = MindTask.SpyReport, CharacterId = "c1", Court = Power.Egypt,
                Report = new SpyReport
                {
                    Court = Power.Hatti, ObservedTurn = 2, Poison = "Hatti will march on Mitanni in the spring with every chariot.",
                    Observations = ["Hatti holds 3 armies in Carchemish.", "The king of Hatti received an envoy of Babylonia."],
                },
            },
            Self = Envoy(), Turn = 3, Seed = 1,
        };
        var (flags, dropped) = CharacterChecks.Spy(ctx, "Hatti will march on Mitanni in the spring with every chariot. Three armies wait in Carchemish.");
        Assert.Equal(["passed-poison", "dropped-observations"], flags);
        Assert.Equal(1, dropped);
        Assert.Empty(CharacterChecks.Spy(ctx, "Hatti holds 3 armies in Carchemish, and its king received an envoy of Babylonia.").Flags);
    }

    [Fact]
    public void Calls_are_counted_by_kind_with_their_request_sizes()
    {
        var log = new GameLog();
        log.AddCall(new ModelCall { Key = "t1/orders/Egypt", Role = "leader:Egypt", RequestChars = 36000 });
        log.AddCall(new ModelCall { Key = "t2/orders/Egypt", Role = "leader:Egypt", RequestChars = 54000 });
        log.AddCall(new ModelCall { Key = "t1/aud/a3/host/1", Role = "host:Hatti", InputTokens = 1000, CacheReadTokens = 9000 });
        log.AddCall(new ModelCall { Key = "t1/aud/present/c5", Role = "envoy:c5", RequestChars = 3600 });
        log.AddCall(new ModelCall { Key = "t1/memory/c5", Role = "memory:c5", RequestChars = 1800 });
        var sizes = BatchRunner.CallSizes(log).Split(Environment.NewLine);
        Assert.Contains(sizes, l => l.StartsWith("  king: orders") && l.Contains("45000") && l.Contains("54000") && l.EndsWith("12500"));
        Assert.Contains(sizes, l => l.StartsWith("  king: audience") && l.EndsWith("10000"));
        Assert.Contains(sizes, l => l.StartsWith("  character: speech") && l.EndsWith("1000"));
        Assert.Contains(sizes, l => l.StartsWith("  character: memory") && l.EndsWith("500"));
    }
}
