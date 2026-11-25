// The stage of scripts/steps/190-the-nuget-check.mjs: how a project that missed that step holds it, and its mend as the step words it.
// scripts/steps-stage.mjs loads it, in the order of the names.
import fs from "node:fs";
import { at, read, write, folds, NUGET } from "../stage-helpers.mjs";

export default {
  stage: dir => write(dir, "stage/Staged.csproj", "<Project Sdk=\"Microsoft.NET.Sdk\" />\n"),
  // (as the step words it: the lock file committed, the core's NuGet check called, and the lock file named in the
  // licence check's config)
  mend: dir => {
    write(dir, "stage/packages.lock.json", "{\n  \"version\": 1,\n  \"dependencies\": {}\n}\n");
    if (!fs.existsSync(at(dir, ".github/workflows/nuget.yml")) && !folds(dir, "nuget")) write(dir, ".github/workflows/nuget.yml", NUGET);
    const config = JSON.parse(read(dir, "checks/licences.json"));
    config.nuget ??= { ships: [], tools: [] };
    config.nuget.ships = [...(config.nuget.ships ?? []), "stage/packages.lock.json"];
    write(dir, "checks/licences.json", `${JSON.stringify(config, null, 2)}\n`);
  },
};
