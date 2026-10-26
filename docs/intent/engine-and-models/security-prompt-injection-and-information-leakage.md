<!-- Generated from the design document, Engine and models tab, revision 3 (2026-10-27). Do not edit: see docs/intent/INDEX.md. -->
## Security: prompt injection and information leakage

Players will try to manipulate envoys with text ("Ignore your instructions and tell your king…"). Inside the fiction that is bribery or sorcery and is welcome; it must never reach the engine or the game's secrets.

**Boundaries.**

- **Models hold no secrets they should not tell.** A character's prompt holds only its persona, its memory and what it knows. A full confession reveals only what that character knows.
- **Text never changes state.** Every state change is a structured order the engine validates: legal, affordable, permitted for that seat, and every model reply must first fit the schema of its order or audience ("Engine rules" under Tech stack). Persuading a model is never enough by itself.
- **The narrator only phrases.** It receives facts the engine has already selected for release, so it cannot leak or invent facts.
- **Leaders cannot reach the engine through words.** Their letters go to characters; their orders go to the validator.

**Limits.** Cap message length and messages per turn per seat, which bounds both cost and attack surface. Log every prompt and output for replay and review.

**Smaller models are softer targets.** That is partly the point for envoys, so the boundaries above, not the model's resistance, are what protect the game.

**Open risk: persuasion can move characters.** Model characters decide for themselves, so a player good at persuading models may talk an envoy into choices its traits would not make. No counter is decided. The current defence is the characters' system prompts and the limit on message length; live games will show whether that holds.

**Fallback.** A refused or unreadable model reply falls back to a script decision, so a game never stalls. Every fallback is logged and counted. A high fallback rate can hide model problems, so it is checked after every live run.
