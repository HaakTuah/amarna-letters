namespace Amarna.Engine;

/// <summary>
/// Deterministic xoshiro128** generator: 32-bit operations only, so the TypeScript build (build order item 5+) gives the
/// same numbers with <c>Math.imul</c> and <c>&gt;&gt;&gt; 0</c>. Every roll in the game comes from a stream keyed by
/// (seed, turn, purpose, subject), so results never depend on the order code happens to ask. The key is hashed into the
/// generator's full 128-bit state with several 32-bit rounds, never into one 32-bit seed, so different keys do not come to
/// share a stream in long games. (Until save version 7 this was xoshiro256** with a 64-bit keyed seed.)
/// </summary>
public sealed class Rng
{
    private uint _s0, _s1, _s2, _s3;

    private Rng(uint s0, uint s1, uint s2, uint s3)
    {
        _s0 = s0;
        _s1 = s1;
        _s2 = s2;
        _s3 = s3;
        // The all-zero state is the one state xoshiro cannot leave.
        if ((_s0 | _s1 | _s2 | _s3) == 0) _s0 = 0x9E3779B9u;
    }

    public static Rng For(ulong seed, int turn, string purpose, string subject = "")
    {
        var h = new KeyHash();
        h.Word((uint)seed);
        h.Word((uint)(seed >> 32));
        h.Word((uint)turn);
        h.Text(purpose);
        h.Text(subject);
        return h.Finish();
    }

    public uint NextUInt()
    {
        var result = RotL(_s1 * 5, 7) * 9;
        var t = _s1 << 9;
        _s2 ^= _s0;
        _s3 ^= _s1;
        _s1 ^= _s2;
        _s0 ^= _s3;
        _s2 ^= t;
        _s3 = RotL(_s3, 11);
        return result;
    }

    /// <summary>Uniform double in [0, 1), from 53 bits of two draws.</summary>
    public double NextDouble()
    {
        var a = NextUInt() >> 5;
        var b = NextUInt() >> 6;
        return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
    }

    /// <summary>Uniform int in [0, maxExclusive).</summary>
    public int Next(int maxExclusive)
    {
        if (maxExclusive <= 0) return 0;
        return (int)(NextUInt() % (uint)maxExclusive);
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

    /// <summary>FNV-1a, 64-bit, over the UTF-16 code units of a string (the fingerprint of <see cref="Json.Hash"/>).</summary>
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

    private static uint RotL(uint x, int k) => (x << k) | (x >> (32 - k));

    /// <summary>The murmur3 finalizer.</summary>
    private static uint Fmix(uint h)
    {
        h ^= h >> 16;
        h *= 0x85EBCA6Bu;
        h ^= h >> 13;
        h *= 0xC2B2AE35u;
        h ^= h >> 16;
        return h;
    }

    /// <summary>
    /// Hashes a roll's key into four 32-bit lanes, each word mixed into every lane with a round of its own (murmur3's
    /// body), then the lanes finalized and mixed into one another. A text goes in as its length, then its UTF-16 code
    /// units, so the purpose and the subject cannot run into each other.
    /// </summary>
    private struct KeyHash
    {
        private uint _h0, _h1, _h2, _h3, _n;

        public KeyHash()
        {
            _h0 = 0x243F6A88u;
            _h1 = 0x85A308D3u;
            _h2 = 0x13198A2Eu;
            _h3 = 0x03707344u;
            _n = 0;
        }

        public void Word(uint w)
        {
            var k = RotL(w * 0xCC9E2D51u, 15) * 0x1B873593u;
            _h0 = RotL(_h0 ^ k, 13) * 5 + 0xE6546B64u;
            _h1 = RotL(_h1 ^ k ^ _h0, 17) * 5 + 0x561CCD1Bu;
            _h2 = RotL(_h2 ^ k ^ _h1, 11) * 5 + 0x0BCAA747u;
            _h3 = RotL(_h3 ^ k ^ _h2, 19) * 5 + 0x96CD1C35u;
            _n++;
        }

        public void Text(string s)
        {
            Word((uint)s.Length);
            foreach (var c in s) Word(c);
        }

        public Rng Finish()
        {
            var h0 = _h0 ^ _n;
            var h1 = _h1 ^ _n;
            var h2 = _h2 ^ _n;
            var h3 = _h3 ^ _n;
            h0 += h1 + h2 + h3;
            h1 += h0;
            h2 += h0;
            h3 += h0;
            h0 = Fmix(h0);
            h1 = Fmix(h1);
            h2 = Fmix(h2);
            h3 = Fmix(h3);
            h0 += h1 + h2 + h3;
            h1 += h0;
            h2 += h0;
            h3 += h0;
            return new Rng(h0, h1, h2, h3);
        }
    }
}
