# Manual Points Adjustment (can-ui) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The bell renders can-api's new `points.adjusted` notification in all four locales, with a signed amount and the public description, and the change ships as can-ui 27.4.0.

**Architecture:** `src/notifications.ts` gains the kind, its params (`amount`, `detail`) and a `points` category icon. `src/notificationMessages.ts` gains one template per locale and formats an `amount` param as a signed number. No component changes: `NotificationBell` already renders any kind through `renderNotification` and `notificationIcon`. A GitHub release `v27.4.0` publishes the package and opens a bump PR in each of the eight site repos.

**Tech Stack:** TypeScript, Vue 3, Astro 7 gallery, `bun test`, Bun, GitHub Packages.

**Spec:** `/Users/jhl/Documents/Dev/CeruleanAviationNetwork/docs/superpowers/specs/2026-10-07-manual-points-design.md` (section "Notification" under "can-api", and step 2 of "Order")

## Global Constraints

- Run every command from `/Users/jhl/Documents/Dev/CeruleanAviationNetwork/can-ui`.
- Gate: `bun run lint && bun run build`. `lint` is `format:check && typecheck && bun test`.
- Contract with can-api: kind string `points.adjusted`, appended last to can-api's `notify.Kinds`. Params `{amount, detail}`: `amount` is a signed non-zero integer (negative for a deduction or a reversal of a grant), `detail` is the public description, ≤ 255 chars. On a reversal `detail` is `撤销：<original detail>`, written by can-api in Chinese for every locale. No operator, no note.
- `NOTIFICATION_KINDS` order copies can-api's `Kinds` order. The new kind goes last.
- The amount renders with `Intl.NumberFormat(locale, { signDisplay: "exceptZero" })`: `+500`, `-500`, `+1,000,000` in all four locales (verified in Bun).
- Chinese templates put no space next to a Chinese-valued placeholder; `detail` is Chinese-valued. Numeric placeholders keep a space, as `{points} 积分` does.
- Version: `27.4.0`. Scheme `vXX.YY.ZZ` (AGENTS.md "Versions"): `XX = 27` for 2026-09 to 2027-08, so 27 on 2026-10-07; a new kind is an addition, so the minor moves from 3 to 4 and the patch resets. The repo's scheme and the user's global scheme agree.
- Work on branch `feat/points-adjusted` from `main`. Push the branch and open a PR to `main`; merge with a merge commit, as PRs #13 and #14 were. Release from `main` after the merge.
- The can-api half (`PointsAdjusted Kind = "points.adjusted"`) lands first or in the same window. AGENTS.md: "A new kind lands in can-api and here in the same release." Until a site bumps to 27.4.0 its bell shows the generic line for this kind, which is safe.
- Commits: plain English subject stating what changed, no rationale, no emoji, a blank line, then `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Stage files by explicit path.
- Commit signing may wait on a YubiKey touch. Wrap `git commit` in a 60 s timeout; on timeout retry once with `--no-gpg-sign` and report it.
- No scratch files are needed. If one is, it goes in `can-ui/.temp/` (add `.temp/` to `.gitignore` first), never `/tmp`, and is deleted at the end.

---

## File Structure

| File                               | Change | Responsibility                                                                     |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| `src/notifications.ts`             | Modify | `points.adjusted` in `NOTIFICATION_KINDS` and `NOTIFICATION_PARAMS`; `points` icon |
| `src/notifications.test.ts`        | Modify | Contract list, params, icon                                                        |
| `src/notificationMessages.ts`      | Modify | Four templates; signed `amount` formatting; header comment count                   |
| `src/notificationMessages.test.ts` | Modify | Rendering in four locales; `detail` in the Chinese spacing rule                    |
| `AGENTS.md`                        | Modify | Kind count 25 → 26                                                                 |
| `package.json`                     | Modify | `version` 27.3.0 → 27.4.0                                                          |

---

### Task 1: `points.adjusted` kind, params, icon and text

**Files:**

- Modify: `src/notifications.ts` (kinds list ends line 37; params table ends line 70; `CATEGORY_ICONS` line 148)
- Modify: `src/notificationMessages.ts` (header line 5; locale tables end lines 49, 80, 117, 154; `formatParam` generic branch line 315)
- Test: `src/notifications.test.ts` (contract list ends line 43; "params match the contract" line 57; `notificationIcon` describe line 134)
- Test: `src/notificationMessages.test.ts` (after the "an invalid month" test, ~line 199; spacing regex lines 221–222)

**Interfaces:**

- Produces:
  - `NOTIFICATION_KINDS` ends with `"points.adjusted"`; `NotificationKind` includes it.
  - `NOTIFICATION_PARAMS["points.adjusted"]` is `["amount", "detail"]`.
  - `notificationIcon("points.adjusted")` returns `"adjustments"`.
  - `renderNotification({ kind: "points.adjusted", params: { amount, detail } }, locale)` returns the locale's line with `amount` signed.
- Consumes: nothing new. `adjustments` is already in `ICON_NAMES` (`src/icons.ts`).

- [ ] **Step 1: Branch**

```bash
git switch main && git pull --ff-only && git switch -c feat/points-adjusted
```

- [ ] **Step 2: Write the failing tests in `src/notifications.test.ts`**

In `CONTRACT_KINDS`, replace:

```ts
  "access.aipGranted",
  "access.aipRevoked",
];
```

with:

```ts
  "access.aipGranted",
  "access.aipRevoked",
  "points.adjusted",
];
```

In the `"params match the contract"` test, replace:

```ts
    expect(NOTIFICATION_PARAMS["access.aipGranted"]).toEqual([]);
  });
