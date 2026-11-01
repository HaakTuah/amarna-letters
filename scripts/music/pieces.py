"""The fourteen pieces, one for each of Empire Earth's, each taking that piece's role, mood and pace (the template is in
docs/design/45-the-music-and-the-sounds.md) and nothing of its own: the melodies are the Hurrian Hymn's and new themes in
the Babylonian tunings. Composed 31 October 2026 (the composing session of item 19+++), replacing the placeholders that
exercised the sound system.

Each piece is a function of its variation (0, 1, 2): the same music, scored again with another lead and another course,
so no two plays in a row sound alike, and some variations in a darker or brighter tuning (`Score.shade`), which the
player picks as the seat's situation worsens or improves. A phrase end is marked wherever the music may hand over to
another piece. The pieces of peace are in pieces_peace.py, those of unease, war and loss in pieces_war.py; the shared
idiom in idiom.py, the building blocks in parts.py. Check a score before rendering with check.py.
"""

from __future__ import annotations

from pieces_peace import hymn_theme, kings, last, river, solemn, triumph
from pieces_war import battle, chariots, enmity, envoys, fall, fallen, shadows, siege

PIECES = {
    "hymn": hymn_theme,
    "kings": kings,
    "river": river,
    "envoys": envoys,
    "shadows": shadows,
    "enmity": enmity,
    "chariots": chariots,
    "battle": battle,
    "siege": siege,
    "triumph": triumph,
    "fall": fall,
    "fallen": fallen,
    "solemn": solemn,
    "last": last,
}
