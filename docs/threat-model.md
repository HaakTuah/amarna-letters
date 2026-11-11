# The threat model: Amarna Letters

This game's own part; the part every project shares is `core/floor/threat-model.md`, and a security review reads both.
Rules cited: `SECURITY.md`'s, whose numbers are the floor's.

- **Who, besides:** anyone who hands a player a save file or a link; and a model's reply can carry what its inputs
  planted.
- **The players:** their browsers, their saves and their API keys: code run in a browser, or a key sent anywhere but
  the provider the player chose (`SECURITY.md`, rules 5 to 7); a save corrupted or forged (`SECURITY.md`, rule 5).
- **The ways in, besides:** model replies, save files, share links, URL parameters and the bridge (`SECURITY.md`,
  rule 5).
- **Not an attack:** deceit between kings, which is play.
