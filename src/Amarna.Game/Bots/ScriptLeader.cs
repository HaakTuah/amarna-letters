using Amarna.Engine;

namespace Amarna.Game.Bots;

/// <summary>
/// A script king. Each power plays with its own <see cref="Personality"/>, varied per game by the
/// seed, and with a memory of every other king (trust and grudges learned from what reached its
/// court). Each season it reads the board, chooses a war (or none) and whether to keep its oaths,
/// plans troop operations, runs its treasury, court and intelligence, and writes its letters.
/// It sees exactly what any seat sees: the <see cref="SeatView"/>. The same bot stands in for a
/// model seat whenever a model call fails, playing in that king's character.
/// </summary>
public sealed class ScriptLeader : ISeat
{
    private readonly ulong _seed;
    private readonly Dictionary<Power, Brain> _brains = new();

    public ScriptLeader(ulong seed) => _seed = seed;

    public string Label => "Script bot";

    /// <summary>The temperament a script king plays with in a game with this seed.</summary>
    public static Personality Temperament(Power p, ulong seed) => Personality.For(p, seed);

    private Brain Brain(Power p)
    {
        lock (_brains)
        {
            if (!_brains.TryGetValue(p, out var b)) _brains[p] = b = new Brain(p, _seed);
            return b;
        }
    }

    public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        var brain = Brain(view.Power);
        lock (brain)
        {
            brain.Learn(view, new Board(view));
            var board = new Board(view, brain.Remembered(view));
            var rng = brain.R(view.Turn, "decide");

            Statecraft.Strategy(board, brain, rng);
            var plan = Tactics.Make(board, brain);
            Search.Improve(board, brain, plan, brain.R(view.Turn, "search"));
            foreach (var order in plan.Orders.Values)
            {
                if (order is not MoveOrder m) continue;
                var victim = board.UnitAt.GetValueOrDefault(m.To)?.Power ?? board.OwnerOf(m.To);
                if (victim is { } v && v != view.Power && brain.Rel.TryGetValue(v, out var r)) r.LastWeAttacked = view.Turn;
            }

            var orders = new List<Order>();
            Statecraft.Economy(board, brain, plan, orders, rng);
            orders.InsertRange(0, plan.Orders.Values);

            var busy = new HashSet<string>();
            Statecraft.Court(board, brain, orders, busy, rng);
            Statecraft.Letters(board, brain, orders, busy, rng);

            var notes = $"War on {brain.WarTarget?.ToString() ?? "nobody"}" + (brain.Betraying is { } t ? $"; turning on {t}" : "")
                        + $". Trust: {string.Join(", ", brain.Rel.Where(x => Math.Abs(x.Value.Trust) > 0.15).Select(x => $"{x.Key} {x.Value.Trust:+0.0;-0.0}"))}.";
            return Task.FromResult(new TurnSubmission { Orders = orders, Notes = notes });
        }
    }

    public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
    {
        var brain = Brain(view.Host);
        lock (brain)
        {
            var board = new Board(court);
            brain.Learn(court, board);
            var rng = Rng.For(_seed, view.Turn, "bot:host", $"{view.Host}:{view.AudienceId}:{view.Round}");
            return Task.FromResult(Statecraft.Host(view, board, brain, rng));
        }
    }
}
