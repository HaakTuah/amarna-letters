using System.Text;
using Amarna.Engine;
using Amarna.Game;

namespace Amarna.Llm;

/// <summary>
/// The narrator (Sonnet): writes each character's persona once, phrases background checks, and
/// writes the chronicles. It only ever receives facts the engine has already released.
/// </summary>
public sealed class LlmNarrator(ClaudeClient client, string model = ModelIds.Sonnet) : INarrator
{
    public string Label => $"{ModelIds.Display(model)} narrator";

    private const string Shared = """
        You are the narrator of Amarna Letters, a strategy game set among the Great Kings of the Late Bronze Age (c. 1360-1330 BCE). You never decide what is true: the game's engine does. You only phrase what you are given, with the voice and vocabulary of the age (minas and shekels, clay tablets in envelopes, cylinder seals, messengers, the gods Shamash, Amun, Marduk, Teshub and Nergal). Never add a fact you were not given. Reply with one JSON object matching the schema.
        """;

    public async Task<string> PersonaAsync(Character c, CancellationToken ct)
    {
        var t = c.Traits;
        var user = $"""
            Write the persona of a character, as a second-person system prompt for the small language model that will play them for a whole game. 120 to 200 words. Give them a name and voice, a temperament, motivations and habits that follow from these hidden traits (0-100) and facts. Do not mention numbers or game mechanics; turn them into personality. Include every fact, so the character knows its own life. End with one sentence on how they speak.

            Name: {c.Name}. From: {c.Origin}. Former calling: {c.Calling}.
            Traits: loyalty {t.Loyalty}, greed {t.Greed}, competence {t.Competence}, ambition {t.Ambition}, courage {t.Courage}{(t.Sympathy is { } s ? $", a sympathy for {s.Land()} ({t.SympathyStrength})" : "")}.
            Facts: {string.Join(" ", c.Facts.Select(f => $"[{f.Secrecy}] {f.Text}"))}
            """;
        var json = await client.CallJsonAsync(new CallSpec
        {
            Key = $"setup/persona/{c.Id}",
            Turn = 0,
            Role = "narrator:persona",
            Model = model,
            SharedSystem = Shared,
            User = user,
            Schema = Schemas.Text("persona", "The persona prompt, in the second person."),
            Effort = "low",
            MaxTokens = 4000,
        }, ct);
        var persona = Parse.Field(json, "persona");
        return persona.Length > 40 ? persona : Personas.Template(c);
    }

    public async Task<string> CheckReportAsync(CheckContext ctx, CancellationToken ct)
    {
        var user = $"""
            The court of {ctx.Court.Land()} paid for inquiries into {ctx.Subject.Name} of {ctx.Subject.Origin}. Phrase the result as a short report from the court's inquirers, two to five sentences, like "Former merchant in Ugarit. Left debts behind." Use only these findings, and do not hint at anything more: {(ctx.Facts.Count == 0 ? "(nothing of note was found)" : string.Join(" ", ctx.Facts))}
            """;
        var json = await client.CallJsonAsync(new CallSpec
        {
            Key = $"t{ctx.Turn}/check/{ctx.Subject.Id}/{ctx.Court}",
            Turn = ctx.Turn,
            Role = "narrator:check",
            Model = model,
            SharedSystem = Shared,
            User = user,
            Schema = Schemas.Text("report", "The inquirers' report."),
            Effort = "low",
            MaxTokens = 2000,
        }, ct);
        return Parse.Field(json, "report");
    }

    public async Task<string> ChronicleAsync(ChronicleContext ctx, CancellationToken ct)
    {
        var p = ctx.Power;
        var events = new StringBuilder();
        foreach (var e in ctx.Known.Where(e => e.Kind is not "start" and not "support").TakeLast(120))
            events.AppendLine($"- year {Calendar.Year(e.Turn)}, turn {e.Turn}: {e.Text}");
        var last = ctx.Scores.LastOrDefault();
        var user = $"""
            Write the royal annals of {p.King()}, Great King of {p.Land()}, for this age: glorious and self-serving, in the manner of Late Bronze Age royal inscriptions. The model is the Battle of Kadesh, which Egypt and the Hatti each recorded as their own victory. Spin every event in the king's favour, blame setbacks on treacherous enemies, faithless messengers or the testing of the gods, and never admit defeat. Use only the events below (this is what {p.Land()}'s court knew). 250 to 400 words, divided by year.

            Outcome: {(ctx.Winners.Contains(p.ToString()) ? "this king won the age" : $"the age was won by {string.Join(" and ", ctx.Winners)}")}; at the end {p.Land()} held {last?.Provinces ?? 0} provinces.
            Events known to this court:
            {events}
            """;
        var json = await client.CallJsonAsync(new CallSpec
        {
            Key = $"end/chronicle/{p}",
            Turn = ctx.LastTurn,
            Role = "narrator:chronicle",
            Model = model,
            SharedSystem = Shared,
            User = user,
            Schema = Schemas.Text("chronicle", "The annals."),
            Effort = "low",
            MaxTokens = 6000,
        }, ct);
        return Parse.Field(json, "chronicle");
    }
}
