# Branch Rarity

Does it feel dull to start a new task? Not anymore: every new branch opened presents an opportunity for an exciting adventure! Will you be the happy owner of a GOLDEN LEGENDARY BRANCH?

## How it works

When you checkout a branch for the first time, a gacha reveal screen animates open showing the branch's rarity. Rarity is assigned once and persists across sessions.

| Tier      | Chance | Color |
| --------- | ------ | ----- |
| Legendary | ~???%  | Gold  |
| Rare      | ~5%    | Blue  |
| Uncommon  | ~15%   | Green |
| Common    | ~67%   | —     |

There's also branch modifiers — discover them all!

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