```

with:

```ts
    expect(NOTIFICATION_PARAMS["access.aipGranted"]).toEqual([]);
    expect(NOTIFICATION_PARAMS["points.adjusted"]).toEqual([
      "amount",
      "detail",
    ]);
  });
```

In `describe("notificationIcon")`, replace:

```ts
    expect(notificationIcon("security.newSignIn")).toBe("shieldCheck");
  });
```

with:

```ts
    expect(notificationIcon("security.newSignIn")).toBe("shieldCheck");
    expect(notificationIcon("points.adjusted")).toBe("adjustments");
  });
```

- [ ] **Step 3: Write the failing tests in `src/notificationMessages.test.ts`**

Insert after the closing `});` of `test("an invalid month renders as given and does not throw", …)`:

```ts
test("points.adjusted signs the amount in every locale", () => {
  const grant = {
    kind: "points.adjusted",
    params: { amount: 500, detail: "国庆联飞补发" },
  };
  const deduct = {
    kind: "points.adjusted",
    params: { amount: -1000000, detail: "撤销：国庆联飞补发" },
  };
  expect(renderNotification(grant, "zh-cn")).toBe(
    "你的积分已调整 +500：国庆联飞补发",
  );
  expect(renderNotification(grant, "zh-tw")).toBe(
    "你的積分已調整 +500：国庆联飞补发",
  );
  expect(renderNotification(grant, "en-us")).toBe(
    "Your points were adjusted by +500: 国庆联飞补发",
  );
  expect(renderNotification(grant, "ja-jp")).toBe(
    "ポイントが +500 調整されました：国庆联飞补发",
  );
  expect(renderNotification(deduct, "zh-cn")).toBe(
    "你的积分已调整 -1,000,000：撤销：国庆联飞补发",
  );
  expect(renderNotification(deduct, "en-us")).toBe(
    "Your points were adjusted by -1,000,000: 撤销：国庆联飞补发",
  );
});

