using System.Globalization;
using System.Text;
using Amarna.Engine;

namespace Amarna.Web.Components.Map;

public readonly record struct Pt(double X, double Y)
{
    public static Pt operator +(Pt a, Pt b) => new(a.X + b.X, a.Y + b.Y);
    public static Pt operator -(Pt a, Pt b) => new(a.X - b.X, a.Y - b.Y);
    public static Pt operator *(Pt a, double k) => new(a.X * k, a.Y * k);
    public double Length => Math.Sqrt(X * X + Y * Y);
    public Pt Unit => Length < 1e-9 ? new(0, 0) : new(X / Length, Y / Length);
    public Pt Normal => new(-Y, X);
}

/// <summary>A label's place relative to its province's city.</summary>
public readonly record struct LabelSpot(double Dx, double Dy, string Anchor = "middle");

/// <summary>
/// The drawn geography of the board: coasts, seas, rivers, mountains, deserts, the province shapes, and where each
/// province's city, units and label sit. Pure drawing data, computed once; the game's own map data (provinces,
/// connections, terrain) comes from the engine. Coordinates are the engine's 1000 x 720 board.
/// </summary>
public static class MapArt
{
    public const double Width = 1000, Height = 720;
    private static readonly WorldMap Map = WorldMap.Default;

    public static string F(double v) => v.ToString("0.#", CultureInfo.InvariantCulture);

    // ---------------------------------------------------------------- coasts

    /// <summary>The Great Green (the Mediterranean), from the Aegean shore round to the Egyptian coast.</summary>
    public static readonly Pt[] Mediterranean = P(
        -300, -300, 36, -300, 34, 0, 41, 28, 30, 56, 47, 80, 40, 108, 53, 130, 38, 152, 33, 180, 43, 204, 30, 228, 50, 246, 80, 252, 110, 266,
        140, 286, 172, 300, 205, 296, 228, 281, 262, 272, 300, 268, 330, 276, 362, 283, 398, 291, 428, 281, 452, 272, 467, 285,
        461, 303, 457, 326, 465, 351, 469, 372, 461, 398, 455, 424, 452, 452, 448, 480, 446, 505, 446, 530, 440, 556, 432, 580,
        414, 589, 392, 586, 372, 580, 352, 573, 334, 575, 316, 578, 296, 583, 268, 588, 238, 593, 198, 599, 158, 604, 118, 607,
        78, 610, 38, 612, 0, 614, -300, 640);

    /// <summary>Alashiya, the copper island.</summary>
    public static readonly Pt[] Cyprus = P(
        240, 419, 251, 401, 274, 391, 305, 386, 336, 382, 360, 376, 386, 367, 410, 354, 421, 349, 415, 362, 399, 379, 389, 397,
        372, 412, 350, 422, 320, 430, 290, 436, 262, 432, 244, 427);

    /// <summary>A sliver of the Black Sea along the top edge, north of Hatti.</summary>
    public static readonly Pt[] BlackSea = P(196, -300, 206, 0, 222, 11, 262, 19, 302, 22, 346, 20, 400, 24, 452, 18, 500, 14, 542, 16, 582, 10, 612, 0, 650, -300);

    /// <summary>The Lower Sea (the Gulf), in the corner beyond Ur.</summary>
    public static readonly Pt[] Gulf = P(1300, 560, 1000, 606, 990, 626, 982, 650, 972, 676, 962, 700, 955, 720, 948, 1000, 1300, 1000);

