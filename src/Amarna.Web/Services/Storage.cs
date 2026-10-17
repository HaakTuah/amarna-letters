using Microsoft.JSInterop;

namespace Amarna.Web.Services;

public sealed record SavedLog(string Id, string Meta, double Saved);

/// <summary>IndexedDB for event logs, file download, and the tab-scoped API key.</summary>
public sealed class Storage(IJSRuntime js) : IAsyncDisposable
{
    private IJSObjectReference? _module;

    private async Task<IJSObjectReference> Module() =>
        _module ??= await js.InvokeAsync<IJSObjectReference>("import", "./js/storage.js");

    public async Task<bool> SaveAsync(string id, string meta, string text)
    {
        try { return await (await Module()).InvokeAsync<bool>("saveLog", id, meta, text); }
        catch { return false; }
    }

    public async Task<string?> LoadAsync(string id)
    {
        try { return await (await Module()).InvokeAsync<string?>("loadLog", id); }
        catch { return null; }
    }

    public async Task<List<SavedLog>> ListAsync()
    {
        try { return await (await Module()).InvokeAsync<List<SavedLog>>("listLogs"); }
        catch { return new(); }
    }

    public async Task DeleteAsync(string id)
    {
        try { await (await Module()).InvokeVoidAsync("deleteLog", id); } catch { }
    }

    public async Task DownloadAsync(string filename, string text) =>
        await (await Module()).InvokeVoidAsync("download", filename, text);

    public async Task<string?> GetSessionKeyAsync()
    {
        try { return await (await Module()).InvokeAsync<string?>("getSessionKey"); }
        catch { return null; }
    }

    public async Task SetSessionKeyAsync(string? key)
    {
        try { await (await Module()).InvokeVoidAsync("setSessionKey", key); } catch { }
    }

    public async ValueTask DisposeAsync()
    {
        if (_module is not null)
        {
            try { await _module.DisposeAsync(); } catch { }
        }
    }
}
