// The core's own address, written once (one fact, one place): every script that names the core, or the account it is
// under, reads it here. The one other place is the `CORE` of .github/workflows/core.yml, which checks a project's copy
// and so may not read its address from that copy. GitHub itself needs it written out in a workflow's call to the core,
// in an issue template's assignee and in the *owner's account* slot: core-address-test.mjs names each place that must
// follow when it changes, and fails where the repository it runs in is not the one named here.
export const CORE = "HaakTuah/agent-core";
export const OWNER = CORE.split("/")[0];
// CORE as a regular expression's source, for a pattern built around it (with or without the `u` flag)
export const CORE_SOURCE = CORE.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&");
