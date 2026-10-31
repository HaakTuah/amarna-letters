# The samples behind the music and the sounds: sources and licences

Every recorded sound in `src/web/public/audio/` is rendered from two free sample libraries, both released under
**CC0 1.0 Universal** (public domain dedication: free to use, change and ship, rendered or raw, with no attribution
required; credited here anyway). Nothing else recorded is used: the choir, the clay, the seal, the water, the wind and the
crowd are synthesised in `scripts/music/`. No sound, melody or file of Empire Earth or Crusader Kings II is used.

| Library | By | Licence | Where |
| --- | --- | --- | --- |
| VS Chamber Orchestra: Community Edition (VSCO 2 CE) | Sam Gossner, Simon Dalzell (Versilian Studios); cutting by Elan Hickler | CC0 1.0 (its `LICENSE`) | https://github.com/sgossner/VSCO-2-CE |
| Versilian Community Sample Library (VCSL) | Versilian Studios and contributors | CC0 1.0 (its `LICENSE`) | https://github.com/sgossner/VCSL |

The samples themselves are not kept in this repository (about 2 GB); only what is rendered from them is.

## Fetching them

Partial clones fetch only the folders the instruments use (a few hundred MB). The renderer looks in `$AMARNA_SAMPLES`
(default `/tmp/dl`).

```bash
mkdir -p /tmp/dl && cd /tmp/dl
git clone --filter=blob:none --no-checkout --depth 1 https://github.com/sgossner/VSCO-2-CE.git vsco
git clone --filter=blob:none --no-checkout --depth 1 https://github.com/sgossner/VCSL.git vcsl
# then in each: git sparse-checkout init --no-cone; git sparse-checkout set <the folders below, each as "/<folder>/">; git checkout HEAD
pip install numpy scipy soundfile matplotlib   # matplotlib only for scripts/music/inspect_audio.py
```

(In a cloud session, github.com's pages and API are blocked by the network policy but git over the proxy works, which
is how these were fetched on 31 October 2026.)

## The instruments, by name in `scripts/music/samples.py`

| Instrument | Library | Folder (files) |
| --- | --- | --- |
| `violins` | VSCO 2 CE | `Strings/Violin Section/susVib` (`*.wav`) |
| `violas` | VSCO 2 CE | `Strings/Viola Section/susvib` (`*.wav`) |
| `celli` | VSCO 2 CE | `Strings/Cello Section/susvib` (`*.wav`) |
| `bass` | VSCO 2 CE | `Strings/Solo Contrabass/SusVib` (`*.wav`) |
| `violins_trem` | VSCO 2 CE | `Strings/Violin Section/Trem` (`*.wav`) |
| `celli_trem` | VSCO 2 CE | `Strings/Cello Section/trem` (`*.wav`) |
| `celli_pizz` | VSCO 2 CE | `Strings/Cello Section/pizzT` (`*.wav`) |
| `violins_pizz` | VSCO 2 CE | `Strings/Violin Section/Pizz` (`*.wav`) |
| `lyre` | VCSL | `Chordophones/Composite Chordophones/Folk Harp` (`*Normal*.wav`) |
| `harp` | VSCO 2 CE | `Strings/Harp` (`*.wav`) |
| `psaltery` | VCSL | `Chordophones/Zithers/Psaltery, Bowed and Plucked/Pluck` (`*.wav`) |
| `reed` | VSCO 2 CE | `Woodwinds/Oboe/Vib` (`*.wav`) |
| `reed_plain` | VSCO 2 CE | `Woodwinds/Oboe/Sus` (`*.wav`) |
| `low_reed` | VSCO 2 CE | `Woodwinds/Clarinet/susLong` (`*.wav`) |
| `pipe` | VSCO 2 CE | `Woodwinds/Flute/susvib` (`*.wav`) |
| `recorder` | VCSL | `Aerophones/Edge-blown Aerophones/Baroque Tenor Recorder/Sustain` (`*.wav`) |
| `horn` | VSCO 2 CE | `Brass/F Horn/sus` (`*.wav`) |
| `trumpet` | VSCO 2 CE | `Brass/Trumpet/sus` (`*.wav`) |
| `frame_lo` | VCSL | `Membranophones/Struck Membranophones/Frame Drum` (`HDrumL_Hit_*.wav`) |
| `frame_mute` | VCSL | `Membranophones/Struck Membranophones/Frame Drum` (`HDrumS_HitMuted_*.wav`) |
| `frame_hi` | VCSL | `Membranophones/Struck Membranophones/Frame Drum` (`HDrumS_Hit_*.wav`) |
| `darbuka` | VCSL | `Membranophones/Struck Membranophones/Darbuka` (`Darbuka_[12]_*.wav`) |
| `darbuka_tek` | VCSL | `Membranophones/Struck Membranophones/Darbuka` (`Darbuka_[34]_*.wav`) |
| `big_drum` | VSCO 2 CE | `VSCO 1 Percussion/drums/other/ethnic/giant/hand` (`*hit*.wav`) |
| `timpani` | VSCO 2 CE | `Percussion/Timpani` (`Timpani1_Hit_*.wav`) |
| `timpani_roll` | VSCO 2 CE | `Percussion/Timpani/Rolls` (`*.wav`) |
| `gong` | VSCO 2 CE | `VSCO 1 Percussion/varMetal/Gong` (`gong_hit_*.wav`) |
| `cymbal` | VCSL | `Idiophones/Struck Idiophones/Finger Cymbals` (`*.wav`) |
| `sistrum` | VCSL | `Idiophones/Struck Idiophones/Sleigh Bells` (`*.wav`) |
| `tambourine` | VCSL | `Idiophones/Struck Idiophones/Tambourine 1` (`Tamb1_Hit_*.wav`) |
| `shaker` | VCSL | `Idiophones/Struck Idiophones/Shaker, Small` (`*.wav`) |
| `bells` | VCSL | `Idiophones/Struck Idiophones/Hand Bells, Nepalese` (`*.wav`) |
| `claps` | VCSL | `Idiophones/Struck Idiophones/Claps` (`*.wav`) |
| `log` | VCSL | `Idiophones/Struck Idiophones/Slit Drum` (`*.wav`) |
| `ocean` | VCSL | `Membranophones/Other Membranophones/Ocean Drum` (`*.wav`) |
| `scrape` | VSCO 2 CE | `VSCO 1 Percussion/varMetal/Cymbals/susp` (`susp_FX_scrape_[123].wav`) |

Stand-ins for the period's instruments: the folk harp and the psaltery for the lyres, the oboe for the double reed, the
flute and the recorder for the pipes, the frame drum, darbuka and a large hand drum for the drums, sleigh bells and a
tambourine for the sistrum's jingles, finger cymbals, and the orchestra's strings, horn and trumpet.
