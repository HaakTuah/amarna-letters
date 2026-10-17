namespace Amarna.Engine;

/// <summary>The seven Great Kings of the Amarna correspondence.</summary>
public enum Power { Egypt, Hatti, Babylonia, Mitanni, Assyria, Arzawa, Alashiya }

public enum Tier { Strong, Middle, Weak }

public static class Powers
{
    public static readonly IReadOnlyList<Power> All = Enum.GetValues<Power>();

    public static Tier Tier(this Power p) => p switch
    {
        Power.Egypt or Power.Hatti or Power.Babylonia => Engine.Tier.Strong,
        Power.Mitanni or Power.Assyria => Engine.Tier.Middle,
        _ => Engine.Tier.Weak,
    };

    /// <summary>The land's name as it appears in letters.</summary>
    public static string Land(this Power p) => p switch
    {
        Power.Hatti => "Hatti",
        Power.Babylonia => "Karduniash",
        Power.Mitanni => "Mitanni",
        _ => p.ToString(),
    };

    /// <summary>The reigning king, by the names the letters use.</summary>
    public static string King(this Power p) => p switch
    {
        Power.Egypt => "Napkhururiya",
        Power.Hatti => "Suppiluliuma",
        Power.Babylonia => "Burna-Buriash",
        Power.Mitanni => "Tushratta",
        Power.Assyria => "Ashur-uballit",
        Power.Arzawa => "Tarhundaradu",
        Power.Alashiya => "the King of Alashiya",
        _ => p.ToString(),
    };

    public static string Adjective(this Power p) => p switch
    {
        Power.Egypt => "Egyptian",
        Power.Hatti => "Hittite",
        Power.Babylonia => "Babylonian",
        Power.Mitanni => "Mitannian",
        Power.Assyria => "Assyrian",
        Power.Arzawa => "Arzawan",
        Power.Alashiya => "Alashiyan",
        _ => p.ToString(),
    };

    public static bool TryParse(string? s, out Power power)
    {
        power = default;
        if (string.IsNullOrWhiteSpace(s)) return false;
        s = s.Trim();
        if (Enum.TryParse(s, ignoreCase: true, out power)) return true;
        foreach (var p in All)
            if (string.Equals(p.Land(), s, StringComparison.OrdinalIgnoreCase)) { power = p; return true; }
        return false;
    }
}
