// Node.js script to run all 3 single-API k6 store tests with shared iteration/time parameters
const { spawn } = require("child_process");
const path = require("path");

const args = process.argv.slice(2);
let vus = 10;
let duration = "1m";
let iterations = 10000;

args.forEach((arg, i) => {
  if ((arg === "--vus" || arg === "-v") && args[i + 1]) {
    vus = args[i + 1];
  }
  if ((arg === "--duration" || arg === "-d") && args[i + 1]) {
    duration = args[i + 1];
  }
  if ((arg === "--iterations" || arg === "-i") && args[i + 1]) {
    iterations = args[i + 1];
  }
});

const baseDir = __dirname;
const scripts = [
  "k6-stores-list-single.js",
  "k6-stores-detail.js",
  "k6-stores-faill-detail.js",
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
        "--vus",
        vus,
        "--duration",
        duration,
        "--iterations",
        iterations,
        "--out",
        `json=${path.join(baseDir, jsonName)}`,
      ],
      { stdio: "inherit" }
    );
    proc.on("exit", (code) => {
      resolve(code);
    });
  });
}

(async () => {
  // 병렬 실행
  await Promise.all(scripts.map(runScript));
})();
