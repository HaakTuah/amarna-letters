/**
 * Where the game's model calls may go: the AI providers on one list, and the player's own machine (local models and the
 * bridge). The built page's content security policy is written from this list (`src/web/csp.ts`), so the page contacts
 * nothing else; a new provider is one line here, and the settings screen and the policy follow.
 */

/** Anthropic's id: the provider of a model named with no prefix. */
export const AnthropicId = "anthropic";

/** A provider the page may call: its id (the prefix of its models' names), its name, and the base of its endpoint. */
export interface KnownProvider {
  id: string;
  name: string;
  /** The base of the endpoint, up to and including its version; for any provider but Anthropic, OpenAI-compatible. */
  baseUrl: string;
}

/** Anthropic, through its own client, first; the rest through their OpenAI-compatible endpoints. */
export const KnownProviders: readonly KnownProvider[] = [
  { id: AnthropicId, name: "Anthropic", baseUrl: "https://api.anthropic.com" },
  { id: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { id: "google", name: "Google", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  { id: "mistral", name: "Mistral", baseUrl: "https://api.mistral.ai/v1" },
  { id: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1" },
  { id: "xai", name: "xAI", baseUrl: "https://api.x.ai/v1" },
  { id: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
];

/** The player's own machine, by the names a browser may call it, on any port. */
export const LocalHosts: readonly string[] = ["localhost", "127.0.0.1"];

/** Whether an address is on the player's own machine. */
export function isLocalAddress(address: string): boolean {
  try {
    const u = new URL(address);
    return (u.protocol === "http:" || u.protocol === "https:") && LocalHosts.includes(u.hostname);
  } catch {
    return false;
  }
}

/** The listed provider whose endpoint an address is, if any. */
export function knownProviderAt(address: string): KnownProvider | undefined {
  let end = address.length;
  while (end > 0 && address[end - 1] === "/") end--;
  return KnownProviders.find((p) => p.baseUrl === address.slice(0, end));
}

/** Whether the page may call an endpoint: a listed provider's, or one on the player's own machine. */
export function endpointAllowed(address: string): boolean {
  return knownProviderAt(address) !== undefined || isLocalAddress(address);
}

/** The origins the page may contact beyond its own files, as a content security policy names them. */
export function allowedOrigins(): string[] {
  const providers = [...new Set(KnownProviders.map((p) => new URL(p.baseUrl).origin))];
  const local = LocalHosts.flatMap((h) => [`http://${h}:*`, `https://${h}:*`]);
  return [...providers, ...local];
}