test("points.adjusted keeps a non-numeric amount as given", () => {
  expect(
    renderNotification(
      { kind: "points.adjusted", params: { amount: "500", detail: "补发" } },
      "zh-cn",
    ),
  ).toBe("你的积分已调整 500：补发");
});
```

In `test("Chinese templates put no space around Chinese-valued placeholders", …)`, replace:

```ts
expect(message).not.toMatch(/ \{(prize|title|app|paper)\}/);
expect(message).not.toMatch(/\{(prize|title|app|paper)\} /);
```

with:

```ts
expect(message).not.toMatch(/ \{(prize|title|app|paper|detail)\}/);
expect(message).not.toMatch(/\{(prize|title|app|paper|detail)\} /);
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `bun test src/notifications.test.ts src/notificationMessages.test.ts`
Expected: FAIL — "match the contract exactly" (missing `points.adjusted`), "params match the contract", "by category" (`bell` ≠ `adjustments`), and both `points.adjusted` render tests (generic line returned).

- [ ] **Step 5: Implement in `src/notifications.ts`**

In `NOTIFICATION_KINDS`, replace:

```ts
  "access.aipGranted",
  "access.aipRevoked",
] as const;
```

with:

```ts
  "access.aipGranted",
  "access.aipRevoked",
  "points.adjusted",
] as const;
```

In `NOTIFICATION_PARAMS`, replace:

```ts
  "access.aipRevoked": [],
};
```

with:

```ts
  "access.aipRevoked": [],
  "points.adjusted": ["amount", "detail"],
};
```

In `CATEGORY_ICONS`, replace:

```ts
  leaderboard: "chartBar",
```

with:

```ts
  leaderboard: "chartBar",
  points: "adjustments",
```

- [ ] **Step 6: Implement in `src/notificationMessages.ts`**

Header comment, replace:

```ts
 * renders the same rows, and 25 kinds × four locales × nine sites is not a
```

with:

```ts
 * renders the same rows, and 26 kinds × four locales × nine sites is not a
```

`ZH_CN`, replace:

```ts
  "access.aipRevoked": "你的航行资料库访问权限已被撤销",
};
```

with:

```ts
  "access.aipRevoked": "你的航行资料库访问权限已被撤销",
  "points.adjusted": "你的积分已调整 {amount}：{detail}",
};
```

`ZH_TW`, replace:

```ts
  "access.aipRevoked": "你的航行資料庫存取權限已被撤銷",
};
```

with:

```ts
  "access.aipRevoked": "你的航行資料庫存取權限已被撤銷",
  "points.adjusted": "你的積分已調整 {amount}：{detail}",
};
```

`EN_US`, replace:

```ts
  "access.aipRevoked": "Your access to the aeronautical database was revoked",
};
```

with:

```ts
  "access.aipRevoked": "Your access to the aeronautical database was revoked",
  "points.adjusted": "Your points were adjusted by {amount}: {detail}",
};
```

`JA_JP`, replace:

```ts
  "access.aipRevoked": "航空情報データベースへのアクセス権が取り消されました",
};
```

with:

```ts
  "access.aipRevoked": "航空情報データベースへのアクセス権が取り消されました",
  "points.adjusted": "ポイントが {amount} 調整されました：{detail}",
};
```

In `formatParam`, replace:

```ts
if (typeof value === "string" || typeof value === "number") {
  return String(value);
}
```

with:

