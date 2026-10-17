namespace Amarna.Web.Services;

/// <summary>The player's API key, held in memory for this tab only.</summary>
public sealed class KeyHolder
{
    public string? Key { get; set; }
    public bool Remember { get; set; }
}
