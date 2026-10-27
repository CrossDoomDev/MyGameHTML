# UI language and illustration contract

The game has two locales: `ru` and `en`.

## Non-negotiable asset rule

**No readable words, numbers, glyph labels, level messages or language-specific captions baked into menu / HUD / skill / inventory illustrations.**

Allowed inside an illustration: frame decoration, parchment texture, item icon, spell icon, abstract crest, non-linguistic ornament and magical particles.

Not allowed as final assets: generated samples with painted words such as `BUTTON`, `LEVEL UP!`, `ITEMS`, `SKILLS`, `QUESTS`, `MAP`, `CHARACTER`, or `OPTIONS`. Their unlabelled sections can be reused, but the caption must be rendered as actual HTML text.

Required composition:

```html
<button class="illustrated-button" data-i18n-title="inventory"
        data-i18n-aria="inventory" type="button">
  <span class="illustrated-button__art" aria-hidden="true"></span>
  <span data-i18n="inventory">Инвентарь</span>
</button>
```

The `.illustrated-button__art` layer references a caption-free PNG/WebP/AVIF; its sibling caption is a localizable DOM text node. Never add words to the PNG to save styling effort. Do not replace text with pseudo-element `content` strings, icon glyphs or game canvas pixels: they are not translatable or accessible.

## Implementation

- Source of truth for generic interface translations: `src/i18n.js`.
- Default language: `ru`. Both locales use the **same** UI illustration files.
- Persist only the selected locale in `localStorage['tiholesye-language']`, never in the character-save data.
- Change language from **Settings → Language / Язык**. The selection can be reversed any time.
- Convert new labels into keys in both dictionaries. Use `t('key', {namedParameter})` for runtime text, or `data-i18n` / `data-i18n-title` / `data-i18n-aria` for static UI.
- Use `className`, `skillName`, `branchName`, `itemName`, and other translation helpers for data-driven RPG panels; keep stable class/item/skill IDs language-neutral.
- For longer English names, layout must stretch or wrap text within buttons; neither language may deform the frame or obscure controls.
- Match rendering intent: world characters/maps/tiles remain **pixelated**; illustrated interface decoration/VFX are **smooth**. Do not apply `image-rendering:pixelated` globally.
- A newly generated asset sheet must be reviewed for accidental text before it can be integrated. Never ship image-generated placeholder labels.

## Checks

Run `node tests/i18n.mjs` to verify that Russian and English translations exist for UI, inventory items, all character classes, all specialization branches and all class ability names and that the same images are retained on locale changes. Browser tests additionally confirm Settings selection, reversible switching and persistence after reload.

Story/dialogue translation is a separate content track; new story copy must be supplied in both locales and stored under stable keys rather than embedded in art.
