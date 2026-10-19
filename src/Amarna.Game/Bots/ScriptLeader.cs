using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
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
    /// <summary>Each power's seat seed (see <see cref="SeatSeed"/>); the game's own seed is not kept.</summary>
    private readonly Dictionary<Power, ulong> _seeds;
    private readonly Dictionary<Power, Brain> _brains = new();

    /// <param name="gameSeed">The game's seed, from which each power's seat seed is derived.</param>
    public ScriptLeader(ulong gameSeed) => _seeds = Powers.All.ToDictionary(p => p, p => SeatSeed(gameSeed, p));

    public string Label => "Script bot";

    /// <summary>
    /// A script seat's own seed: the first eight bytes of a SHA-256 hash of the game's seed, "seat" and the power. Its
    /// temperament and every roll it makes, its pictured rivals' included, come from this seed, so no script king holds
    /// the seed the engine rolls the game's dice with. The hash is one-way: unlike a stream of <see cref="Rng"/>, whose
    /// every step can be undone, the seat seed gives no way back to the game's seed.
    /// </summary>
    public static ulong SeatSeed(ulong gameSeed, Power p)
    {
        var tag = Encoding.UTF8.GetBytes("seat:" + p);
        var input = new byte[8 + tag.Length];
        BinaryPrimitives.WriteUInt64LittleEndian(input, gameSeed);
        tag.CopyTo(input, 8);
        return BinaryPrimitives.ReadUInt64LittleEndian(SHA256.HashData(input));
    }

    /// <summary>The temperament a script king plays with in a game with this seed (drawn from its seat seed).</summary>
    public static Personality Temperament(Power p, ulong gameSeed) => Personality.For(p, SeatSeed(gameSeed, p));

    private Brain Brain(Power p)
    {
        lock (_brains)
        {
            if (!_brains.TryGetValue(p, out var b)) _brains[p] = b = new Brain(p, _seeds[p]);
            return b;
        }
    }

    /// <summary>
    /// Reads a season's view of a seat it may have to stand in for, deciding nothing, so that it remembers what that seat
    /// has seen when it must play it. Like all its learning this happens at most once a season: reading the same season
    /// again, or playing it after reading it, learns nothing more.
    /// </summary>
    public void Observe(SeatView view)
    {
        var brain = Brain(view.Power);
        lock (brain) brain.Learn(view, new Board(view));
    }

    /// <summary>The memory this bot keeps for a power, if it has played or watched it.</summary>
    internal Brain? BrainOf(Power p)
    {
        lock (_brains) return _brains.GetValueOrDefault(p);
    }

    public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
    {
        var brain = Brain(view.Power);
        lock (brain)
        {
            brain.Learn(view, new Board(view));
            var board = new Board(view, brain.Remembered(view), brain.Treasury);
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
                        + (board.Leader() is { } top ? $"; {top} leads" : "") + string.Concat(Pacts(board, brain, plan).Select(s => "; " + s))
                        + $". Trust: {string.Join(", ", brain.Rel.Where(x => Math.Abs(x.Value.Trust) > 0.15).Select(x => $"{x.Key} {x.Value.Trust:+0.0;-0.0}"))}.";
            return Task.FromResult(new TurnSubmission { Orders = orders, Notes = notes });
        }
    }

    /// <summary>For the notes: the coalitions in force, and the joint blows this season's orders strike.</summary>
    private static IEnumerable<string> Pacts(Board board, Brain brain, MilitaryPlan plan)
    {
        foreach (var g in brain.Coalitions(board).GroupBy(c => c.Against))
            yield return $"sworn against {g.Key} with {string.Join(" and ", g.Select(c => c.Partner))}";
        foreach (var j in Tactics.Joints(board, brain))
        {
            var place = Board.Map[j.Target].Name;
            if (j.Lead.Power == board.Me)
            {
                if (plan.Orders.GetValueOrDefault(j.Lead.Province) is MoveOrder m && m.To == j.Target)
                    yield return $"joint blow on {place}: going in, {string.Join(" and ", j.Support.Select(s => s.Power).Where(x => x != board.Me).Distinct())} supporting";
            }
            else if (j.Support.Any(s => s.Power == board.Me && plan.Orders.GetValueOrDefault(s.Province) is SupportOrder o && o.To == j.Target))
                yield return $"joint blow on {place}: supporting {j.Lead.Power}";
        }
    }

    public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
    {
        var brain = Brain(view.Host);
        lock (brain)
        {
            brain.Learn(court, new Board(court));
            var board = new Board(court, treasuries: brain.Treasury);
            var rng = Rng.For(_seeds[view.Host], view.Turn, "bot:host", $"{view.Host}:{view.AudienceId}:{view.Round}");
            return Task.FromResult(Statecraft.Host(view, board, brain, rng));
        }
    }
}