```ts
if (key === "amount" && typeof value === "number") {
  return new Intl.NumberFormat(locale, { signDisplay: "exceptZero" }).format(
    value,
  );
}
if (typeof value === "string" || typeof value === "number") {
  return String(value);
}
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `bun test src/notifications.test.ts src/notificationMessages.test.ts`
Expected: PASS, 0 fail.

- [ ] **Step 8: Format and gate**

Run: `bunx prettier --write src/notifications.ts src/notifications.test.ts src/notificationMessages.ts src/notificationMessages.test.ts && bun run lint && bun run build`
Expected: both exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/notifications.ts src/notifications.test.ts src/notificationMessages.ts src/notificationMessages.test.ts
timeout 60 git commit -m "$(cat <<'EOF'
Add points.adjusted notification kind with signed amount

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

Expected: one commit on `feat/points-adjusted`. `git log --oneline -1` shows the subject.

---

### Task 2: Docs, version 27.4.0 and PR

**Files:**

- Modify: `AGENTS.md` (line 392)
- Modify: `package.json` (line 3)

**Interfaces:**

- Produces: package version `27.4.0`; PR `can-ui 27.4.0: points.adjusted notification` against `main`.

- [ ] **Step 1: Update `AGENTS.md`**

Replace:

```md
- Text: `renderNotification(item, locale)`. can-ui carries `NOTIFICATION_MESSAGES` (25 kinds ×
```

with:

```md
- Text: `renderNotification(item, locale)`. can-ui carries `NOTIFICATION_MESSAGES` (26 kinds ×
```

Below the `redemption.cancelled` bullet's last line (`  Ratings render as codes (`RATING_SHORT`).`), insert:

```md
- `amount` renders signed (`+500`, `-500`) through `Intl.NumberFormat` with `signDisplay:
"exceptZero"`. `points.adjusted` uses it.
```

- [ ] **Step 2: Bump the version in `package.json`**

Replace:

```json
  "version": "27.3.0",
```

with:

```json
  "version": "27.4.0",
```

- [ ] **Step 3: Gate**

Run: `bunx prettier --write AGENTS.md package.json && bun run lint && bun run build && bun pm pack --dry-run | grep -c "\.test\.ts"`
Expected: lint and build exit 0; the grep count is `0` (tests excluded from the package).

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md package.json
timeout 60 git commit -m "$(cat <<'EOF'
can-ui 27.4.0: points.adjusted notification

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin feat/points-adjusted
gh pr create --base main --head feat/points-adjusted \
  --title "can-ui 27.4.0: points.adjusted notification" \
  --body "$(cat <<'EOF'
Adds notification kind points.adjusted with params amount and detail.
amount renders signed in all four locales.
Category icon: adjustments.
Version 27.4.0.

Check:
- bun run lint && bun run build
- renderNotification for points.adjusted in zh-cn, zh-tw, en-us, ja-jp

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Expected: a PR URL on `JianyueLab-Org/can-ui`. `check.yml` runs on it.

---

### Task 3: Release v27.4.0

Run only after the PR is merged into `main` and can-api's `points.adjusted` is merged.

**Files:** none.

**Interfaces:**

- Produces: tag `v27.4.0`, package `@jianyuelab-org/can-ui@27.4.0` on GitHub Packages, and one PR `chore: bump can-ui to 27.4.0` (branch `chore/can-ui-27.4.0`) in each of can-web, can-dev, can-exam, can-radar, can-efb, can-controller, can-portal and can-database.

- [ ] **Step 1: Confirm `main` carries the version**

```bash
git switch main && git pull --ff-only && git log --oneline -3 && grep '"version"' package.json
```

Expected: the merge commit of the PR on top; `"version": "27.4.0"`.

- [ ] **Step 2: Create the release**

```bash
gh release create v27.4.0 --target main --title "v27.4.0 — points.adjusted notification" --notes "$(cat <<'EOF'
- New notification kind points.adjusted. Params: amount (signed integer), detail.
- amount renders signed: +500, -500.
- Icon: adjustments.
- Pin the exact version.
EOF
)"
```

Expected: release URL. `publish.yml` and `bump-consumers.yml` start.

- [ ] **Step 3: Verify publish and bump PRs**

```bash
gh run list --workflow publish.yml --limit 1
gh run list --workflow bump-consumers.yml --limit 1
```

Expected: both `completed success` within ~25 minutes. `gh pr list --repo JianyueLab/can-web --head chore/can-ui-27.4.0` shows the bump PR; repeat for the seven `JianyueLab-Org/*` sites.
