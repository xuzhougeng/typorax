import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createInvocation } from "./tauri-build.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("package.json routes tauri:build through the cross-platform wrapper", () => {
  const packageJson = JSON.parse(
    readFileSync(path.join(rootDir, "package.json"), "utf8")
  );

  assert.equal(packageJson.scripts["tauri:build"], "node ./scripts/tauri-build.mjs");
});

test("Windows invocation uses tauri.cmd and strips CI", () => {
  const invocation = createInvocation(["--target", "x86_64-pc-windows-msvc"], {
    CI: "1",
    TAURI_BUILD_DRY_RUN: "1",
    TAURI_BUILD_PLATFORM: "win32"
  });

  assert.match(invocation.command, /node_modules[\\/]\.bin[\\/]tauri\.cmd$/u);
  assert.equal(invocation.shell, true);
  assert.deepEqual(invocation.args, ["build", "--target", "x86_64-pc-windows-msvc"]);
  assert.equal("CI" in invocation.childEnv, false);
  assert.equal("TAURI_BUILD_DRY_RUN" in invocation.childEnv, false);
  assert.equal("TAURI_BUILD_PLATFORM" in invocation.childEnv, false);
});

test("non-Windows invocation uses the unix binary", () => {
  const invocation = createInvocation(["--debug"], {
    CI: "1",
    TAURI_BUILD_PLATFORM: "linux"
  });

  assert.match(invocation.command, /node_modules[\\/]\.bin[\\/]tauri$/u);
  assert.equal(invocation.shell, false);
  assert.deepEqual(invocation.args, ["build", "--debug"]);
  assert.equal("CI" in invocation.childEnv, false);
});
