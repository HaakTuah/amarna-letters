namespace Amarna.Engine;

/// <summary>
/// Every power's opening troops, treasury and starting strength: public facts every court knows (the
/// script kings read them from <see cref="MapData"/> too). Generated from <see cref="MapData"/> and the
/// config alone, so the text stays byte-stable wherever it is shown.
/// </summary>
public static class OpeningPositions
{
    public sealed record Opening(Power Power, IReadOnlyList<MapData.StartUnit> Units, int HomelandYield, int Gold, int Strength)
    {
        /// <summary>"armies in memphis and akhetaten, a fleet in delta".</summary>
        public string Troops => string.Join(", ", new[] { Group(UnitKind.Army), Group(UnitKind.Fleet) }.Where(x => x.Length > 0));

        private string Group(UnitKind kind)
        {
            var at = Units.Where(u => u.Kind == kind).Select(u => u.Province).ToList();
            var noun = kind == UnitKind.Army ? "army" : "fleet";
            return at.Count switch
            {
                0 => "",
                1 => $"a {noun} in {at[0]}",
                _ => $"{(kind == UnitKind.Army ? "armies" : "fleets")} in {string.Join(", ", at.Take(at.Count - 1))} and {at[^1]}",
            };
        }
    }

    /// <summary>Each power in the fixed order: its opening troops, homeland yield, treasury and starting strength (as <see cref="GameFactory"/> sets it).</summary>
    public static IReadOnlyList<Opening> For(GameConfig config, WorldMap? map = null)
    {
        map ??= WorldMap.Default;
        return Powers.All.Select(p =>
        {
            var yield = map.HomeOf(p).Sum(x => x.Yield);
            var gold = MapData.StartGold[p];
            return new Opening(p, MapData.StartUnits.Where(u => u.Power == p).ToList(), yield, gold, config.ProvinceWeight * yield + gold);
        }).ToList();
    }

    /// <summary>One line per power, as the rulebook gives it.</summary>
    public static IEnumerable<string> Lines(GameConfig config) => For(config).Select(o =>
        $"{o.Power}: {o.Troops}; treasury {o.Gold} shekels; homeland yield {o.HomelandYield}; starting strength {o.Strength}.");
}
