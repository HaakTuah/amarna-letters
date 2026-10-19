using System.Numerics;

namespace Amarna.Engine;

/// <summary>
/// The game's measure of a kingdom, in one place, so that the engine's score, a seat's own strength line and the script
/// kings' reckoning agree on it.
/// </summary>
public static class Scoring
{
    /// <summary>
    /// Strength = weight × (base yield of the land held) + gold − back pay owed. The engine scores a power's true gold and
    /// the back pay it really owes; a seat sees its ledger and the back pay it believes it owes; a script king reckons a
    /// rival's with none owed, since it cannot see it. Growth is strength over starting strength.
    /// </summary>
    public static T Strength<T>(T weight, T landYield, T gold, T owed) where T : INumber<T> => weight * landYield + gold - owed;

    /// <inheritdoc cref="Strength{T}"/>
    public static int Strength(GameConfig c, int landYield, int gold, int owed) => Strength(c.ProvinceWeight, landYield, gold, owed);
}
