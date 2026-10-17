namespace Amarna.Engine;

/// <summary>
/// Deterministic xoshiro256** generator. Every roll in the game comes from a stream keyed by
/// (seed, turn, purpose, subject), so results never depend on the order code happens to ask.
/// </summary>
public sealed class Rng
{
    private ulong _s0, _s1, _s2, _s3;

    public Rng(ulong seed)
    {
        var sm = seed;
        _s0 = SplitMix(ref sm);
        _s1 = SplitMix(ref sm);
        _s2 = SplitMix(ref sm);
        _s3 = SplitMix(ref sm);
    }

    public static Rng For(ulong seed, int turn, string purpose, string subject = "")
    {
        var h = seed ^ 0x9E3779B97F4A7C15UL;
        h = Mix(h ^ (ulong)(uint)turn);
        h = Mix(h ^ Fnv(purpose));
        h = Mix(h ^ Fnv(subject));
        return new Rng(h);
    }

    public ulong NextULong()
    {
        var result = RotL(_s1 * 5, 7) * 9;
        var t = _s1 << 17;
        _s2 ^= _s0;
        _s3 ^= _s1;
        _s1 ^= _s2;
        _s0 ^= _s3;
        _s2 ^= t;
        _s3 = RotL(_s3, 45);
        return result;
    }

    /// <summary>Uniform double in [0, 1).</summary>
    public double NextDouble() => (NextULong() >> 11) * (1.0 / (1UL << 53));

    /// <summary>Uniform int in [0, maxExclusive).</summary>
    public int Next(int maxExclusive)
    {
        if (maxExclusive <= 0) return 0;
        return (int)(NextULong() % (ulong)maxExclusive);
    }

    /// <summary>Uniform int in [min, maxInclusive].</summary>
    public int Range(int min, int maxInclusive) => min + Next(maxInclusive - min + 1);

    public bool Chance(double p) => NextDouble() < p;

    public T Pick<T>(IReadOnlyList<T> items) => items[Next(items.Count)];

    public List<T> Shuffle<T>(IEnumerable<T> items)
    {
        var list = items.ToList();
        for (var i = list.Count - 1; i > 0; i--)
        {
            var j = Next(i + 1);
            (list[i], list[j]) = (list[j], list[i]);
        }
        return list;
    }

    public static ulong Fnv(string s)
    {
        var h = 14695981039346656037UL;
        foreach (var c in s)
        {
            h ^= c;
            h *= 1099511628211UL;
        }
        return h;
    }

    private static ulong SplitMix(ref ulong x)
    {
        x += 0x9E3779B97F4A7C15UL;
        return Mix(x);
    }

    private static ulong Mix(ulong z)
    {
        z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9UL;
        z = (z ^ (z >> 27)) * 0x94D049BB133111EBUL;
        return z ^ (z >> 31);
    }

    private static ulong RotL(ulong x, int k) => (x << k) | (x >> (64 - k));
}
