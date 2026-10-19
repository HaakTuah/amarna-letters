using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// The date labels and the terrain data added for the visual overhaul (Build order item 2). Both are display data:
/// no rule reads them, so they must name only real places and connections and the labels must count as the engine does.
/// </summary>
public class MapPresentationTests
{
    [Fact]
    public void Turn_1_is_the_first_season_of_1345_BCE_and_each_later_year_is_one_less()
    {
        Assert.Equal("Akhet, 1345 BCE (turn 1)", Calendar.Label(1, Power.Egypt));
        Assert.Equal("the first season, 1345 BCE (turn 1)", Calendar.Label(1, Power.Hatti));
        Assert.Equal("season 1, 1345 BCE (turn 1)", Calendar.Label(1));
        Assert.Equal("Shemu, 1345 BCE (turn 3)", Calendar.Label(3, Power.Egypt));
        Assert.Equal("Akhet, 1344 BCE (turn 4)", Calendar.Label(4, Power.Egypt));
        Assert.Equal("Peret, 1344 BCE (turn 5)", Calendar.Label(5, Power.Egypt));
        Assert.Equal("Shemu, 1341 BCE (turn 15)", Calendar.Label(15, Power.Egypt));
        Assert.Equal("the third season, 1341 BCE (turn 15)", Calendar.Label(15, Power.Babylonia));
        Assert.Equal("Peret, 1343 BCE (turn 8)", Calendar.Label(8, Power.Egypt));
        Assert.Equal("season 2, 1343 BCE (turn 8)", Calendar.Label(8));
        Assert.Equal(1326, Calendar.YearBce(60));
    }

    [Fact]
    public void The_short_form_keeps_the_year_and_season()
    {
        Assert.Equal("Peret 1343 BCE", Calendar.Short(8, Power.Egypt));
        Assert.Equal("s2 1343 BCE", Calendar.Short(8, Power.Mitanni));
        Assert.Equal("s3 1341 BCE", Calendar.Short(15));
    }

    [Fact]
    public void The_ending_line_names_the_first_season_that_may_end_the_age_then_the_chance()
    {
        var c = new GameConfig();
        Assert.Equal("The age cannot end before Shemu, 1341 BCE (turn 15).", Calendar.Ending(8, c.MinTurns, c.EndChance, Power.Egypt));
        Assert.Equal("The age cannot end before season 3, 1341 BCE (turn 15).", Calendar.Ending(14, c.MinTurns, c.EndChance));
        Assert.Equal("Any season may now be the last (15% each season).", Calendar.Ending(15, c.MinTurns, c.EndChance));
    }

    [Fact]
    public void The_old_court_reckoning_is_unchanged()
    {
        // The seat view and the prompts read Season; the new labels must not have changed it.
        Assert.Equal("Peret (growing), year 3", Calendar.Season(8, Power.Egypt));
        Assert.Equal("the second season, year 3", Calendar.Season(8, Power.Hatti));
        Assert.Equal("Season 2 of year 3 (turn 8)", Calendar.Neutral(8));
    }

    [Fact]
    public void Terrain_names_only_land_provinces_and_crossings_only_real_connections()
    {
        var map = WorldMap.Default;
        foreach (var id in Geography.Rough.Concat(Geography.Desert))
            Assert.True(map.Exists(id) && !map[id].IsSea, id);
        foreach (var c in Geography.Crossings)
            Assert.Contains(map.Edges, e => c.Joins(e.A, e.B));
        Assert.Equal(Terrain.Rough, Geography.TerrainOf("mira"));
        Assert.Equal(Terrain.Desert, Geography.TerrainOf("sinai"));
        Assert.Equal(Terrain.Open, Geography.TerrainOf("babylon"));
        Assert.Equal("the Cilician Gates", Geography.CrossingBetween("kizzuwatna", "tuwanuwa")?.Name);
        Assert.Null(Geography.CrossingBetween("babylon", "nippur"));
    }

    [Fact]
    public void The_rivers_run_in_the_decided_order_through_land_provinces()
    {
        var map = WorldMap.Default;
        Assert.Equal(["thebes", "akhetaten", "memphis", "delta"], Geography.Rivers.Single(r => r.Id == "nile").Course);
        Assert.Equal(["carchemish", "terqa", "mari", "sippar", "babylon", "nippur", "ur"], Geography.Rivers.Single(r => r.Id == "euphrates").Course);
        Assert.Equal(["nineveh", "ashur", "ekallatum", "durkurigalzu"], Geography.Rivers.Single(r => r.Id == "tigris").Course);
        foreach (var r in Geography.Rivers)
            foreach (var id in r.Course)
                Assert.True(map.Exists(id) && !map[id].IsSea, id);
        Assert.Equal(["Euphrates"], Geography.RiversThrough("babylon").Select(r => r.Name));
    }
}
