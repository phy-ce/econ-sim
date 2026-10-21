export const meta = {
  name: 'premerge',
  description: 'Before merging a wt-* branch into main: tests, doc/rationale/stale-text review, fix on the branch, re-test',
  whenToUse: 'Every time a work branch is about to be merged into main (args: branch name, e.g. "wt-aifix", or {branch, worktree})',
  phases: [
    { title: 'Gate', detail: 'typecheck, core + full tests, methods audit' },
    { title: 'Review', detail: '4 lenses: design/encyclopedia, rationale, stale text, handoff/UI docs' },
    { title: 'Fix', detail: 'one agent applies the findings on the branch' },
    { title: 'Verify', detail: 'gate again' },
  ],
}

// 사용: Workflow({ name: 'premerge', args: 'wt-aifix' }) 또는 args: { branch: 'wt-aifix', worktree: '.tmp/wt/aifix' }
const A = typeof args === 'string' ? { branch: args } : (args ?? {})
if (!A.branch) throw new Error('args: branch name (wt-...) is required')
const branch = A.branch
const wt = A.worktree ?? `.tmp/wt/${branch.replace(/^wt-/, '')}`

const SAFETY = `Repo root: C:/Users/phyju/Desktop/Coding_Desk/2026/estera economy sim. Work only in the worktree ${wt} (branch ${branch}); if it does not exist, create it with \`git worktree add ${wt} ${branch}\` and run \`npm ci --prefer-offline --no-audit --no-fund\` there.
SAFETY: never use delete commands (rm/del/Remove-Item); never git clean/reset --hard/restore/stash/branch -D/worktree remove/force push; stage explicit paths only (no -A/./-a). Never touch the main checkout or merge into main. Don't edit packages/client except a minimal compile fix noted in docs/UI_CHANGES.md.
The change under review is \`git diff main...${branch}\` (and \`git log main..${branch}\`).`

const GATE_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    failures: { type: 'array', items: { type: 'string' } },
  },
  required: ['ok', 'failures'],
}
const gate = (phase) => agent(`${SAFETY}

Run in the worktree, in order, and report each failure with its key error lines:
1. npm run typecheck
2. npm run test:core
3. cd packages/sim && npx vitest run
4. npx tsx packages/sim/cli/methods_audit.ts (only if building/method data changed in the diff)
ok = all passed. Do not fix anything.`, { label: `gate:${phase}`, phase, schema: GATE_SCHEMA })

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          line: { type: 'number' },
          problem: { type: 'string' },
          fix: { type: 'string', description: 'exact replacement text or precise instruction' },
        },
        required: ['file', 'problem', 'fix'],
      },
    },
  },
  required: ['findings'],
}

const LENSES = [
  {
    key: 'design',
    prompt: `Lens: rules described = rules in code. For every behaviour changed in packages/sim/src by this diff, check docs/DESIGN.md (the matching section), packages/sim/src/encyclopedia.ts entries (rule text, params, live functions), and README.md if player-facing, describe the CURRENT behaviour. Numbers in docs must match the code constants (read them, don't trust the docs). Encyclopedia text must use params ({0}) for numbers, never hard-coded copies.`,
  },
  {
    key: 'rationale',
    prompt: `Lens: rationale recorded (CLAUDE.md rule). For every TUNE key or economic constant added or changed in the diff, and every new rule: DESIGN.md section 11 table row exists with the current value and a 근거 cell (candidates compared, conditions: years×seeds and code commit, numbers or report id, source such as VIC3_REFERENCE, why chosen, known weaknesses), or "근거 없음" stated honestly. User decisions are in docs/DECISIONS.md. Report ids cited must exist in tools/reports/public/data/. Experimental switches say default and why they are off.`,
  },
  {
    key: 'stale',
    prompt: `Lens: leftovers of removed or renamed things. From the diff, list everything removed or renamed (functions, fields, TUNE keys, types, buildings, classes, concepts like "investment pool" or "capitalist seats", old numbers). Grep the whole repo outside the diff — docs/*.md, README.md, HANDOFF.md, packages/sim/src comments, encyclopedia.ts, TUNE_EXPERIMENTAL lists, packages/sim/cli, tools/reports labels — for text that still describes the old thing as current. Historical notes clearly marked as past (DECISIONS history, "예전") are fine.`,
  },
  {
    key: 'handoff',
    prompt: `Lens: hand-over docs. Check: HANDOFF.md has a section for this branch (what changed, numbers, open questions); if any sim API/type the client uses changed, docs/UI_CHANGES.md has a "0. 지금 할 일" line and a section in chapter 2 (client compile fixes listed by file:line); UI_CHANGES section numbers don't collide with main's; DECISIONS.md has entries for anything awaiting a user decision; comparison results are in a report (tools/reports/public/data/<id>.json) when the branch tuned values.`,
  },
]

phase('Gate')
const g1 = await gate('Gate')
if (!g1 || !g1.ok) return { branch, stage: 'gate', failures: g1?.failures ?? ['gate agent failed'] }

phase('Review')
const reviews = await parallel(LENSES.map((l) => () =>
  agent(`${SAFETY}

You are reviewing before merge. Read-only: do not edit files.
${l.prompt}
Report only real problems with file, line and an exact fix. Empty list if none.`, { label: `review:${l.key}`, phase: 'Review', schema: FINDINGS })
    .then((r) => (r?.findings ?? []).map((f) => ({ ...f, lens: l.key })))))
const findings = reviews.filter(Boolean).flat()
log(`${findings.length} findings: ` + LENSES.map((l) => `${l.key} ${findings.filter((f) => f.lens === l.key).length}`).join(', '))

if (findings.length) {
  phase('Fix')
  await agent(`${SAFETY}

Apply these review findings on the branch (docs, comments, encyclopedia text; code only where a finding says the code itself is wrong — then say so). Keep Korean style of surrounding text. If a finding is wrong, skip it and say why.
Findings (JSON):
${JSON.stringify(findings, null, 1)}
Then commit on ${branch} with explicit git add paths, message "Premerge fixes: ..." and footer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Return what you changed and what you skipped.`, { label: 'fix', phase: 'Fix' })

  phase('Verify')
  const g2 = await gate('Verify')
  if (!g2 || !g2.ok) return { branch, stage: 'verify', findings, failures: g2?.failures ?? ['gate agent failed'] }
}

return { branch, stage: 'ready', findings }
