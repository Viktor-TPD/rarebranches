# Branch Rarity

A VSCode extension that assigns a rarity tier to new git branches — like loot drops.

## How it works

When you checkout a branch for the first time, a gacha reveal screen animates open showing the branch's rarity. Rarity is assigned once and persisted across sessions.

| Tier      | Chance | Color  |
|-----------|--------|--------|
| Legendary | ~10%   | Gold   |
| Rare      | ~10%   | Blue   |
| Uncommon  | ~13%   | Green  |
| Common    | ~67%   | —      |

Non-common branches can also roll a modifier (~10% each, mutually exclusive):

| Modifier | Effect |
|----------|--------|
| Glass    | Frosted panel reveal, sparkle cross particles |
| Dark     | Darkened colors, particles rain from the top |
| Foiled   | Rainbow label, multicolor particles |

The status bar shows the branch's rarity badge for all non-common branches.

## Commands

- **Branch Rarity: Clear All Records** — wipes all stored rarity assignments, so every branch will roll fresh on next checkout.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `branchRarity.showStatusBar` | `true` | Show rarity badge in the status bar |

## Building

```
npm install
npm run compile   # bundle via esbuild
npm run lint      # type-check only (tsc --noEmit)
npm run package   # produce .vsix
```

## Publishing

> **Before publishing**, remove the test fixture map in `src/rarityEngine.ts`.
>
> Find the `TEST_BRANCHES` constant near the top of the file and delete it along with the fixture check at the start of `getOrAssignRarity`. These branches always trigger a fresh gacha and are never persisted — useful for development, but not something end users should hit accidentally.

## Testing locally

Press `F5` to open an Extension Development Host. The following branch names are hardwired to fixed rarity+modifier combos and always show the gacha (even if you've checked them out before):

```
test/uncommon          test/rare          test/legendary
test/uncommon-glass    test/rare-glass    test/legendary-glass
test/uncommon-dark     test/rare-dark     test/legendary-dark
test/uncommon-foiled   test/rare-foiled   test/legendary-foiled
```

Switch back and forth freely — no need to run Clear All Records.