    public static string Polygon(IReadOnlyList<Pt> pts)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < pts.Count; i++) sb.Append(i == 0 ? "M" : "L").Append(F(pts[i].X)).Append(',').Append(F(pts[i].Y));
        return sb.Append('Z').ToString();
    }

    /// <summary>A closed shape drawn with smooth curves through its points (for the coasts).</summary>
    public static string SmoothClosed(IReadOnlyList<Pt> pts) => Smooth(pts, closed: true);

    /// <summary>All the land, as one path (a rectangle with the seas cut out, even-odd).</summary>
    public static readonly string LandPath = $"M-300,-300H1300V1000H-300Z {SmoothClosed(Mediterranean)} {SmoothClosed(BlackSea)} {SmoothClosed(Gulf)}";

    public static readonly string SeaPath = $"{SmoothClosed(Mediterranean)} {SmoothClosed(BlackSea)} {SmoothClosed(Gulf)}";

    public static readonly string CyprusPath = SmoothClosed(Cyprus);

    // ---------------------------------------------------------------- rivers, mountains, deserts, fields

    public sealed record Line(string Id, string Name, string Path, double Width, bool Labelled);

    /// <summary>The rivers: the three great ones of the engine's <see cref="Geography.Rivers"/> first, then smaller ones for the eye.</summary>
    public static readonly IReadOnlyList<Line> Rivers =
    [
        new("nile", "Nile", Smooth(P(0, 707, 45, 709, 90, 707, 140, 703, 195, 699, 245, 690, 290, 677, 316, 654, 330, 630)), 4.2, true),
        new("nile-w", "", Smooth(P(330, 630, 319, 606, 312, 578)), 2.4, false),
        new("nile-e", "", Smooth(P(330, 630, 352, 607, 366, 578)), 2.4, false),
        new("euphrates", "Euphrates", Smooth(P(604, 40, 594, 88, 586, 138, 579, 186, 576, 228, 590, 252, 624, 263, 662, 273, 700, 291,
            713, 322, 709, 360, 708, 397, 731, 421, 768, 440, 797, 472, 808, 522, 842, 553, 882, 582, 924, 630, 940, 680, 960, 702)), 3.6, true),
        new("tigris", "Tigris", Smooth(P(800, 34, 822, 70, 841, 102, 846, 142, 842, 182, 836, 222, 830, 262, 826, 300, 828, 334,
            838, 364, 862, 404, 886, 452, 906, 500, 926, 546, 944, 600, 958, 640, 970, 678)), 3.4, true),
        new("khabur", "Khabur", Smooth(P(684, 100, 711, 150, 717, 200, 714, 250, 703, 290)), 1.8, false),
        new("balikh", "", Smooth(P(632, 178, 641, 224, 646, 266)), 1.5, false),
        new("halys", "Marassantiya", Smooth(P(530, 118, 472, 138, 420, 140, 345, 134, 302, 108, 296, 70, 312, 40, 332, 21)), 2.2, false),
        new("orontes", "Orontes", Smooth(P(562, 478, 566, 422, 588, 362, 586, 318, 548, 291, 506, 284, 470, 287)), 1.9, false),
    ];

    /// <summary>Mountain ranges, drawn as rows of peaks along these lines.</summary>
    public static readonly IReadOnlyList<Pt[]> Ranges =
    [
        P(206, 236, 252, 224, 300, 217, 346, 221, 392, 218, 440, 212, 478, 204), // the Taurus
        P(476, 214, 486, 244, 482, 270), // the Amanus
        P(612, 36, 650, 30, 690, 32, 732, 40, 770, 40), // the highlands of Isuwa and Nairi
        P(960, 92, 978, 140, 988, 196, 991, 256, 989, 320, 994, 384), // the Zagros
        P(506, 398, 514, 436, 518, 476), // the Lebanon
        P(268, 414, 288, 418, 308, 416), // the Troodos
        P(140, 120, 150, 168), // the hills of Mira
        P(20, 640, 48, 652, 30, 680), // desert scarps west of the Nile
    ];

    /// <summary>Deserts, drawn with a stipple: the Syrian and Arabian deserts and the Sinai.</summary>
    public static readonly IReadOnlyList<string> Deserts =
    [
        SmoothClosed(P(604, 498, 640, 454, 700, 452, 760, 476, 784, 534, 766, 600, 700, 640, 622, 622, 590, 560)),
        SmoothClosed(P(392, 640, 446, 612, 500, 628, 522, 688, 472, 716, 408, 712)),
        SmoothClosed(P(530, 700, 600, 660, 700, 672, 800, 642, 870, 690, 905, 720, 520, 720)),
    ];

    /// <summary>The irrigated black land of the Nile and the alluvium between the rivers below Sippar: the richest fields.</summary>
    public static readonly IReadOnlyList<string> Fields =
    [
        SmoothClosed(P(0, 694, 90, 692, 195, 686, 290, 664, 318, 640, 300, 600, 330, 588, 372, 590, 350, 620, 330, 660, 300, 690, 200, 714, 90, 720, 0, 720)),
        SmoothClosed(P(724, 412, 790, 420, 862, 392, 900, 450, 940, 560, 968, 650, 948, 700, 920, 660, 870, 590, 820, 548, 790, 490, 750, 450)),
    ];

    /// <summary>Points where the rivers' and ranges' names are written.</summary>
    public static readonly IReadOnlyList<(string Text, double X, double Y, double Angle)> GeoLabels =
    [
        ("NILE", 150, 716, -3), ("EUPHRATES", 640, 255, 15), ("TIGRIS", 830, 285, 86), ("TAURUS", 300, 236, -4),
        ("ZAGROS", 978, 300, 88), ("SYRIAN DESERT", 690, 545, 0), ("SINAI", 470, 700, 0), ("LOWER SEA", 983, 690, -66),
        ("ARABIAN DESERT", 700, 708, 0), ("LEBANON", 527, 470, -80), ("KHABUR", 724, 210, 84), ("ORONTES", 600, 395, -72),
    ];

    // ---------------------------------------------------------------- province shapes

    /// <summary>
    /// Points that claim the empty land no province holds (the deserts and the Zagros), so the provinces next to them do
    /// not swell across it. Their shapes are left unclaimed.
    /// </summary>
    private static readonly Pt[] Wastes = P(660, 520, 712, 600, 600, 640, 790, 668, 540, 690, 985, 330, 640, 22, 980, 30);

    /// <summary>Each province's shape: land shapes clipped to their coast by the land path, sea zones to the sea.</summary>
    public static readonly IReadOnlyDictionary<string, string> Shapes = BuildShapes();

    private static Dictionary<string, string> BuildShapes()
    {
        var cyprus = new HashSet<string> { "tamassos", "enkomi" };
        var land = Map.Provinces.Where(p => !p.IsSea && !cyprus.Contains(p.Id)).ToList();
        var sea = Map.Provinces.Where(p => p.IsSea).ToList();
        var island = Map.Provinces.Where(p => cyprus.Contains(p.Id)).ToList();
        var shapes = new Dictionary<string, string>();
        void Group(List<Province> group, IEnumerable<Pt> extra, double wobble)
        {
            var sites = group.Select(p => (p.Id, Pt: new Pt(p.X, p.Y))).Concat(extra.Select((e, i) => ($"~{i}", e))).ToList();
            foreach (var (id, cell) in Voronoi.Cells(sites, wobble))
                if (!id.StartsWith('~')) shapes[id] = cell;
        }
        Group(land, Wastes, 5);
        Group(sea, [], 0);
        Group(island, [], 3);
        return shapes;
    }

    public static readonly IReadOnlyList<string> WasteShapes = Voronoi.Cells(
            Map.Provinces.Where(p => !p.IsSea && p.Id is not ("tamassos" or "enkomi")).Select(p => (p.Id, new Pt(p.X, p.Y)))
                .Concat(Wastes.Select((e, i) => ($"~{i}", e))).ToList(), 5)
        .Where(c => c.Id.StartsWith('~')).Select(c => c.Path).ToList();

    // ---------------------------------------------------------------- places on the board

    public static Pt City(string id) => new(Map[id].X, Map[id].Y);

    /// <summary>
    /// The point a province's units and arrows are anchored to: its city. The tokens themselves stand above it (the
    /// stylesheet lifts them by their own height, which grows when the map is small on screen), so the city's seal, which
    /// shows the owner, stays in view below them.
    /// </summary>
    public static Pt UnitSpot(string id) => City(id);

    // Names hang below their city (the units stand above it), except where a river, the coast or a neighbour is in the way.
    private static readonly Dictionary<string, LabelSpot> LabelOverrides = new()
    {
        ["thebes"] = new(13, 4, "start"), ["akhetaten"] = new(13, 4, "start"), ["memphis"] = new(13, 4, "start"), ["delta"] = new(-13, 4, "end"),
        ["gaza"] = new(13, 4, "start"), ["tyre"] = new(13, 4, "start"), ["byblos"] = new(13, 4, "start"), ["amurru"] = new(13, 4, "start"),
        ["ugarit"] = new(13, 4, "start"), ["qadesh"] = new(13, 4, "start"), ["damascus"] = new(13, 4, "start"), ["megiddo"] = new(13, 4, "start"),
        ["babylon"] = new(13, 4, "start"), ["terqa"] = new(-13, 4, "end"), ["mari"] = new(-13, 4, "end"), ["sippar"] = new(-13, 4, "end"),
        ["nippur"] = new(-13, 4, "end"), ["ur"] = new(-13, 4, "end"), ["susa"] = new(-4, 21),
    };

    public static LabelSpot LabelAt(string id) => LabelOverrides.TryGetValue(id, out var s) ? s : new(0, 21);

    // ---------------------------------------------------------------- roads for travellers

    private static readonly Dictionary<(string, string), Pt[]> Routes = new();

    /// <summary>
    /// The shortest path between two provinces over every kind of connection, as points through their cities. The engine
    /// keeps no route for a traveller, only a departure and an arrival season, so this is a guess, drawn as one.
    /// </summary>
    public static Pt[] Route(string from, string to)
    {
        lock (Routes)
        {
            if (Routes.TryGetValue((from, to), out var cached)) return cached;
            var prev = new Dictionary<string, string?> { [from] = null };
            var queue = new Queue<string>();
            queue.Enqueue(from);
            while (queue.Count > 0 && !prev.ContainsKey(to))
            {
                var cur = queue.Dequeue();
                foreach (var n in Map.Neighbors(cur).Distinct().OrderBy(n => n, StringComparer.Ordinal))
                    if (prev.TryAdd(n, cur)) queue.Enqueue(n);
            }
            var ids = new List<string>();
            for (string? at = prev.ContainsKey(to) ? to : null; at is not null; at = prev[at]) ids.Add(at);
            ids.Reverse();
            if (ids.Count == 0) ids = [from, to];
            var pts = ids.Select(City).ToArray();
            Routes[(from, to)] = pts;
            return pts;
        }
    }

    /// <summary>A point a fraction of the way along a polyline.</summary>
    public static Pt Along(IReadOnlyList<Pt> pts, double t)
    {
        if (pts.Count == 1) return pts[0];
        var total = 0.0;
        for (var i = 1; i < pts.Count; i++) total += (pts[i] - pts[i - 1]).Length;
        var want = Math.Clamp(t, 0, 1) * total;
        for (var i = 1; i < pts.Count; i++)
        {
            var seg = (pts[i] - pts[i - 1]).Length;
            if (want <= seg || i == pts.Count - 1) return pts[i - 1] + (pts[i] - pts[i - 1]) * (seg < 1e-9 ? 0 : Math.Min(1, want / seg));
            want -= seg;
        }
        return pts[^1];
    }

    // ---------------------------------------------------------------- path helpers

    private static Pt[] P(params double[] xy)
    {
        var pts = new Pt[xy.Length / 2];
        for (var i = 0; i < pts.Length; i++) pts[i] = new(xy[2 * i], xy[2 * i + 1]);
        return pts;
    }

    /// <summary>A Catmull-Rom curve through the points, as cubic Béziers.</summary>
    public static string Smooth(IReadOnlyList<Pt> pts, bool closed = false)
    {
        var n = pts.Count;
        if (n < 3) return n == 2 ? $"M{F(pts[0].X)},{F(pts[0].Y)}L{F(pts[1].X)},{F(pts[1].Y)}" : "";
        Pt At(int i) => closed ? pts[((i % n) + n) % n] : pts[Math.Clamp(i, 0, n - 1)];
        var sb = new StringBuilder($"M{F(pts[0].X)},{F(pts[0].Y)}");
        var segs = closed ? n : n - 1;
        for (var i = 0; i < segs; i++)
        {
            Pt p0 = At(i - 1), p1 = At(i), p2 = At(i + 1), p3 = At(i + 2);
            var c1 = p1 + (p2 - p0) * (1 / 6.0);
            var c2 = p2 - (p3 - p1) * (1 / 6.0);
            sb.Append($"C{F(c1.X)},{F(c1.Y)} {F(c2.X)},{F(c2.Y)} {F(p2.X)},{F(p2.Y)}");
        }
        if (closed) sb.Append('Z');
        return sb.ToString();
    }

    /// <summary>A gentle curve between two points (arrows, routes), bowed to one side so opposite moves do not overlap.</summary>
    public static string Arc(Pt a, Pt b, double bow = 0.12)
    {
        var mid = (a + b) * 0.5;
        var d = b - a;
        var c = mid + d.Normal * bow;
        return $"M{F(a.X)},{F(a.Y)}Q{F(c.X)},{F(c.Y)} {F(b.X)},{F(b.Y)}";
    }

    /// <summary>The point a fraction of the way along <see cref="Arc"/>.</summary>
    public static Pt ArcAt(Pt a, Pt b, double t, double bow = 0.12)
    {
        var mid = (a + b) * 0.5;
        var c = mid + (b - a).Normal * bow;
        var u = 1 - t;
        return a * (u * u) + c * (2 * u * t) + b * (t * t);
    }

    /// <summary>Peaks along a range: small hachured triangles every few units.</summary>
    public static string Peaks(IReadOnlyList<Pt> line, double spacing = 15, double size = 7)
    {
        var sb = new StringBuilder();
        var total = 0.0;
        for (var i = 1; i < line.Count; i++) total += (line[i] - line[i - 1]).Length;
        var count = Math.Max(1, (int)(total / spacing));
        for (var k = 0; k <= count; k++)
        {
            var p = Along(line, count == 0 ? 0 : (double)k / count);
            var s = size * (0.8 + 0.4 * Hash01(k * 7 + (int)p.X));
            sb.Append($"M{F(p.X - s)},{F(p.Y + s * 0.45)}L{F(p.X)},{F(p.Y - s * 0.75)}L{F(p.X + s)},{F(p.Y + s * 0.45)}");
        }
        return sb.ToString();
    }

    public static double Hash01(int n)
    {
        unchecked
        {
            var x = (uint)n * 2654435761u;
            x ^= x >> 13;
            x *= 0x5bd1e995;
            x ^= x >> 15;
            return (x & 0xFFFF) / 65535.0;
        }
    }
}

