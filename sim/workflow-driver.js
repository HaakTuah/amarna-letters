// A Claude Code workflow script, not a Node program: it runs inside a Claude Code session that can run workflows (the
// Workflow tool), which provides `args`, `agent`, `parallel`, `phase` and `log`. It drives one game of the agent
// simulation in place of the orchestrating session's own loop on wait.js (sim/README.md, "Orchestrating from a
// workflow"). The second simulation (Build order item 4, 19 October 2026) ran both its games with it.
//
// Before running it: the agent types are loaded in the session (the kings and characters made by sim/setup.js, and
// .claude/agents/sim-poller.md, which this script uses to poll), the isolation test has passed, and the batch runner
// has been started in the background as in step 3 of docs/SIMULATION-PROMPT.md, writing to the log named below. Then
// start this script as a workflow with arguments such as
//   { "log": "sim/runs/seed-7/batch.log", "seed": "7", "untilTurn": 3, "maxRounds": 300 }
// untilTurn pauses it before the first request of a later season (for the usage check after season 3), and the same
// call with "untilTurn": 0 runs on to the end of the game. It returns only counts:
//   { status, rounds, kingCalls, charCalls, maxTurn, perTurn, nextTurn?, stuck? }
// with status "finished", "paused", "stuck" (a request still listed after 3 starts), "poller-failing" (more than five
// unreadable polls in a row) or "max-rounds". Every agent's final text is discarded, so the orchestrator's rule holds.
//
// Copied unchanged, below this comment, from the session's workflow script sim2-game-driver-wf_684add42-0dc.js.

export const meta = {
  name: 'sim2-game-driver',
  description: 'Second simulation: drive one game by polling sim/wait.js and starting the waiting king and character agents, up to a turn limit',
  phases: [{ title: 'Game' }],
}
// args: { log, seed, untilTurn, maxRounds }. The orchestrator's rule: agents' final texts are never read, kept or returned.
const turnOf = r => Number(((r.request || '').match(/^t(\d+)_/) || [])[1] || 0)
const modelOf = a => a.startsWith('king-') ? 'sonnet' : 'haiku'
const POLL = { type: 'object', properties: { json: { type: 'string' } }, required: ['json'] }
const cmd = 'node sim/wait.js ' + args.log + ' 100 --seed ' + args.seed
const tries = {}
const perTurn = {}
let rounds = 0, kingCalls = 0, charCalls = 0, maxTurn = 0, badPolls = 0
const result = status => ({ status, rounds, kingCalls, charCalls, maxTurn, perTurn })
phase('Game')
while (rounds < args.maxRounds) {
  rounds++
  const p = await agent('Run this command: ' + cmd, { label: 'poll ' + rounds, phase: 'Game', agentType: 'sim-poller', model: 'haiku', effort: 'low', schema: POLL })
  let st = null
  try { st = JSON.parse(p && p.json) } catch (e) { st = null }
  if (!st || !st.status) { badPolls++; log('unreadable poll (' + badPolls + ')'); if (badPolls > 5) return result('poller-failing'); continue }
  badPolls = 0
  if (st.status === 'finished') return result('finished')
  if (st.status !== 'waiting' || !st.pending || !st.pending.length) continue
  const t = Math.max(...st.pending.map(turnOf))
  if (args.untilTurn && t > args.untilTurn) { const r = result('paused'); r.nextTurn = t; return r }
  maxTurn = Math.max(maxTurn, t)
  const stuck = st.pending.filter(r => (tries[r.agent + '/' + r.request] || 0) >= 3)
  if (stuck.length) { const r = result('stuck'); r.stuck = stuck; return r }
  log('round ' + rounds + ': turn ' + t + ', ' + st.pending.length + ' requests')
  await parallel(st.pending.map(r => () => {
    const k = r.agent + '/' + r.request
    tries[k] = (tries[k] || 0) + 1
    const king = r.agent.startsWith('king-')
    if (king) kingCalls++; else charCalls++
    const key = 't' + turnOf(r)
    perTurn[key] = perTurn[key] || { king: 0, char: 0 }
    perTurn[key][king ? 'king' : 'char']++
    return agent('Your request file is ' + r.request + ' in your folder. Read it, decide, and write your reply where it says.', { label: r.agent + ' ' + r.request.replace('.request.md', ''), phase: 'Game', agentType: r.agent, model: modelOf(r.agent) }).then(() => true)
  }))
}
return result('max-rounds')
