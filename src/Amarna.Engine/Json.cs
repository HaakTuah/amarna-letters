using System.Text.Json;
using System.Text.Json.Serialization;

namespace Amarna.Engine;

public static class Json
{
    public static readonly JsonSerializerOptions Options = Create(indented: false);
    public static readonly JsonSerializerOptions Pretty = Create(indented: true);

    private static JsonSerializerOptions Create(bool indented) => new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DictionaryKeyPolicy = null,
        WriteIndented = indented,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        Converters = { new JsonStringEnumConverter() },
        PropertyNameCaseInsensitive = true,
    };

    public static string Serialize<T>(T value) => JsonSerializer.Serialize(value, Options);

    public static T Deserialize<T>(string json) => JsonSerializer.Deserialize<T>(json, Options)
        ?? throw new InvalidOperationException($"Could not read {typeof(T).Name}.");

    public static T Clone<T>(T value) => Deserialize<T>(Serialize(value));

    /// <summary>A stable fingerprint of any serializable value (FNV-1a over its JSON).</summary>
    public static string Hash<T>(T value) => Rng.Fnv(Serialize(value)).ToString("x16");
}
