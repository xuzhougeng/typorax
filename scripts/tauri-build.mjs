import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");

export function resolvePlatform(env = process.env) {
  return env.TAURI_BUILD_PLATFORM || process.platform;
}

export function resolveTauriBinary(platform) {
  const binaryName = platform === "win32" ? "tauri.cmd" : "tauri";

  return path.join(repoRoot, "node_modules", ".bin", binaryName);
}

export function createChildEnv(env = process.env) {
  const childEnv = { ...env };
  delete childEnv.CI;
  delete childEnv.TAURI_BUILD_DRY_RUN;
  delete childEnv.TAURI_BUILD_PLATFORM;
  return childEnv;
}

export function createInvocation(argv = process.argv.slice(2), env = process.env) {
  const platform = resolvePlatform(env);

  return {
    command: resolveTauriBinary(platform),
    args: ["build", ...argv],
    shell: platform === "win32",
    childEnv: createChildEnv(env)
  };
}

export function main() {
  const invocation = createInvocation();

  if (process.env.TAURI_BUILD_DRY_RUN === "1") {
    console.log(
      JSON.stringify({
        command: invocation.command,
        args: invocation.args,
        shell: invocation.shell,
        childHasCI: Object.prototype.hasOwnProperty.call(invocation.childEnv, "CI")
      })
    );
    return;
  }

  const result = spawnSync(invocation.command, invocation.args, {
    cwd: repoRoot,
    env: invocation.childEnv,
    shell: invocation.shell,
    stdio: "inherit"
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      console.error(
        `Unable to find the local Tauri CLI at ${invocation.command}. Run npm install first.`
      );
    }

    throw result.error;
  }

  process.exit(result.status ?? 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}
