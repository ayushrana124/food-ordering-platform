# Bundled fonts

These `.woff2` files are the latin and latin-ext subsets that Google Fonts serves,
downloaded and committed here so the app does not depend on `fonts.googleapis.com`
and `fonts.gstatic.com` at runtime.

| File | Family | Subset |
|---|---|---|
| `dm-sans-latin.woff2` | DM Sans (variable, 400–800) | latin |
| `dm-sans-latin-ext.woff2` | DM Sans (variable, 400–800) | latin-ext |
| `outfit-latin.woff2` | Outfit (variable, 600–900) | latin |
| `outfit-latin-ext.woff2` | Outfit (variable, 600–900) | latin-ext |

The `latin-ext` files exist for the rupee sign (U+20B9), which is outside the
basic latin range and appears on every screen of the app.

## Licensing — action needed

Both families are published under the **SIL Open Font License 1.1**, which
permits self-hosting and redistribution. It also requires that the licence text
travel with the font files.

**That licence text is not yet in this folder.** Add it before shipping:

- DM Sans — <https://github.com/googlefonts/dm-fonts> (`OFL.txt`)
- Outfit — <https://github.com/Outfitio/Outfit-Fonts> (`OFL.txt`)

Save them here as `OFL-DMSans.txt` and `OFL-Outfit.txt`. Nothing in the app reads
this folder's text files, so adding them costs nothing at runtime.

## Updating

To refresh a font, request the CSS from Google with a modern mobile
`User-Agent`, take the `woff2` URLs it returns, and replace the files here
keeping the same names. The `@font-face` rules and their `unicode-range` values
live in `src/index.css`.
