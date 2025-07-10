// Node.js script to run all 5 single-API k6 tests with shared iteration/time parameters
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
let vus = 10;
let duration = "1m";

args.forEach((arg, i) => {
  if ((arg === "--vus" || arg === "-v") && args[i + 1]) {
    vus = args[i + 1];
  }
  if ((arg === "--duration" || arg === "-d") && args[i + 1]) {
    duration = args[i + 1];
  }
});

const baseDir = __dirname;
const scripts = [
  "k6-items-drinks-list-single.js",
  "k6-items-drink-101-single.js",
  "k6-items-drink-104-single.js",
  "k6-items-desserts-list-single.js",
  "k6-items-dessert-202-single.js",
];

async function runScript(script) {
  // .js -> .json 파일명 변환
  const jsonName = script.replace(/\.js$/, ".json");
  return new Promise((resolve) => {
    const proc = spawn(
      "k6",
      [
        "run",
        path.join(baseDir, script),
        "--env",
        `VUS=${vus}`,
        "--env",
        `DURATION=${duration}`,
        "--out",
        `json=${path.join(baseDir, jsonName)}`,
      ],
      { stdio: "inherit" }
    );
    proc.on("close", (code) => {
      resolve(code);
    });
  });
}

(async () => {
  // Run all scripts in parallel
  console.log("\n===== Running all 5 single-API k6 tests in parallel =====\n");
  await Promise.all(
    scripts.map((script) => {
      console.log(`--> [START] ${script}`);
      return runScript(script).then((code) => {
        console.log(`--> [END] ${script} (exit code: ${code})`);
      });
    })
  );
  console.log("\n===== All parallel k6 tests finished =====\n");
})();
