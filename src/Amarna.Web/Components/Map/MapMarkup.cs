using System.Text;
using Amarna.Engine;
using static Amarna.Web.Components.Map.MapArt;

namespace Amarna.Web.Components.Map;

/// <summary>
/// The parts of the map that never change during a game, written once as plain SVG markup: Blazor then holds each as a
/// single frame and never diffs it again. Colours come from CSS variables, so light and dark modes need no re-render.
/// </summary>
public static class MapMarkup
{
    private static readonly WorldMap Map = WorldMap.Default;

    /// <summary>Shared definitions: patterns, clip paths, the icons and emblems, and the arrowheads.</summary>
    public static readonly string Defs = BuildDefs();

    /// <summary>Sea, land, fields, deserts, rivers, mountains, coasts, crossings and the names of the land.</summary>
    public static readonly string Base = BuildBase();

    /// <summary>Province names, above the borders and below the pieces.</summary>
    public static readonly string Labels = BuildLabels();

    private static string BuildDefs()
    {
        var sb = new StringBuilder("<defs>");
        // Fertility: the richer the land, the closer its furrows.
        foreach (var (tier, gap) in new[] { (1, 13), (2, 9), (3, 6.5), (4, 4.6) })
            sb.Append($"<pattern id=\"fert{tier}\" patternUnits=\"userSpaceOnUse\" width=\"{F(gap)}\" height=\"{F(gap)}\" patternTransform=\"rotate(-28)\">"
                      + $"<line x1=\"0\" y1=\"0\" x2=\"{F(gap)}\" y2=\"0\" class=\"furrow\"/></pattern>");
        sb.Append("<pattern id=\"stipple\" patternUnits=\"userSpaceOnUse\" width=\"9\" height=\"9\"><circle cx=\"2\" cy=\"2\" r=\".8\" class=\"sand\"/><circle cx=\"6.5\" cy=\"6\" r=\".65\" class=\"sand\"/></pattern>");
        sb.Append("<pattern id=\"waves\" patternUnits=\"userSpaceOnUse\" width=\"26\" height=\"12\"><path d=\"M0,6q6.5,-4 13,0t13,0\" class=\"wave\"/></pattern>");
        // Fog: a veil of fine hatching, so the colours of ownership still show through it.
        sb.Append("<pattern id=\"fog\" patternUnits=\"userSpaceOnUse\" width=\"5\" height=\"5\" patternTransform=\"rotate(45)\"><rect width=\"5\" height=\"2.6\" class=\"veil\"/></pattern>");
        sb.Append("<pattern id=\"fogsea\" patternUnits=\"userSpaceOnUse\" width=\"5\" height=\"5\" patternTransform=\"rotate(45)\"><rect width=\"5\" height=\"2.6\" class=\"veil-sea\"/></pattern>");
        sb.Append($"<clipPath id=\"landclip\"><path d=\"{LandPath} {CyprusPath}\" clip-rule=\"evenodd\"/></clipPath>");
        sb.Append($"<clipPath id=\"seaclip\"><path d=\"{SmoothClosed(Mediterranean)} {CyprusPath}\" clip-rule=\"evenodd\"/></clipPath>");
        foreach (var (id, d) in Shapes)
            sb.Append($"<clipPath id=\"cl-{id}\"><path d=\"{d}\"/></clipPath>");
        foreach (var p in Powers.All)
            sb.Append($"<symbol id=\"em-{Glyphs.Id(p)}\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Emblem(p)}\"/></symbol>");
        sb.Append($"<symbol id=\"g-army\" viewBox=\"-12 -12 24 24\" overflow=\"visible\"><path d=\"{Glyphs.Chariot}\"/></symbol>");
        sb.Append($"<symbol id=\"g-fleet\" viewBox=\"-12 -12 24 24\" overflow=\"visible\"><path d=\"{Glyphs.Ship}\"/></symbol>");
        sb.Append($"<symbol id=\"g-tablet\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Tablet}\" class=\"tab-body\"/><path d=\"{Glyphs.TabletMarks}\" class=\"tab-marks\"/></symbol>");
        sb.Append($"<symbol id=\"g-eye\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Eye}\" class=\"eye-white\"/><path d=\"{Glyphs.Pupil}\" class=\"eye-pupil\"/></symbol>");
        sb.Append($"<symbol id=\"g-ingot\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Ingot}\"/></symbol>");
        sb.Append($"<symbol id=\"g-fetter\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Fetter}\" fill-rule=\"evenodd\"/></symbol>");
        sb.Append($"<symbol id=\"g-crown\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Capital}\"/></symbol>");
        sb.Append($"<symbol id=\"g-burst\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Burst}\"/></symbol>");
        sb.Append($"<symbol id=\"g-moon\" viewBox=\"-10 -10 20 20\" overflow=\"visible\"><path d=\"{Glyphs.Moon}\"/></symbol>");
        // Arrowheads, one per power (and one for the draft), so each takes its arrow's colour.
        foreach (var name in Powers.All.Select(Glyphs.Id).Append("ink"))
            sb.Append($"<marker id=\"ah-{name}\" viewBox=\"0 0 10 10\" refX=\"6.5\" refY=\"5\" markerWidth=\"4.2\" markerHeight=\"4.2\" orient=\"auto-start-reverse\">"
                      + $"<path d=\"M0,0.6L10,5L0,9.4L2.6,5Z\" class=\"ah ah-{name}\"/></marker>");
        sb.Append("<marker id=\"ah-sup\" viewBox=\"0 0 10 10\" refX=\"5\" refY=\"5\" markerWidth=\"3.2\" markerHeight=\"3.2\"><circle cx=\"5\" cy=\"5\" r=\"4\" class=\"ah-sup\"/></marker>");
        return sb.Append("</defs>").ToString();
    }

