using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>A script seat's seed is one-way: no undoing of its steps leads back to the seed the engine rolls with.</summary>
public class SeatSeedTests
{
    private const ulong Gamma = 0x9E3779B97F4A7C15UL;

    /// <summary>Undoes the first number of <c>Rng.For(seed, 0, "seat", power)</c>, step by step, giving the seed it came from.</summary>
    private static ulong Undo(ulong first, Power p)
    {
        // xoshiro256**'s first output is RotL(s1 * 5, 7) * 9; s1 is the second SplitMix output of the stream's key h.
        var s1 = RotR(first * Inverse(9), 7) * Inverse(5);
        var h = unchecked(Unmix(s1) - 2 * Gamma);
        h = Unmix(h) ^ Rng.Fnv(p.ToString());
        h = Unmix(h) ^ Rng.Fnv("seat");
        h = Unmix(h) ^ 0UL; // turn 0
        return Unmix(h) ^ Gamma;
    }

    private static ulong Unmix(ulong z)
    {
        z = Unshift(z, 31);
        z *= Inverse(0x94D049BB133111EBUL);
        z = Unshift(z, 27);
        z *= Inverse(0xBF58476D1CE4E5B9UL);
        return Unshift(z, 30);
    }

    private static ulong Unshift(ulong y, int k)
    {
        var x = y;
        for (var i = 0; i < 64 / k + 1; i++) x = y ^ (x >> k);
        return x;
    }

    private static ulong Inverse(ulong a)
    {
        var x = a;
        for (var i = 0; i < 6; i++) x *= 2 - a * x;
        return x;
    }

    private static ulong RotR(ulong x, int k) => (x >> k) | (x << (64 - k));

    [Theory]
    [InlineData(1UL)]
    [InlineData(7UL)]
    [InlineData(13UL)]
    [InlineData(123456789UL)]
    [InlineData(0xDEADBEEFCAFEUL)]
    public void No_undoing_of_a_seat_seed_finds_the_game_seed(ulong seed)
    {
        foreach (var p in Powers.All)
        {
            // The undoing works: a seed drawn from a stream of the game's seed gives the game's seed back...
            Assert.Equal(seed, Undo(Rng.For(seed, 0, "seat", p.ToString()).NextULong(), p));
            // ...but the seat seed, a SHA-256 hash, does not.
            Assert.NotEqual(seed, Undo(ScriptLeader.SeatSeed(seed, p), p));
        }
    }

    [Fact]
    public void A_seat_seed_is_the_head_of_a_sha256_hash_of_the_game_seed_seat_and_the_power()
    {
        var input = new byte[8].Concat(Encoding.UTF8.GetBytes("seat:Hatti")).ToArray();
        BinaryPrimitives.WriteUInt64LittleEndian(input, 42);
        Assert.Equal(BinaryPrimitives.ReadUInt64LittleEndian(SHA256.HashData(input)), ScriptLeader.SeatSeed(42, Power.Hatti));
    }
}
