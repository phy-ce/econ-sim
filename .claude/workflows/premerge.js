export const meta = {
  name: 'premerge',
  description: 'Before merging a wt-* branch into main: tests, doc/rationale/stale-text review, fix on the branch, re-test',
  whenToUse: 'Every time a work branch is about to be merged into main (args: branch name, e.g. "wt-aifix", or {branch, worktree})',
  phases: [
    { title: 'Scope', detail: 'size the checks to the diff: docs, value or full' },
    { title: 'Gate', detail: 'typecheck and tests, as far as the scope needs' },
    { title: 'Review', detail: 'lenses for the scope: design/encyclopedia, rationale, stale text, handoff/UI docs' },
    { title: 'Fix', detail: 'one agent applies the findings on the branch' },
    { title: 'Verify', detail: 'gate again' },
  ],
}

// 사용: Workflow({ name: 'premerge', args: 'wt-aifix' }) 또는 args: { branch: 'wt-aifix', worktree: '.tmp/wt/aifix', scope: 'full' }
// 범위는 diff 로 정한다 (scope 를 주면 그 값을 쓴다):
//   docs  = 문서·보고서·.claude 만 바뀜. 전체 테스트 없음, handoff 검토만. DESIGN.md 가 바뀌면 사전 시험 때문에 test:core 를 돌린다
//   value = sim 코드에서 기존 상수의 숫자만 바뀜. 전체 테스트, rationale 검토만
//   full  = 그 밖 전부. 전체 테스트, 네 관점 검토
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
// level: 'core' = typecheck + test:core, 'full' = typecheck + 전체 (전체에 test/core 가 들어 있어 test:core 를 따로 돌리지 않는다)
const gate = (phase, level) => agent(`${SAFETY}

Run in the worktree, in order, and report each failure with its key error lines:
1. npm run typecheck
${level === 'full'
    ? `2. cd packages/sim && npx vitest run
3. npx tsx packages/sim/cli/methods_audit.ts (only if building/method data changed in the diff)`
    : `2. npm run test:core`}
ok = all passed. Do not fix anything.`, { label: `gate:${phase}`, phase, schema: GATE_SCHEMA })

const SCOPE_SCHEMA = {
  type: 'object',
  properties: {
    files: { type: 'array', items: { type: 'string' } },
    valueOnly: { type: 'boolean' },
  },
  required: ['files', 'valueOnly'],
}
const FIX_SCHEMA = {
  type: 'object',
  properties: {
    changed: { type: 'array', items: { type: 'string' }, description: 'files changed' },
    logicChanged: { type: 'boolean', description: 'true if any change is more than text: docs, comments or encyclopedia wording' },
    skipped: { type: 'array', items: { type: 'string' }, description: 'findings skipped and why' },
  },
  required: ['changed', 'logicChanged', 'skipped'],
}

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

phase('Scope')
const sc = await agent(`${SAFETY}

Report the change size. Read-only.
files = the output of \`git diff --name-only main...${branch}\`, every path.
valueOnly = true only if every changed line in code files (anything that is not .md, not under tools/reports/public/data, not under .claude) changes just the numeric literal of an existing constant in packages/sim/src. New keys, new branches, changed expressions, renames or changed tests make it false. If unsure, false.`, { label: 'scope', phase: 'Scope', effort: 'low', schema: SCOPE_SCHEMA })
const files = sc?.files ?? []
const isDoc = (f) => f.endsWith('.md') || f.startsWith('tools/reports/public/data/') || f.startsWith('.claude/')
const auto = !files.length ? 'full' : files.every(isDoc) ? 'docs' : sc.valueOnly ? 'value' : 'full'
const scope = A.scope ?? auto
const gateLevel = scope !== 'docs' ? 'full' : files.includes('docs/DESIGN.md') ? 'core' : null
const lenses = LENSES.filter((l) => scope === 'full' || l.key === (scope === 'docs' ? 'handoff' : 'rationale'))
log(`scope ${scope}: ${files.length} files, gate ${gateLevel ?? 'none'}, lenses ${lenses.map((l) => l.key).join(', ')}`)

if (gateLevel) {
  phase('Gate')
  const g1 = await gate('Gate', gateLevel)
  if (!g1 || !g1.ok) return { branch, scope, stage: 'gate', failures: g1?.failures ?? ['gate agent failed'] }
}

phase('Review')
const reviews = await parallel(lenses.map((l) => () =>
  agent(`${SAFETY}

You are reviewing before merge. Read-only: do not edit files.
${l.prompt}
Report only real problems with file, line and an exact fix. Empty list if none.`, { label: `review:${l.key}`, phase: 'Review', schema: FINDINGS })
    .then((r) => (r?.findings ?? []).map((f) => ({ ...f, lens: l.key })))))
const findings = reviews.filter(Boolean).flat()
log(`${findings.length} findings: ` + lenses.map((l) => `${l.key} ${findings.filter((f) => f.lens === l.key).length}`).join(', '))

if (findings.length) {
  phase('Fix')
  const fx = await agent(`${SAFETY}

Apply these review findings on the branch (docs, comments, encyclopedia text; code only where a finding says the code itself is wrong — then say so). Keep Korean style of surrounding text. If a finding is wrong, skip it and say why.
Findings (JSON):
${JSON.stringify(findings, null, 1)}
Then commit on ${branch} with explicit git add paths, message "Premerge fixes: ..." and footer "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>". Return what you changed and what you skipped.`, { label: 'fix', phase: 'Fix', schema: FIX_SCHEMA })

  phase('Verify')
  // 글만 고쳤으면 typecheck + test:core (사전·DESIGN 시험 포함) 로 충분하다. 고친 내용을 모르면 전체를 돌린다
  const g2 = await gate('Verify', !fx || fx.logicChanged ? 'full' : 'core')
  if (!g2 || !g2.ok) return { branch, scope, stage: 'verify', findings, failures: g2?.failures ?? ['gate agent failed'] }
}

return { branch, scope, stage: 'ready', findings }