/// <summary>
/// Province shapes as Voronoi cells of the cities, each edge between two cells wobbled the same way from both sides so
/// the borders look drawn by hand rather than ruled.
/// </summary>
internal static class Voronoi
{
    private readonly record struct V(Pt P, string Edge);

    public static List<(string Id, string Path)> Cells(List<(string Id, Pt Pt)> sites, double wobble)
    {
        var result = new List<(string, string)>();
        foreach (var (id, a) in sites)
        {
            var poly = new List<V>
            {
                new(new(-20, -20), "#"), new(new(MapArt.Width + 20, -20), "#"), new(new(MapArt.Width + 20, MapArt.Height + 20), "#"), new(new(-20, MapArt.Height + 20), "#"),
            };
            foreach (var (other, b) in sites)
            {
                if (other == id) continue;
                poly = Clip(poly, a, b, other);
                if (poly.Count == 0) break;
            }
            if (poly.Count < 3) continue;
            result.Add((id, Path(poly, id, wobble)));
        }
        return result;
    }

    /// <summary>Keeps the part of the polygon closer to <paramref name="a"/> than to <paramref name="b"/> (Sutherland-Hodgman).</summary>
    private static List<V> Clip(List<V> poly, Pt a, Pt b, string label)
    {
        var n = b - a;
        var c = (b.X * b.X + b.Y * b.Y - a.X * a.X - a.Y * a.Y) / 2;
        double Side(Pt p) => n.X * p.X + n.Y * p.Y - c; // <= 0 inside
        var output = new List<V>();
        for (var i = 0; i < poly.Count; i++)
        {
            var cur = poly[i];
            var next = poly[(i + 1) % poly.Count];
            var sc = Side(cur.P);
            var sn = Side(next.P);
            Pt Cross() => cur.P + (next.P - cur.P) * (sc / (sc - sn));
            if (sc <= 0)
            {
                output.Add(cur);
                if (sn > 0) output.Add(new(Cross(), label));
            }
            else if (sn <= 0)
            {
                output.Add(new(Cross(), cur.Edge));
            }
        }
        return output;
    }

