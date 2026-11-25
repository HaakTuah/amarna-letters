// What a script prints, written whole before it exits (#444): on Linux and macOS Node writes to a pipe as the pipe
// takes it, so a script that prints a long failure and then calls process.exit loses its last lines, the verdict or
// its "Mend:" among them, wherever its output is piped (a workflow's step, a test). Imported first, for its effect
// alone, by each script that exits so; a file, a terminal and Windows' pipes are written whole already, and a stream
// with no such handle is left as it is. Node's own modules only.
for (const stream of [process.stdout, process.stderr]) stream._handle?.setBlocking?.(true);
