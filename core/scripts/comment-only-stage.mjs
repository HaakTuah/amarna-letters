// The workflow the proof's tests read (tests/comment-only-test.mjs and tests/comment-only-run-test.mjs, beside this file): one
// small workflow with each place a comment can seem to stand, and the one change made to a text of it, every name invented.

export const BASE = `# A workflow for the test
name: t
on:
  pull_request:
    types: [opened, synchronize] # the kinds
permissions:
  contents: read
jobs:
  build:
    name: Build
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - name: one
            os: ubuntu-latest
    steps:
      - uses: actions/checkout@0123456789abcdef0123456789abcdef01234567 # v7.0.1
        with:
          persist-credentials: false
          name: an-input
      - name: The check
        if: \${{ !cancelled() }}
        run: |
          # the shell's own comment
          echo "a #b"
          cat <<EOF
          # data, not a comment
          EOF
        env:
          X: "y" # a quoted value
      - name: "Quoted \${{ github.ref }}"
        run: echo hi
      - name: 'Single'
        shell: bash
        run: >-
          echo folded
`;
export const edit = (from, to, text = BASE) => { if (!text.includes(from)) throw new Error(`no ${JSON.stringify(from)} in the text`); return text.replace(from, to); };
