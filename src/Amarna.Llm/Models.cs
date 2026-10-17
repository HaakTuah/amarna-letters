namespace Amarna.Llm;

public static class ModelIds
{
    public const string Opus = "claude-opus-5-5";
    public const string Sonnet = "claude-sonnet-5-5";
    public const string Haiku = "claude-haiku-5-5";

    public static string Display(string model) => model switch
    {
        Opus => "Opus 5.5",
        Sonnet => "Sonnet 5.5",
        Haiku => "Haiku 5.5",
        _ => model,
    };

    /// <summary>Server-side refusal fallback is offered on Opus and Sonnet; Haiku has none.</summary>
    public static bool SupportsFallback(string model) => model is Opus or Sonnet;
}

/// <summary>Dollars per million tokens. Cache writes (5-minute) cost 1.25x input.</summary>
public sealed record Price(double Input, double Output, double CacheRead)
{
    public double CacheWrite => Input * 1.25;

    public static Price For(string model) => model switch
    {
        ModelIds.Opus => new Price(4.00, 20.00, 0.20),
        ModelIds.Sonnet => new Price(2.00, 10.00, 0.20),
        ModelIds.Haiku => new Price(0.10, 0.50, 0.01),
        _ => new Price(2.00, 10.00, 0.20),
    };

    public double Cost(long input, long output, long cacheRead, long cacheWrite) =>
        (input * Input + output * Output + cacheRead * CacheRead + cacheWrite * CacheWrite) / 1_000_000.0;
}
