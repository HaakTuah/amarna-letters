namespace Amarna.Engine;

public enum ProvinceKind { Land, Coast, Sea }

/// <summary>Land edges carry armies, sea edges carry fleets, coast edges (a shared shoreline) carry both.</summary>
public enum EdgeKind { Land, Coast, Sea }

public enum UnitKind { Army, Fleet }

public sealed record Province(string Id, string Name, ProvinceKind Kind, Power? Home, int Yield, bool Capital, int X, int Y)
{
    public bool IsSea => Kind == ProvinceKind.Sea;
    public bool IsCoastal => Kind == ProvinceKind.Coast;
}

public sealed record Edge(string A, string B, EdgeKind Kind);

/// <summary>The abstract province graph. Static data: never part of the game state.</summary>
public sealed class WorldMap
{
    private readonly Dictionary<string, Province> _byId;
    private readonly Dictionary<string, List<(string To, EdgeKind Kind)>> _adj = new();
    private readonly Dictionary<(string, string), int> _hops = new();

    public IReadOnlyList<Province> Provinces { get; }
    public IReadOnlyList<Edge> Edges { get; }

    public WorldMap(IReadOnlyList<Province> provinces, IReadOnlyList<Edge> edges)
    {
        Provinces = provinces;
        Edges = edges;
        _byId = provinces.ToDictionary(p => p.Id);
        foreach (var p in provinces) _adj[p.Id] = new();
        foreach (var e in edges)
        {
            if (!_byId.ContainsKey(e.A) || !_byId.ContainsKey(e.B))
                throw new InvalidOperationException($"Edge {e.A}-{e.B} names an unknown province.");
            _adj[e.A].Add((e.B, e.Kind));
            _adj[e.B].Add((e.A, e.Kind));
        }
    }

    public static WorldMap Default { get; } = MapData.Build();

    public Province this[string id] => _byId[id];

    public bool Exists(string? id) => id is not null && _byId.ContainsKey(id);

    public Province? Find(string? idOrName)
    {
        if (string.IsNullOrWhiteSpace(idOrName)) return null;
        var key = idOrName.Trim();
        if (_byId.TryGetValue(key, out var p)) return p;
        if (_byId.TryGetValue(key.ToLowerInvariant(), out p)) return p;
        return Provinces.FirstOrDefault(x => string.Equals(x.Name, key, StringComparison.OrdinalIgnoreCase));
    }

    public IEnumerable<Province> LandProvinces => Provinces.Where(p => !p.IsSea);

    public Province Capital(Power power) => Provinces.First(p => p.Capital && p.Home == power);

    public IEnumerable<Province> HomeOf(Power power) => Provinces.Where(p => p.Home == power);

    public IEnumerable<string> Neighbors(string id) => _adj[id].Select(a => a.To);

    public bool CanMove(UnitKind kind, string from, string to) =>
        _adj[from].Any(a => a.To == to && (kind == UnitKind.Army ? a.Kind != EdgeKind.Sea : a.Kind != EdgeKind.Land));

    public IEnumerable<string> MovesFrom(UnitKind kind, string from) =>
        _adj[from].Where(a => kind == UnitKind.Army ? a.Kind != EdgeKind.Sea : a.Kind != EdgeKind.Land)
                  .Select(a => a.To).Distinct();

    public bool AreAdjacent(string a, string b) => _adj[a].Any(x => x.To == b);

    /// <summary>Is there a chain of sea zones linking two coastal provinces (ignoring fleets)?</summary>
    public bool SeaRouteExists(string from, string to)
    {
        if (!this[from].IsCoastal || !this[to].IsCoastal || from == to) return false;
        var seen = new HashSet<string>();
        var queue = new Queue<string>();
        foreach (var n in _adj[from].Where(a => this[a.To].IsSea).Select(a => a.To))
            if (seen.Add(n)) queue.Enqueue(n);
        while (queue.Count > 0)
        {
            var s = queue.Dequeue();
            foreach (var (n, _) in _adj[s])
            {
                if (n == to) return true;
                if (this[n].IsSea && seen.Add(n)) queue.Enqueue(n);
            }
        }
        return false;
    }

    /// <summary>Shortest number of steps between two provinces over every kind of edge.</summary>
    public int Hops(string a, string b)
    {
        if (a == b) return 0;
        lock (_hops)
        {
            if (_hops.TryGetValue((a, b), out var cached)) return cached;
            var dist = new Dictionary<string, int> { [a] = 0 };
            var queue = new Queue<string>();
            queue.Enqueue(a);
            while (queue.Count > 0)
            {
                var cur = queue.Dequeue();
                foreach (var n in Neighbors(cur))
                {
                    if (dist.ContainsKey(n)) continue;
                    dist[n] = dist[cur] + 1;
                    queue.Enqueue(n);
                }
            }
            var d = dist.TryGetValue(b, out var v) ? v : 99;
            _hops[(a, b)] = d;
            _hops[(b, a)] = d;
            return d;
        }
    }
}
