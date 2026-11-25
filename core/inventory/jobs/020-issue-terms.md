- `scripts/issue-terms.mjs`, a step of `.github/workflows/look.yml` and `.github/workflows/own-look.yml`: takes the
  terms of the secret `PERSONAL_TERMS` out of the issues, closed pull requests and comments written or edited in the
  week before, printing counts alone, an outsider's text left alone; `--private`, run by the owner with the list in a
  file, names them and the texts whose kept versions hold one (#783). *Runs:* the runners on a schedule, where the
  secret is; the owner's own terminal. *Else:* GitHub's secret scanning with custom patterns, dropped on fact: it raises
  alerts and edits nothing, and its custom patterns in a private repository are paid; gitleaks or Betterleaks, the
  lookup of #488, kept for the matching alone, as for `personal-terms.yml`, whose matcher this one's test holds it in
  step with. *Bugs:* 0. **Keep:** nothing fits.
