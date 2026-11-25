- `scripts/read-total.mjs`: sums what the core's tasks read, each file opened a cost, and fails a pull request that
  cuts or joins the rule files where the sum does not go down, a reader reads more or loses a file (#469), and any
  pull request whose tree's path patterns run past its budget of steps (#673); `size.yml` runs it. *Runs:* any
  session and the runners. *Else:* none searched: it reads the core's own reading script, which no tool knows.
  *Bugs:* 0. **Keep:** the reading it sums is the core's.
