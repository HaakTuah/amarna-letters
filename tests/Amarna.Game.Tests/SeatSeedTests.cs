using System.Buffers.Binary;
using System.Security.Cryptography;
using System.Text;
using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// A script seat's seed is one-way: it is a SHA-256 hash of the game's seed, so no undoing of the generator's steps leads
/// back to the seed the engine rolls with. (Until save version 7 a test undid a stream of the old 64-bit generator step by
/// step to show that the undoing works on a stream but not on a seat seed; the 32-bit generator's keyed hash is as
/// invertible, and the seat seed as one-way, so the remaining tests pin the hash itself.)
/// </summary>
public class SeatSeedTests
{
    [Theory]
    [InlineData(1UL)]
    [InlineData(7UL)]
    [InlineData(13UL)]
    [InlineData(123456789UL)]
    [InlineData(0xDEADBEEFCAFEUL)]
    public void A_seat_seed_is_neither_the_game_seed_nor_another_seats(ulong seed)
    {
        var seeds = Powers.All.Select(p => ScriptLeader.SeatSeed(seed, p)).ToList();
        Assert.DoesNotContain(seed, seeds);
        Assert.Equal(seeds.Count, seeds.Distinct().Count());
        // Cut to 53 bits, so the TypeScript build holds it as an exact number.
        Assert.All(seeds, x => Assert.True(x < 1UL << 53));
    }

    [Fact]
    public void A_seat_seed_is_the_head_of_a_sha256_hash_cut_to_53_bits_of_the_game_seed_seat_and_the_power()
    {
        var input = new byte[8].Concat(Encoding.UTF8.GetBytes("seat:Hatti")).ToArray();
        BinaryPrimitives.WriteUInt64LittleEndian(input, 42);
        Assert.Equal(BinaryPrimitives.ReadUInt64LittleEndian(SHA256.HashData(input)) & ((1UL << 53) - 1), ScriptLeader.SeatSeed(42, Power.Hatti));
    }
}
