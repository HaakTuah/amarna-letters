- **A check of the shell scripts** (the scripts whose names end `.sh`, and each workflow step's script). *Runs:* any
  session and the runners. *Else:* ShellCheck (GPL-3.0, allowed for a tool that only runs, one program for each system),
  kept, untried: not on this machine; actionlint runs it over the steps' scripts where it is installed. **Try** with the
  replacement of the workflow check, which brings actionlint.