    private static string Path(List<V> poly, string id, double wobble)
    {
        var sb = new StringBuilder();
        for (var i = 0; i < poly.Count; i++)
        {
            var cur = poly[i];
            var next = poly[(i + 1) % poly.Count];
            if (i == 0) sb.Append($"M{MapArt.F(cur.P.X)},{MapArt.F(cur.P.Y)}");
            // Every edge between two sites wobbles (the bounding frame's do not: the coast clips them anyway).
            if (wobble > 0 && cur.Edge != "#")
                foreach (var w in Wobble(cur.P, next.P, id, cur.Edge, wobble)) sb.Append($"L{MapArt.F(w.X)},{MapArt.F(w.Y)}");
            sb.Append($"L{MapArt.F(next.P.X)},{MapArt.F(next.P.Y)}");
        }
        return sb.Append('Z').ToString();
    }

    /// <summary>
    /// Points between two corners of a shared edge, displaced to one side and the other. The same for both cells: the
    /// displacement is drawn in a fixed direction (from the lower corner to the higher) from a seed of the two sites.
    /// </summary>
    private static IEnumerable<Pt> Wobble(Pt from, Pt to, string a, string b, double amp)
    {
        var len = (to - from).Length;
        if (len < 12) yield break;
        var forward = from.X < to.X - 1e-6 || Math.Abs(from.X - to.X) <= 1e-6 && from.Y < to.Y;
        var (p, q) = forward ? (from, to) : (to, from);
        var key = string.CompareOrdinal(a, b) < 0 ? a + "|" + b : b + "|" + a;
        var seed = key.Aggregate(17, (h, ch) => unchecked(h * 31 + ch));
        var steps = Math.Max(2, (int)(len / 9));
        var normal = (q - p).Unit.Normal;
        var pts = new List<Pt>();
        for (var k = 1; k < steps; k++)
        {
            var t = (double)k / steps;
            var envelope = Math.Sin(Math.PI * t);
            var off = (Math.Sin(t * Math.PI * 3 + seed % 7) * 0.6 + (MapArt.Hash01(seed + k * 13) - 0.5) * 0.8) * amp * envelope;
            pts.Add(p + (q - p) * t + normal * off);
        }
        if (!forward) pts.Reverse();
        foreach (var x in pts) yield return x;
    }
}
