// waiting 단계의 평균(ms)이 언제부터 급격히 증가(예: 100ms→500ms)하는가 분석
// k6-order-menu-parallel-stress-result.json을 대상으로, 호출순서/구간별로 waiting(ms) 평균을 계산하여, 급격한 증가 지점을 탐지

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const resultFile = process.argv[2] || "k6-order-menu-parallel-stress-result.json";
const resultPath = path.join(__dirname, resultFile);
const BATCH_SIZE = 10000; // 몇 회 단위로 평균을 볼지 (조절 가능)
const TARGET_URL = process.argv[3] || null; // 특정 url만 보고 싶으면 인자로 전달

if (!fs.existsSync(resultPath)) {
  console.error("결과 파일이 존재하지 않습니다:", resultPath);
  process.exit(1);
}

async function analyzeWaitingTrend() {
  const rl = readline.createInterface({
    input: fs.createReadStream(resultPath),
    crlfDelay: Infinity
  });

  // { url: [waiting1, waiting2, ...] }
  const waitingByUrl = {};

  for await (const line of rl) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (
      obj.metric === "http_req_waiting" &&
      obj.data.tags && obj.data.tags.url
    ) {
      const url = obj.data.tags.url;
      if (TARGET_URL && url !== TARGET_URL) continue;
      waitingByUrl[url] = waitingByUrl[url] || [];
      waitingByUrl[url].push(obj.data.value);
    }
  }

  // 분석 및 출력
  Object.entries(waitingByUrl).forEach(([url, arr]) => {
    console.log(`\n==== ${url} waiting(ms) batch 평균 ====`);
    let prevAvg = null;
    let jumpDetected = false;
    for (let i = 0; i < arr.length; i += BATCH_SIZE) {
      const batch = arr.slice(i, i + BATCH_SIZE);
      const avg = batch.reduce((a, b) => a + b, 0) / batch.length;
      console.log(`호출 ${i + 1} ~ ${i + batch.length}: 평균 ${avg.toFixed(2)}ms`);
      // 급격한 증가 감지 (예: 이전 평균보다 2배 이상 증가, 또는 100ms→500ms 이상 점프)
      if (
        prevAvg !== null &&
        ((prevAvg < 200 && avg - prevAvg > 200) || avg > prevAvg * 2)
      ) {
        console.log(`>> 급격한 증가 감지! 이전 평균 ${prevAvg.toFixed(2)}ms → ${avg.toFixed(2)}ms (구간: ${i + 1}~${i + batch.length})`);
        jumpDetected = true;
      }
      prevAvg = avg;
    }
    if (!jumpDetected) {
      console.log("급격한 증가 구간 없음");
    }
  });
}

analyzeWaitingTrend();
