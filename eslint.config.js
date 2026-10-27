// The engine's determinism rules ("Engine rules" under Tech stack in the design document): a replay, the parity gate and,
// later, a server and its clients must reach the same state, so the engine uses no clock, no randomness of its own, no
// culture-sensitive text, and only the Math functions whose results every JavaScript engine rounds the same way.
import tseslint from "typescript-eslint";

const exactMath = ["abs", "sign", "floor", "ceil", "round", "trunc", "min", "max", "sqrt", "imul", "clz32", "fround"];

const determinism = {
  "no-restricted-globals": [
    "error",
    { name: "Date", message: "The engine keeps no clock: turns are its only time." },
    { name: "Intl", message: "Culture-sensitive formatting differs between engines: use the engine's own formatting helpers." },
    { name: "performance", message: "The engine keeps no clock." },
    { name: "window", message: "The engine is pure: no browser code." },
    { name: "document", message: "The engine is pure: no browser code." },
    { name: "process", message: "The engine is pure: no Node code." },
  ],
  "no-restricted-properties": [
    "error",
    { object: "Math", property: "random", message: "Randomness comes only from the seeded generator (Rng)." },
    { property: "localeCompare", message: "Culture-sensitive: compare with cmpStr (ordinal)." },
    { property: "toLocaleString", message: "Culture-sensitive: use the engine's formatting helpers." },
    { property: "toLocaleUpperCase", message: "Culture-sensitive: use toUpperCase." },
    { property: "toLocaleLowerCase", message: "Culture-sensitive: use toLowerCase." },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector: `MemberExpression[object.name='Math'][property.name!=/^(${exactMath.join("|")}|PI|E|random)$/]`,
      message: `Only Math functions that every engine rounds alike are allowed (${exactMath.join(", ")}); use integer or fixed-point arithmetic or tables.`,
    },
    { selector: "BinaryExpression[operator='**']:not([left.bigint])", message: "** may round differently between engines: multiply, or use a table (BigInt powers are exact)." },
    { selector: "AssignmentExpression[operator='**=']", message: "** may round differently between engines: multiply, or use a table." },
    {
      selector: "CallExpression[callee.property.name=/^(sort|toSorted)$/][arguments.length=0]",
      message: "Sort with an explicit comparison: the default sorts by UTF-16 strings, which is rarely what is meant.",
    },
    { selector: "NewExpression[callee.name='Date']", message: "The engine keeps no clock: turns are its only time." },
  ],
};

export default tseslint.config(
  { ignores: ["**/dist/**", "**/node_modules/**"] },
  {
    files: ["src/engine/src/**/*.ts"],
    languageOptions: { parser: tseslint.parser },
    rules: determinism,
  },
);