    private static string BuildBase()
    {
        var sb = new StringBuilder("<g class=\"base\">");
        sb.Append("<rect class=\"sea-bg\" x=\"-300\" y=\"-300\" width=\"1600\" height=\"1300\"/>");
        sb.Append("<rect class=\"sea-waves\" x=\"-300\" y=\"-300\" width=\"1600\" height=\"1300\" fill=\"url(#waves)\"/>");
        // A second, paler coast line out at sea, as engraved maps draw shallows.
        sb.Append($"<path class=\"shallows\" d=\"{SeaPath} {CyprusPath}\"/>");
        sb.Append($"<path class=\"land\" d=\"{LandPath} {CyprusPath}\" fill-rule=\"evenodd\"/>");
        sb.Append("<g clip-path=\"url(#landclip)\">");
        foreach (var d in Fields) sb.Append($"<path class=\"fields\" d=\"{d}\"/>");
        foreach (var p in Map.LandProvinces)
            if (Shapes.TryGetValue(p.Id, out var d))
                sb.Append($"<path d=\"{d}\" fill=\"url(#fert{Tier(p.Yield)})\" class=\"fert\"/>");
        foreach (var d in Deserts) sb.Append($"<path class=\"desert\" d=\"{d}\" fill=\"url(#stipple)\"/>");
        foreach (var d in WasteShapes) sb.Append($"<path class=\"waste\" d=\"{d}\"/>");
        sb.Append("</g>");
        foreach (var r in Rivers)
        {
            sb.Append($"<path class=\"river-casing\" d=\"{r.Path}\" style=\"stroke-width:{F(r.Width + 2.6)}\"/>");
            sb.Append($"<path class=\"river\" d=\"{r.Path}\" style=\"stroke-width:{F(r.Width)}\"/>");
        }
        foreach (var range in Ranges) sb.Append($"<path class=\"peaks\" d=\"{Peaks(range)}\"/>");
        // Rough provinces: a few peaks beside the city.
        foreach (var id in Geography.Rough)
        {
            var c = City(id);
            var line = new[] { new Pt(c.X - 30, c.Y + 4), new Pt(c.X - 18, c.Y - 4) };
            sb.Append($"<path class=\"peaks rough\" d=\"{Peaks(line, 11, 5.5)}\"/>");
        }
        sb.Append($"<path class=\"coast\" d=\"{SeaPath} {CyprusPath}\"/>");
        // Province borders, thin, under everything that changes.
        foreach (var (id, d) in Shapes)
            if (!Map[id].IsSea) sb.Append($"<path class=\"cell-line\" d=\"{d}\"/>");
            else sb.Append($"<path class=\"sea-line\" d=\"{d}\"/>");
        // Crossings: a pass or a ford on the connection, drawn across it.
        foreach (var c in Geography.Crossings)
        {
            var a = City(c.A);
            var b = City(c.B);
            var mid = (a + b) * 0.5;
            var u = (b - a).Unit;
            var n = u.Normal * 6;
            var deg = Math.Atan2(u.Y, u.X) * 180 / Math.PI;
            sb.Append($"<g class=\"crossing {(c.Kind == CrossingKind.Mountain ? "pass" : "ford")}\" transform=\"translate({F(mid.X)},{F(mid.Y)}) rotate({F(deg)})\"><title>{c.Name} ({(c.Kind == CrossingKind.Mountain ? "a mountain pass" : "a river crossing")}; no effect yet)</title>"
                      + (c.Kind == CrossingKind.Mountain
                          ? "<path d=\"M-4,-7Q0,0 -4,7 M4,-7Q0,0 4,7\"/>"
                          : "<path d=\"M-3,-7V7 M3,-7V7\"/>")
                      + "</g>");
            _ = n;
        }
        foreach (var (text, x, y, angle) in GeoLabels)
            sb.Append($"<text class=\"geo\" transform=\"translate({F(x)},{F(y)}) rotate({F(angle)})\">{text}</text>");
        foreach (var p in Map.Provinces.Where(p => p.IsSea))
            sb.Append($"<text class=\"sea-name\" x=\"{p.X}\" y=\"{p.Y + 4}\">{p.Name}</text>");
        sb.Append("<text class=\"geo faint\" x=\"420\" y=\"12\">BLACK SEA</text>");
        // A cartouche and a compass, in the empty south.
        sb.Append("<g class=\"cartouche\" transform=\"translate(612,690)\"><path d=\"M-74,-15H74L82,0L74,15H-74L-82,0Z\"/><text y=\"4.5\">THE LANDS OF THE GREAT KINGS</text></g>");
        sb.Append("<g class=\"compass\" transform=\"translate(560,600)\"><circle r=\"15\"/><path d=\"M0,-21L4,0L0,21L-4,0Z\"/><path d=\"M-21,0L0,-3L21,0L0,3Z\" class=\"cw\"/><text y=\"-24\">N</text></g>");
        return sb.Append("</g>").ToString();
    }

    private static string BuildLabels()
    {
        var sb = new StringBuilder("<g class=\"labels\">");
        // Each name hangs from its city and grows about it when the map is small on screen (see mapzoom.js, --lab).
        foreach (var p in Map.LandProvinces)
        {
            var s = LabelAt(p.Id);
            sb.Append($"<g transform=\"translate({p.X},{p.Y})\"><text class=\"plabel{(p.Capital ? " cap" : "")}\" x=\"{F(s.Dx)}\" y=\"{F(s.Dy)}\" text-anchor=\"{s.Anchor}\">{Escape(p.Name)}</text></g>");
        }
        return sb.Append("</g>").ToString();
    }

    /// <summary>Fertility tier from yield: up to 25, 30-35, 40-45, 50 and more.</summary>
    public static int Tier(int yield) => yield <= 25 ? 1 : yield <= 35 ? 2 : yield <= 45 ? 3 : 4;

    private static string Escape(string s) => s.Replace("&", "&amp;").Replace("<", "&lt;");
}
