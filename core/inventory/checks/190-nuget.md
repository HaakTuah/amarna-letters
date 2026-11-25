- `scripts/nuget.mjs`, `scripts/nuget-fetch.mjs`, `scripts/nuget-look.sh`, `.github/workflows/nuget.yml`,
  `tests/nuget-gate-test.mjs`, `tests/nuget-gate-network-test.mjs`, `scripts/nuget-gate-scratch.mjs`: for a .NET project, every package one exact version under a licence on the list, each
  read from a package fetched before the pull request's build files run. *Runs:* any session with the .NET SDK, and the
  runners. *Else:* nuget-license (a .NET tool that holds packages to a list of licences), kept; `dotnet list package
  --include-transitive --format json`, kept, for the packages; dotnet-project-licenses, dropped on fact: its last
  release on NuGet is 3.0.0-alpha.9 of 25 November 2022, and none came in the year to 17 November 2026, where
  nuget-license published 25. *Bugs:* 7, 1, 0 and 4. **Try** nuget-license and the SDK's own list for the reading;
  **keep** the fetch before the build, which is a boundary of the floor's (what a build could write never decides a
  licence), and the policy. *Tried:* 18 November 2026 (#586), nuget-license 4.0.18 (Apache-2.0) and `dotnet list package
  --include-transitive --format json` on .NET SDK 10.0.404, on 25 projects built from the kinds of package the core's
  tests make, each restored from a local feed; the core's reading kept, on measure, the check unchanged. Neither reads a
  licence before a restore has run the pull request's project files: nuget-license takes only a project or solution and
  reads its packages from the assets file a restore writes (with none, it stops), reading each licence from the `.nupkg`
  in the folder that restore filled, hash unchecked, so a package swapped there after the restore read MIT for a GPL-3.0
  one, and asking the project's sources over the network for one that is missing; `dotnet list package` reads no licence
  at all, restores by itself unless told not to, and missed a PackageDownload. Against the core, on the same 25:
  nuget-license read the same licence in 17, read another in 5 and nothing in 3 (a crash on a non-breaking space, a
  package NuGet would not restore, the PackageDownload), and passed 7 the core fails (a licence file and a licence
  address it guessed from, an AND and OR without brackets, a WITH, two version ranges, the PackageDownload), failing
  none the core passes; it holds no exact version, no owner's yes, no audit and no base. *Replayed:* #240, #274 and #280
  read, after a restore (MSBuild follows the Import that brings the GPL-3.0 package, though nuget-license holds no lock
  file, so #240's lock file kept elsewhere goes unheld); #269 not read (a package folder the pull request names, its
  package altered to say MIT, passes the locked restore and nuget-license alike); #373, #380, #366, #386 and #355 not
  run (a billed job, the first look's choice to restore, the configs' paths, and a change of shape: none a reading of a
  package); #446 not run (open, with no fix).
