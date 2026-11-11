# Closed pull requests' previews are taken down on the next run

**What:** the core's `preview.yml` gains a last step: it lists the `pr-<n>/` folders on `gh-pages` and removes each
whose pull request is closed, with `site-publish.sh pr-<n> --remove`.

**Why:** a preview is removed by the run its pull request's close starts; when that run fails, is skipped, or has only
a read-only token (a close by Dependabot), the preview stays for good. After the games moved to the shared workflow,
one game's site still held four previews of pull requests closed a day earlier. The other game's old workflow had
swept them on every publish of main; the fallback review of the switch noted that loss.

**What it changes in every project:** nothing to do but take the sync; a closed pull request's preview goes at the
latest on the next run of any pull request.

**Checked:** against a local repository with a stub `gh`: a closed PR's folder is removed, an open one's kept, and one
whose PR cannot be read is left alone.
