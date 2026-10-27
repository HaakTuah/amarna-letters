/**
 * The few .NET file and timing calls the ported file-seat and local-play tests make, over Node's own (tests only: the
 * C# tests drove FileSeat and the local bridge through real folders, and so do these).
 */
import { existsSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync, unlinkSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export const SearchOption = { topDirectoryOnly: 0, allDirectories: 1 } as const;

const glob = (pattern: string): RegExp => new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".") + "$");

export const File = {
  exists: (path: string): boolean => existsSync(path) && statSync(path).isFile(),
  readAllText: (path: string): Promise<string> => readFile(path, "utf8"),
  writeAllText: (path: string, text: string): Promise<void> => writeFile(path, text, "utf8"),
  move: (from: string, to: string): void => renameSync(from, to),
  delete: (path: string): void => {
    if (existsSync(path)) unlinkSync(path);
  },
};

export const Directory = {
  /** Files in a folder (and its subfolders, with allDirectories) whose names match a pattern like "*.request.md". */
  getFiles(folder: string, pattern = "*", option: number = SearchOption.topDirectoryOnly): string[] {
    const re = glob(pattern);
    const out: string[] = [];
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (option === SearchOption.allDirectories) walk(p);
        } else if (re.test(e.name)) out.push(p);
      }
    };
    walk(folder);
    return out.sort();
  },
  /** A new empty folder under the system's temporary folder, whose path it returns (the C# returned a DirectoryInfo). */
  createTempSubdirectory: (prefix = ""): { fullName: string } => ({ fullName: mkdtempSync(join(tmpdir(), prefix)) }),
  delete: (path: string, recursive = false): void => rmSync(path, { recursive, force: true }),
};

export const Path = {
  combine: (...parts: string[]): string => join(...parts),
  getFileName: (path: string): string => basename(path),
  getDirectoryName: (path: string): string => dirname(path),
  getFullPath: (path: string): string => resolve(path),
};

/** .NET's Task.Delay. */
export const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });
