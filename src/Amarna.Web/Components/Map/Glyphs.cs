using Amarna.Engine;

namespace Amarna.Web.Components.Map;

/// <summary>
/// The board's original icons and each power's emblem and border line, drawn once in the map's &lt;defs&gt; and reused
/// with &lt;use&gt;. Every glyph sits in a box centred on 0,0, about 20 units across.
/// </summary>
public static class Glyphs
{
    /// <summary>
    /// Each power's emblem, so that it can be told apart without its colour: Egypt's lotus, Hatti's sun ("My Sun", as
    /// the Hittite king was addressed), Babylon's eight-pointed star, Mitanni's winged disc, Assyria's spearhead,
    /// Arzawa's crescent (Arma, the Luwian moon) and Alashiya's jug (Cypriot jugs went all over the sea).
    /// </summary>
    public static string Emblem(Power p) => p switch
    {
        Power.Egypt => "M0,7C-2.4,3 -2.4,-2.5 0,-7.5C2.4,-2.5 2.4,3 0,7Z M0,7C-4.5,5 -7.5,1 -7.5,-4C-4.5,-2 -2,1.5 0,7Z M0,7C4.5,5 7.5,1 7.5,-4C4.5,-2 2,1.5 0,7Z",
        Power.Hatti => "M0,-3.6A3.6,3.6 0 1,1 0,3.6A3.6,3.6 0 1,1 0,-3.6Z M0,-8.2L1.3,-5L-1.3,-5Z M0,8.2L1.3,5L-1.3,5Z M-8.2,0L-5,1.3L-5,-1.3Z M8.2,0L5,1.3L5,-1.3Z M5.8,-5.8L4.4,-2.6L2.6,-4.4Z M-5.8,5.8L-4.4,2.6L-2.6,4.4Z M-5.8,-5.8L-2.6,-4.4L-4.4,-2.6Z M5.8,5.8L2.6,4.4L4.4,2.6Z",
        Power.Babylonia => "M0,-8L1.6,-3.9L5.7,-5.7L3.9,-1.6L8,0L3.9,1.6L5.7,5.7L1.6,3.9L0,8L-1.6,3.9L-5.7,5.7L-3.9,1.6L-8,0L-3.9,-1.6L-5.7,-5.7L-1.6,-3.9Z",
        Power.Mitanni => "M0,-3A3,3 0 1,1 0,3A3,3 0 1,1 0,-3Z M-3.6,-1L-8.6,-4.4L-7.6,-1.6L-9,0.6L-6.2,0.6L-7.2,2.8L-3.4,1.2Z M3.6,-1L8.6,-4.4L7.6,-1.6L9,0.6L6.2,0.6L7.2,2.8L3.4,1.2Z",
        Power.Assyria => "M0,-8.5L5,0L1.6,-0.6L1.6,8L-1.6,8L-1.6,-0.6L-5,0Z",
        Power.Arzawa => "M2.5,-7.2A7.6,7.6 0 1,0 2.5,7.2A6,6 0 1,1 2.5,-7.2Z",
        Power.Alashiya => "M-2,-8H2V-6.2C2,-5.2 4.8,-4.4 5.8,-1.4C6.8,2.2 4.6,6.4 0,7.6C-4.6,6.4 -6.8,2.2 -5.8,-1.4C-4.8,-4.4 -2,-5.2 -2,-6.2Z M5.4,-4.2C9.4,-4.6 9.6,0.6 6.2,1.6L5.8,0.4C8,-0.2 7.8,-3 5.6,-2.8Z",
        _ => "",
    };

    /// <summary>The border line each power draws inside its land, so borders too can be told apart without colour.</summary>
    public static string Dash(Power p) => p switch
    {
        Power.Egypt => "none",
        Power.Hatti => "10 4",
        Power.Babylonia => "2 3",
        Power.Mitanni => "10 3 2 3",
        Power.Assyria => "5 3",
        Power.Arzawa => "14 3 2 3 2 3",
        Power.Alashiya => "1 2 6 2",
        _ => "none",
    };

