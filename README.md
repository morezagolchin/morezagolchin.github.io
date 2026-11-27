# morezagolchin.github.io

My personal site. Project pages live under it at `morezagolchin.github.io/<project>/`, each from its own repo, and share this site's look through `theme.css`.

## Files

- `theme.css`: the shared look, used by this page and every project page.
- `ui-tabs.js`: slides the yellow tile of the `.ui-tabs` tab track (shared too).
- `style.css`, `tabs.js`, `dna.js`, `mosaic.js`: this page's own parts.

## Shared theme

A project page links it first, before its own styles:

```html
<link rel="stylesheet" href="/theme.css">
<script src="/ui-tabs.js" defer></script> <!-- only if the page uses .ui-tabs -->
```

`theme.css` gives every page the colours (light and dark), base text styles, and spacing and corners. Its components are optional: they only apply where a page uses their classes.

### Keeping a page's own look

Everything in `theme.css` sits in cascade layers (`theme.tokens`, `theme.base`, `theme.components`), and a page's own CSS is unlayered, so **the page always wins**, whatever the specificity. No `!important` needed. A page can:

- **Re-tint**: redefine tokens in its own `:root`. A colour set there applies in both light and dark mode, so also set the dark value in the page's own `@media (prefers-color-scheme: dark) { :root { … } }`.
- **Restyle**: write its own rules for anything, including the `ui-*` classes.
- **Skip** the components and use only the tokens.

Broad element rules in a page (`button { … }`, `a { … }`) also beat the components, so scope them (e.g. `.board button`) on pages that use `ui-*` classes.

### Contract

Values can change, but **renaming or removing any name below breaks the project pages that use it**, and they pick up changes here without being redeployed.

**Tokens**

| Group | Names |
| --- | --- |
| Palette | `--gold` `--steel` `--fern` `--iron` `--graphite` |
| Colours (light and dark) | `--bg` `--surface` `--box` `--border` `--text` `--muted` `--link` `--accent` `--on-accent` `--control` `--control-hover` `--well` `--pattern` |
| Borders and shadows | `--section-border` `--well-shadow` `--raised-shadow` |
| Type | `--font` `--font-mono` `--text-size` `--leading` |
| Spacing and corners | `--gap` `--pad` `--radius` `--inset` `--inner-radius` |

**Components**

| Class | What it is |
| --- | --- |
| `.ui-box` | Panel / bar box: see-through surface, border, rounded corners. |
| `.ui-tabs` + `.ui-tab` | Tab track with a sliding yellow tile over the item with `aria-selected="true"`, `aria-pressed="true"` or `aria-current="page"`. Needs `/ui-tabs.js` to slide (without it the selected item is filled). `aria-orientation="vertical"` stacks the items. Put it in a `.ui-box` with `padding: var(--inset)`. |
| `.ui-label` | Small uppercase label. |
| `.ui-button` (`.primary`, `.link`) | Buttons. |
| `.ui-card` | Card whose title link (`h2 a` / `h3 a`) makes the whole card clickable. |
| `.ui-pattern-bg` | Fixed background of pattern text (the page fills it and sets its font). |

### New project checklist

- [ ] Link `/theme.css` before the page's own CSS (and `/ui-tabs.js` if it uses `.ui-tabs`).
- [ ] Use the tokens (`var(--text)`, `var(--surface)`, …) instead of fixed colours; add page-only tokens for anything the theme doesn't cover.
- [ ] Match the `theme-color` metas: `#E7E6E7` (light) and `#333138` (dark).
- [ ] Check the page in light and dark mode.
- [ ] Add a card for it under Playground or Projects in `index.html`.

For a Vite project, add `vite-ignore` to the `<link>` and `<script>` tags so the build leaves them for the browser, and proxy `/theme.css` and `/ui-tabs.js` to `https://morezagolchin.github.io` in `vite.config.ts` for the dev server.
