# The threat model: Amarna Letters

This game's own part; the part every project shares is `core/floor/threat-model.md`, and a security review reads both.
Rules cited: the floor's, with what `SECURITY.md` adds under their numbers.

- **Who, besides:** anyone who hands a player a save file or a link; and a model's reply can carry what its inputs
  planted.
- **The players:** their browsers, their saves and their API keys: code run in a browser, or a key sent anywhere but
  the provider the player chose (rules 5 to 7); a save corrupted or forged (rule 5).
- **The ways in, besides:** model replies, save files, share links, URL parameters and the bridge (rule 5).
- **Lower stakes, besides:** a slowdown or crash from a save, link or text someone else crafted is not Low. Deceit
  between kings is play, not an attack.
