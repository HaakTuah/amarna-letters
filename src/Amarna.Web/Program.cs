using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Amarna.Web;
using Amarna.Web.Services;

System.Globalization.CultureInfo.DefaultThreadCurrentCulture = System.Globalization.CultureInfo.InvariantCulture;
System.Globalization.CultureInfo.DefaultThreadCurrentUICulture = System.Globalization.CultureInfo.InvariantCulture;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddScoped(sp => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddSingleton<Storage>();
builder.Services.AddSingleton<IScriptTransport, ScriptWorkerClient>();
builder.Services.AddSingleton<SeatFactory>();
builder.Services.AddSingleton<GameSession>();
builder.Services.AddSingleton<KeyHolder>();

await builder.Build().RunAsync();