    public static string Id(Power p) => p.ToString().ToLowerInvariant();

    /// <summary>A war chariot, wheel and car and pole: the board's army.</summary>
    public const string Chariot =
        "M-9.5,-2.5L1.5,-2.5L3,-8.5L-7.5,-8.5Z M1.5,-2.5L10.5,-6.5L10.9,-5.3L2.4,-1.3Z "
        + "M-3.5,-1.8A5.6,5.6 0 1,1 -3.5,9.4A5.6,5.6 0 1,1 -3.5,-1.8Z M-3.5,0.3A3.5,3.5 0 1,0 -3.5,7.3A3.5,3.5 0 1,0 -3.5,0.3Z "
        + "M-4.2,0.6H-2.8V7H-4.2Z M-6.7,3.1H-0.3V4.5H-6.7Z";

    /// <summary>A ship with a square sail and a raised stern: the board's fleet.</summary>
    public const string Ship =
        "M-11,1.5L11,1.5C9,6.5 4,8 0,8C-5,8 -9,6.5 -11,1.5Z M-11,1.5L-12.6,-3.6L-10.4,-3.4L-9,1.5Z M10.2,1.5L12.4,-2.2L11.2,-3.2L8.6,1.5Z "
        + "M-0.7,1.5V-10H0.7V1.5Z M-7,-9.4H7L6,-2.2H-6Z";

    /// <summary>A clay tablet with wedges: an envoy.</summary>
    public const string Tablet =
        "M-6,-8.5H6A2.5,2.5 0 0 1 8.5,-6V6A2.5,2.5 0 0 1 6,8.5H-6A2.5,2.5 0 0 1 -8.5,6V-6A2.5,2.5 0 0 1 -6,-8.5Z";
    public const string TabletMarks = "M-5,-4.5L-2.5,-3.6L-5,-2.7Z M-1,-4.5L1.5,-3.6L-1,-2.7Z M3,-4.5L5.5,-3.6L3,-2.7Z M-5,0L-2.5,0.9L-5,1.8Z M-1,0L1.5,0.9L-1,1.8Z M-5,4.5L-2.5,5.4L-5,6.3Z M-1,4.5L1.5,5.4L-1,6.3Z M3,4.5L5.5,5.4L3,6.3Z";

    /// <summary>An eye: a spy at its post.</summary>
    public const string Eye = "M-9,0C-5,-6.5 5,-6.5 9,0C5,6.5 -5,6.5 -9,0Z";
    public const string Pupil = "M0,-3.2A3.2,3.2 0 1,1 0,3.2A3.2,3.2 0 1,1 0,-3.2Z";

    /// <summary>An oxhide ingot: gold on the road.</summary>
    public const string Ingot = "M-9,-6L-3.4,-4.2H3.4L9,-6L7,0L9,6L3.4,4.2H-3.4L-9,6L-7,0Z";

    /// <summary>Two linked rings: a captive, or a detained envoy.</summary>
    public const string Fetter = "M-4,-5A5,5 0 1,1 -4,5A5,5 0 1,1 -4,-5Z M-4,-2.6A2.6,2.6 0 1,0 -4,2.6A2.6,2.6 0 1,0 -4,-2.6Z M4,-5A5,5 0 1,1 4,5A5,5 0 1,1 4,-5Z M4,-2.6A2.6,2.6 0 1,0 4,2.6A2.6,2.6 0 1,0 4,-2.6Z";

    /// <summary>A crown-like city with walls: a capital.</summary>
    public const string Capital = "M-8,6V-3L-5,-6L-2,-3L0,-8L2,-3L5,-6L8,-3V6Z";

    /// <summary>A burst for an attack.</summary>
    public const string Burst = "M0,-8L2,-3L7,-5L4,-1L8,2L3,2.5L2,8L0,3.5L-2,8L-3,2.5L-8,2L-4,-1L-7,-5L-2,-3Z";

    /// <summary>A sleeping seat: a crescent with a star.</summary>
    public const string Moon = "M2,-7A7,7 0 1,0 2,7A5.5,5.5 0 1,1 2,-7Z";
}
