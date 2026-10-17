using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// Deterministic characters driven by their hidden traits. Every distortion has a motive the
/// player can reason about: the timid soften threats, the ambitious embellish and claim credit,
/// the bribed speak well of whoever paid, the careless drop things, the greedy skim.
/// </summary>
public sealed class ScriptMind : ICharacterMind
{
    public string Label => "Script characters";

    private static Rng R(ulong seed, int turn, string what, string id) => Rng.For(seed, turn, "mind:" + what, id);

    public Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct)
    {
        var c = ctx.Self;
        var t = c.Traits;
        var host = ctx.Host;
        var sentences = TextKit.Sentences(ctx.Dispatch.Letter);
        var notes = new List<string>();

        var fearful = t.Courage < 35;
        var fond = t.Sympathy == host && t.SympathyStrength >= 50;
        if ((fearful || fond) && sentences.Any(TextKit.IsThreat))
        {
            var kept = sentences.Where(s => !TextKit.IsThreat(s)).ToList();
            kept.Add("My lord hopes that no quarrel will ever come between your houses.");
            sentences = kept;
        }
        if (t.Competence < 35 && sentences.Count > 2) sentences.RemoveAt(sentences.Count - 1);

        var speech = new List<string>();
        speech.Add(c.SecretMaster == host
            ? $"Great King, I bring the words of {ctx.Sender.King()}, and I am, as ever, your servant."
            : $"Great King, I bring the words of my lord {ctx.Sender.King()}.");
        speech.Add(sentences.Count > 0 ? $"He says: \"{TextKit.Join(sentences)}\"" : "He sends his greetings.");
        if (t.Ambition >= 65) speech.Add("My lord holds you dearest of all his brothers, and great gifts will follow if you are gracious to me, his chosen messenger.");
        if (fond) speech.Add("For myself, I have always admired your court above all others.");
        if (ctx.Dispatch.Gold > 0) speech.Add($"I carry the gold my lord sends, as the inventory on the tablet shows.");

        var skim = 0;
        if (ctx.Dispatch.Gold > 0 && t.Greed > 60 && t.Loyalty < 60)
            skim = Math.Min(ctx.Dispatch.Gold, (int)(ctx.Dispatch.Gold * (t.Greed - 50) / 250.0) / 5 * 5);

        return Task.FromResult(new PresentResult { Speech = TextKit.Join(speech), Skim = skim });
    }

    public Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct)
    {
        var c = ctx.Self;
        var t = c.Traits;
        var rng = R(ctx.Seed, ctx.Turn, "react", $"{c.Id}:{ctx.Round}");
        var reaction = new EnvoyReaction();
        var speech = new List<string>();

        if (host.Bribe > 0)
        {
            var score = t.Greed + host.Bribe / 4.0 - t.Loyalty - (t.Courage > 70 ? 10 : 0) + rng.Range(-10, 10) + (t.Sympathy == ctx.Host ? 15 : 0);
            reaction.AcceptBribe = score > 20;
            speech.Add(reaction.AcceptBribe
                ? "Your generosity honours me. I will tell my lord how warmly I was received."
                : "I cannot take this. I serve my lord alone.");
        }

        var wage = c.Contract?.Wage ?? 15;
        if (host.JobOffer > 0)
        {
            var tempted = host.JobOffer >= wage * 1.5 && t.Loyalty < 55 && t.Ambition > 40;
            var drawn = t.Sympathy == ctx.Host && t.SympathyStrength > 60 && host.JobOffer >= wage;
            reaction.AcceptJob = (tempted || drawn) && c.SecretMaster is null;
            speech.Add(reaction.AcceptJob ? "Then I am yours, Great King. My old master will have to find another voice." : "You honour me, but I must return to my lord.");
        }

        if (host.Detain) speech.Add(t.Courage < 40 ? "I beg you, let me go home; my lord awaits my word." : "My lord will hear of how his messenger was treated.");

        if (!string.IsNullOrWhiteSpace(host.Speech))
        {
            if (ctx.Dispatch.Mandate.Length > 0 && (host.Speech.Contains("agree", StringComparison.OrdinalIgnoreCase) || host.Speech.Contains("swear", StringComparison.OrdinalIgnoreCase)))
            {
                var overreach = t.Ambition > 70 && t.Loyalty < 50;
                reaction.Commitments = overreach
                    ? "promised that my lord will agree to whatever the king asks"
                    : "said my lord will consider these words";
                speech.Add(overreach ? "My lord will agree to all of it, I promise you." : "I will carry your words to my lord faithfully.");
            }
            else if (speech.Count == 0) speech.Add(t.Courage < 35 ? "As you say, Great King. I will repeat every word." : "I will carry your words to my lord.");
        }
        if (speech.Count == 0) speech.Add("I thank you, Great King.");
        reaction.Speech = TextKit.Join(speech);
        return Task.FromResult(reaction);
    }

    public Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct) => Task.FromResult(ctx.Request.Task switch
    {
        MindTask.EnvoyReport => Report(ctx),
        MindTask.Pitch => Pitch(ctx),
        MindTask.SpyReport => SpyReport(ctx),
        _ => new MindReply { Text = "" },
    });

    private static MindReply Report(MindContext ctx)
    {
        var c = ctx.Self;
        var t = c.Traits;
        var trail = ctx.Trail;
        var cargo = ctx.Request.Cargo ?? new HomeCargo();
        var host = trail?.To;
        var bribedBy = c.Facts.Where(f => f.Tag == "bribe").Select(f => f.Text).LastOrDefault();
        var bribed = host is not null && bribedBy is not null && bribedBy.Contains(host.Value.Land());
        var fearful = t.Courage < 35;
        var faithful = t.Loyalty >= 60 && t.Competence >= 50 && !bribed;
        var lines = new List<string>();

        if (trail is null || host is null)
        {
            lines.Add("My lord, I have returned.");
        }
        else
        {
            lines.Add($"My lord, I have returned from the court of {host.Value.Land()}.");
            if (cargo.WasDetained) lines.Add("They held me against my will, and only now let me go.");
            var hostWords = trail.Exchanges.Select(x => x.Host).Where(x => x.Length > 0).ToList();
            foreach (var words in hostWords)
            {
                var sentences = TextKit.Sentences(words);
                if (faithful) lines.Add($"The king said: \"{TextKit.Join(sentences)}\"");
                else if (bribed || fearful)
                {
                    var soft = sentences.Where(s => !TextKit.IsThreat(s)).ToList();
                    lines.Add(soft.Count > 0 ? $"The king spoke kindly: \"{TextKit.Join(soft)}\"" : "The king spoke of his friendship for you.");
                }
                else
                {
                    var trimmed = t.Competence < 40 && sentences.Count > 1 ? sentences.Take(sentences.Count - 1) : sentences;
                    lines.Add($"The king said, in short: \"{TextKit.Join(trimmed)}\"");
                }
            }
            if (bribed) lines.Add($"The king of {host.Value.Land()} is a true friend to you, my lord, and wishes only peace.");
            if (t.Ambition >= 65) lines.Add("It was my words that won his favour; no other envoy could have done as much.");
            if (fearful && !bribed) lines.Add("All is well between your houses, I am certain of it.");
            if (trail.Outcomes.Any(o => o.Contains("sealed"))) lines.Add("He sealed the tablet, and I bring your copy.");
            if (!string.IsNullOrEmpty(trail.Outcomes.FirstOrDefault(o => o.StartsWith("the envoy committed")))) lines.Add(t.Ambition > 70 ? "I gave him such assurances as you would wish." : "");
        }

        var observations = cargo.Observations.Where(o => !(bribed && host is not null && o.StartsWith(host.Value.ToString()))).ToList();
        if (observations.Count > 0) lines.Add("What I saw: " + string.Join(" ", observations));

        var skim = 0;
        if (cargo.Gold > 0 && t.Greed > 60 && t.Loyalty < 60) skim = (int)(cargo.Gold * (t.Greed - 50) / 250.0) / 5 * 5;
        if (cargo.Gold > 0) lines.Add("I bring the gifts the king sent you.");
        return new MindReply { Text = TextKit.Join(lines), Number = skim };
    }

    private static MindReply Pitch(MindContext ctx)
    {
        var c = ctx.Self;
        var t = c.Traits;
        var lines = new List<string> { $"I am {c.Name} of {c.Origin}, once a {c.Calling}." };
        if (t.Greed >= 60 || t.Ambition >= 65)
            lines.Add("No envoy knows the roads and courts as I do; kings have praised my eloquence, and I have never failed a master.");
        else if (t.Competence < 50 && t.Loyalty >= 55)
            lines.Add("I am a plain servant and no great speaker, but I keep my word.");
        else
            lines.Add("I know the courts of the Great Kings and their customs, and I can carry a message well.");
        var defected = c.Facts.FirstOrDefault(f => f.Tag == "defected" && f.Secrecy == Secrecy.Public);
        if (defected is not null && t.Loyalty < 50) lines.Add("Whatever you may have heard, I left my last master for good reason.");

        var price = ctx.BasePrice + t.Greed / 10 + Math.Min(10, ctx.Demand * 2);
        if (defected is not null) price -= 5;
        if (t.Ambition >= 65) price += 4;
        return new MindReply { Text = TextKit.Join(lines), Number = Math.Max(5, price) };
    }

    private static MindReply SpyReport(MindContext ctx)
    {
        var r = ctx.Request.Report ?? new SpyReport();
        var c = ctx.Self;
        var lines = new List<string>();
        var where = r.Court?.ToString() ?? r.Province ?? "abroad";
        lines.Add($"From {where}, season of turn {r.ObservedTurn}.");
        if (!string.IsNullOrWhiteSpace(r.Poison)) lines.Add(r.Poison!);
        var obs = r.Observations;
        if (c.Traits.Ambition >= 70) lines.Add("I have risked much to learn this.");
        lines.AddRange(obs);
        return new MindReply { Text = string.Join(" ", lines) };
    }
}
