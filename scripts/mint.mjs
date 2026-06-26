import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptsDir, "..");
const mintlifyHome = path.join(projectRoot, ".tmp", "mintlify-home", `${Date.now()}-${process.pid}`);
const appData = path.join(mintlifyHome, "AppData", "Roaming");
const localAppData = path.join(mintlifyHome, "AppData", "Local");

mkdirSync(appData, { recursive: true });
mkdirSync(localAppData, { recursive: true });

const mintBin = require.resolve("mint/index.js");
const child = spawn(process.execPath, [mintBin, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    HOME: mintlifyHome,
    USERPROFILE: mintlifyHome,
    APPDATA: appData,
    LOCALAPPDATA: localAppData,
  },
});

child.on("close", (code) => {
  try {
    rmSync(mintlifyHome, { recursive: true, force: true });
  } catch {
    // Mintlify may briefly hold cache files on Windows; .tmp is ignored if cleanup cannot finish.
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
