using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>
/// The simulation kit's debrief writer (sim/write-debriefs.js), read as text: no agent is started and no model called. Every
/// debrief ends with the footer every game request carries, and asks kings and characters alike the builder rules' question
/// (20 October 2026, "No model games until the build order is done"), so it is ready when model games return.
/// </summary>
public class DebriefKitTests
{
    private static string Kit(string file)
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null && !File.Exists(Path.Combine(dir.FullName, "AmarnaLetters.sln"))) dir = dir.Parent;
        Assert.NotNull(dir);
        return File.ReadAllText(Path.Combine(dir!.FullName, "sim", file));
    }

    [Fact]
    public void Every_debrief_ends_with_the_game_requests_footer_and_asks_what_was_most_and_least_interesting()
    {
        var script = Kit("write-debriefs.js");
        Assert.Contains($"const FOOTER = \"{FileExchange.Footer}\";", script);
        Assert.Contains("const QUESTION = \"What did you find most and least interesting about playing this role?\";", script);
        // A field of the reply's shape, for kings and characters alike.
        Assert.Contains("\"interesting\": {\"most\": ", script);
        Assert.Equal(2, script.Split("${interesting}}`").Length - 1);
    }
}
