# Branch Rarity

Does it feel dull to start a new task? Not anymore: every new branch opened is an exciting adventure! Will you be the happy owner of a GOLDEN LEGENDARY BRANCH?

## How it works

When you checkout a branch for the first time, a gacha reveal screen animates open showing the branch's rarity. Rarity is assigned once and persists across sessions.

| Tier      | Chance | Color |
| --------- | ------ | ----- |
| Legendary | ~???%  | Gold  |
| Rare      | ~10%   | Blue  |
| Uncommon  | ~13%   | Green |
| Common    | ~67%   | —     |

There's also branch modifiers: discover them all!

## Commands

- **Branch Rarity: Clear All Records** — wipes all stored rarity assignments, so every branch will roll fresh on next checkout.

## Settings

| Setting                      | Default | Description                         |
| ---------------------------- | ------- | ----------------------------------- |
| `branchRarity.showStatusBar` | `true`  | Show rarity badge in the status bar |

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
test/uncommon-gold     test/rare-gold     test/legendary-gold
```

Switch back and forth freely — no need to run Clear All Records.
