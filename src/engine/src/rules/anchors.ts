/**
 * Where each real fact in the game's data rests (the full history check, archive item 167): the anchor of its line in
 * `docs/history/` (`<a id="..."></a>`), a line that quotes the few words of its source it relies on; or {@link Invented}
 * where the sources are silent and the game made it up [G]. Data only: never shown to a king, a character or a model.
 */
export const Invented = "invented";

/** Every real person the game presents, by name: the anchor of the dossier line that holds him, or {@link Invented}. */
export const PersonAnchors: ReadonlyMap<string, string> = new Map<string, string>([]);
