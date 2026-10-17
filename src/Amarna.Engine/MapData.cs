namespace Amarna.Engine;

/// <summary>
/// The Late Bronze Age board: 41 land provinces and 5 sea zones. Coordinates are for a
/// 1000x720 SVG view. Yields are shekels of gold per season. Historical geography serves the
/// dynamics, not the reverse.
/// </summary>
public static class MapData
{
    public static WorldMap Build()
    {
        var L = ProvinceKind.Land;
        var C = ProvinceKind.Coast;
        var S = ProvinceKind.Sea;
        Power? none = null;

        var provinces = new List<Province>
        {
            // Arzawa (weak): western Anatolia
            new("seha", "Seha River Land", C, Power.Arzawa, 25, false, 85, 95),
            new("apasa", "Apasa", C, Power.Arzawa, 40, true, 70, 200),
            new("mira", "Mira", L, Power.Arzawa, 25, false, 170, 150),

            // Hatti (strong): central Anatolia
            new("tuwanuwa", "Tuwanuwa", L, Power.Hatti, 30, false, 275, 150),
            new("hattusa", "Hattusa", L, Power.Hatti, 50, true, 375, 70),
            new("sapinuwa", "Sapinuwa", L, Power.Hatti, 30, false, 480, 50),
            new("kanesh", "Kanesh", L, Power.Hatti, 35, false, 400, 165),
            new("kizzuwatna", "Kizzuwatna", C, Power.Hatti, 35, false, 390, 255),

            // Mitanni (middle): upper Khabur
            new("harran", "Harran", L, Power.Mitanni, 30, false, 615, 200),
            new("washukanni", "Washukanni", L, Power.Mitanni, 45, true, 700, 145),
            new("taidu", "Taidu", L, Power.Mitanni, 30, false, 775, 75),
            new("terqa", "Terqa", L, Power.Mitanni, 30, false, 705, 275),

            // Assyria (middle): the Tigris
            new("nineveh", "Nineveh", L, Power.Assyria, 35, false, 865, 95),
            new("arbela", "Arbela", L, Power.Assyria, 30, false, 950, 175),
            new("ashur", "Ashur", L, Power.Assyria, 45, true, 850, 220),
            new("ekallatum", "Ekallatum", L, Power.Assyria, 25, false, 840, 320),

            // Babylonia (strong): Karduniash
            new("sippar", "Sippar", L, Power.Babylonia, 35, false, 770, 420),
            new("durkurigalzu", "Dur-Kurigalzu", L, Power.Babylonia, 35, false, 880, 405),
            new("babylon", "Babylon", L, Power.Babylonia, 55, true, 820, 505),
            new("nippur", "Nippur", L, Power.Babylonia, 35, false, 910, 570),
            new("ur", "Ur", L, Power.Babylonia, 35, false, 950, 665),

            // Egypt (strong): the Nile
            new("delta", "Nile Delta", C, Power.Egypt, 40, false, 340, 600),
            new("sinai", "Sinai", L, Power.Egypt, 20, false, 430, 665),
            new("memphis", "Memphis", L, Power.Egypt, 40, false, 290, 660),
            new("akhetaten", "Akhetaten", L, Power.Egypt, 50, true, 195, 680),
            new("thebes", "Thebes", L, Power.Egypt, 40, false, 90, 690),

            // Alashiya (weak): Cyprus, the copper island
            new("tamassos", "Tamassos", C, Power.Alashiya, 40, false, 290, 410),
            new("enkomi", "Enkomi", C, Power.Alashiya, 45, true, 365, 395),

            // Neutral city-states: taken by force (walls hold with strength 1) or bought
            new("lukka", "Lukka", C, none, 25, false, 175, 270),
            new("isuwa", "Isuwa", L, none, 30, false, 570, 110),
            new("carchemish", "Carchemish", L, none, 35, false, 555, 225),
            new("ugarit", "Ugarit", C, none, 40, false, 480, 305),
            new("qadesh", "Qadesh", L, none, 30, false, 575, 345),
            new("amurru", "Amurru", C, none, 20, false, 490, 380),
            new("mari", "Mari", L, none, 35, false, 690, 395),
            new("byblos", "Byblos", C, none, 30, false, 475, 450),
            new("damascus", "Damascus", L, none, 25, false, 580, 450),
            new("tyre", "Tyre", C, none, 25, false, 470, 520),
            new("megiddo", "Megiddo", L, none, 20, false, 550, 545),
            new("gaza", "Gaza", C, none, 20, false, 455, 590),
            new("susa", "Susa", L, none, 35, false, 975, 470),

            // Sea zones
            new("westsea", "Western Sea", S, none, 0, false, 45, 330),
            new("greatgreen", "Great Green", S, none, 0, false, 165, 500),
            new("cilicia", "Cilician Sea", S, none, 0, false, 285, 310),
            new("syriansea", "Syrian Sea", S, none, 0, false, 425, 335),
            new("levantsea", "Levantine Sea", S, none, 0, false, 385, 505),
        };

        var edges = new List<Edge>();
        void Land(string a, params string[] bs) { foreach (var b in bs) edges.Add(new(a, b, EdgeKind.Land)); }
        void Coast(string a, params string[] bs) { foreach (var b in bs) edges.Add(new(a, b, EdgeKind.Coast)); }
        void Sea(string a, params string[] bs) { foreach (var b in bs) edges.Add(new(a, b, EdgeKind.Sea)); }

        // Anatolia
        Coast("seha", "apasa");
        Land("seha", "mira", "tuwanuwa");
        Land("apasa", "mira");
        Coast("apasa", "lukka");
        Land("mira", "lukka", "tuwanuwa");
        Land("lukka", "tuwanuwa");
        Coast("lukka", "kizzuwatna");
        Land("tuwanuwa", "hattusa", "kanesh", "kizzuwatna");
        Land("hattusa", "sapinuwa", "kanesh");
        Land("sapinuwa", "kanesh", "isuwa");
        Land("kanesh", "kizzuwatna", "isuwa", "carchemish");
        Land("kizzuwatna", "carchemish");
        Coast("kizzuwatna", "ugarit");

        // Upper Mesopotamia
        Land("isuwa", "harran", "washukanni", "carchemish");
        Land("carchemish", "harran", "ugarit", "qadesh");
        Land("harran", "washukanni", "terqa");
        Land("washukanni", "taidu", "terqa");
        Land("taidu", "nineveh");
        Land("terqa", "mari", "ashur", "ekallatum");
        Land("nineveh", "arbela", "ashur");
        Land("arbela", "ashur", "ekallatum");
        Land("ashur", "ekallatum");

        // Babylonia and Elam
        Land("ekallatum", "sippar", "durkurigalzu", "mari");
        Land("susa", "durkurigalzu", "nippur", "arbela", "ur");
        Land("sippar", "durkurigalzu", "babylon", "mari");
        Land("durkurigalzu", "babylon", "nippur");
        Land("babylon", "nippur");
        Land("nippur", "ur");

        // The Levant
        Land("ugarit", "qadesh");
        Coast("ugarit", "amurru");
        Land("amurru", "qadesh");
        Coast("amurru", "byblos");
        Land("qadesh", "byblos", "damascus", "mari");
        Land("mari", "damascus");
        Land("byblos", "damascus");
        Coast("byblos", "tyre");
        Land("tyre", "damascus", "megiddo");
        Land("damascus", "megiddo");
        Coast("tyre", "gaza");
        Land("megiddo", "gaza", "sinai");
        Land("gaza", "sinai");
        Coast("gaza", "delta");

        // Egypt
        Land("sinai", "delta", "memphis");
        Land("delta", "memphis");
        Land("memphis", "akhetaten");
        Land("akhetaten", "thebes");

        // Cyprus
        Coast("tamassos", "enkomi");

        // Seas
        Sea("westsea", "seha", "apasa", "lukka", "greatgreen");
        Sea("greatgreen", "lukka", "tamassos", "delta", "cilicia", "levantsea");
        Sea("cilicia", "lukka", "kizzuwatna", "ugarit", "tamassos", "enkomi", "syriansea");
        Sea("syriansea", "enkomi", "ugarit", "amurru", "byblos", "levantsea");
        Sea("levantsea", "byblos", "tyre", "gaza", "delta", "enkomi");

        return new WorldMap(provinces, edges);
    }

