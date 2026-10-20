namespace Amarna.Engine;

public static class GameFactory
{
    public static GameState NewGame(ulong seed, GameConfig? config = null, WorldMap? map = null)
    {
        map ??= WorldMap.Default;
        var s = new GameState { Seed = seed, Config = config ?? new GameConfig(), Turn = 1 };

        foreach (var p in map.LandProvinces)
        {
            s.Owner[p.Id] = p.Home;
            if (MapData.StartWalls.GetValueOrDefault(p.Id) is > 0 and var walls) s.Walls[p.Id] = walls;
        }
        foreach (var u in MapData.StartUnits)
            s.Units.Add(new Unit { Id = s.NewId("u"), Power = u.Power, Kind = u.Kind, Province = u.Province });
        foreach (var p in Powers.All)
        {
            s.Treasuries[p] = new Treasury { Gold = MapData.StartGold[p] };
            s.Inbox[p] = new List<InboxItem>();
            // Every court knows the walls as the map gives them; after that, as it last saw them.
            s.WallsSeen[p] = new Dictionary<string, int>(s.Walls);
        }

        CharacterFactory.Populate(s);

        var engine = new TurnEngine(s, map);
        foreach (var p in Powers.All) s.StartStrength[p] = engine.Strength(p);
        s.Log("start", "The age begins. Seven Great Kings hold their thrones.");
        return s;
    }
}