    public sealed record StartUnit(Power Power, UnitKind Kind, string Province);

    public static readonly IReadOnlyList<StartUnit> StartUnits = new List<StartUnit>
    {
        new(Power.Egypt, UnitKind.Army, "memphis"),
        new(Power.Egypt, UnitKind.Army, "akhetaten"),
        new(Power.Egypt, UnitKind.Fleet, "delta"),
        new(Power.Hatti, UnitKind.Army, "hattusa"),
        new(Power.Hatti, UnitKind.Army, "kanesh"),
        new(Power.Hatti, UnitKind.Army, "kizzuwatna"),
        new(Power.Babylonia, UnitKind.Army, "babylon"),
        new(Power.Babylonia, UnitKind.Army, "sippar"),
        new(Power.Babylonia, UnitKind.Army, "durkurigalzu"),
        new(Power.Mitanni, UnitKind.Army, "washukanni"),
        new(Power.Mitanni, UnitKind.Army, "harran"),
        new(Power.Assyria, UnitKind.Army, "ashur"),
        new(Power.Assyria, UnitKind.Army, "nineveh"),
        new(Power.Arzawa, UnitKind.Army, "mira"),
        new(Power.Arzawa, UnitKind.Fleet, "apasa"),
        new(Power.Alashiya, UnitKind.Fleet, "enkomi"),
    };

    public static readonly IReadOnlyDictionary<Power, int> StartGold = new Dictionary<Power, int>
    {
        [Power.Egypt] = 600,
        [Power.Hatti] = 550,
        [Power.Babylonia] = 650,
        [Power.Mitanni] = 400,
        [Power.Assyria] = 350,
        [Power.Arzawa] = 250,
        [Power.Alashiya] = 350,
    };
}
