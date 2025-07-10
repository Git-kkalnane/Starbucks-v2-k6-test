// k6 결과 JSONL 파일을 시간 구간별로 분석하여 VU 수, 응답 코드별 개수, 에러율을 집계
// 사용법: node analyze-status-vu-error-per-interval.js [k6-result.jsonl] [interval_sec]

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const resultFile = process.argv[2] || "k6-order-menu-parallel-stress-result.json";
const intervalSec = parseInt(process.argv[3] || "60", 10); // 기본 60초
const resultPath = path.join(__dirname, resultFile);
const outCsv = path.join(__dirname, "time-status-vu-error-per-interval.csv");

if (!fs.existsSync(resultPath)) {
  console.error("결과 파일이 존재하지 않습니다:", resultPath);
  process.exit(1);
}

(async function () {
  const rl = readline.createInterface({
    input: fs.createReadStream(resultPath),
    crlfDelay: Infinity,
  });

  let t0 = null;
  const intervals = [];
  let cur = null;

  for await (const line of rl) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (obj.type !== 'Point' || !obj.data || !obj.data.time) continue;
    let t;
    if (typeof obj.data.time === 'number') {
      t = Math.floor(obj.data.time);
    } else if (typeof obj.data.time === 'string') {
      t = Math.floor(new Date(obj.data.time).getTime() / 1000);
    } else {
      continue;
    }
    if (t0 === null) t0 = t;
    const idx = Math.floor((t - t0) / intervalSec);
    while (intervals.length <= idx) {
      intervals.push({
        vus: [],
        status: {},
        total: 0,
        success: 0,
        fail: 0,
        code2xx: 0,
        code4xx: 0,
        code5xx: 0,
      });
    }
    const itv = intervals[idx];
    // VU 집계
    if (obj.data.tags && obj.data.tags.vu !== undefined && obj.data.tags.vu !== null) {
      let vu = obj.data.tags.vu;
      if (typeof vu === "string") vu = parseInt(vu, 10);
      if (!isNaN(vu)) itv.vus.push(vu);
    }
    // 응답 코드 집계
    if (obj.data.tags && obj.data.tags.status) {
      const code = obj.data.tags.status;
      itv.status[code] = (itv.status[code] || 0) + 1;
      itv.total++;
      if (code.startsWith("2")) itv.code2xx++;
      else if (code.startsWith("4")) itv.code4xx++;
      else if (code.startsWith("5")) itv.code5xx++;
      if (code === "200" || code === "201") itv.success++;
      else itv.fail++;
    }
  }

  // CSV 출력
  const header = [
    "interval_start","interval_end","avg_vus","total_reqs","success_reqs","fail_reqs","success_rate","fail_rate","2xx","4xx","5xx"
  ];
  const rows = [header.join(",")];
  for (let i = 0; i < intervals.length; ++i) {
    const itv = intervals[i];
    const start = new Date((t0 + i * intervalSec) * 1000).toISOString().slice(11,19);
    const end = new Date((t0 + (i+1) * intervalSec) * 1000).toISOString().slice(11,19);
    const vus = itv.vus.length ? (itv.vus.reduce((a,b)=>a+b,0)/itv.vus.length).toFixed(2) : 0;
    const total = itv.total;
    const succ = itv.success;
    const fail = itv.fail;
    const succRate = total ? (succ/total*100).toFixed(2) : 0;
    const failRate = total ? (fail/total*100).toFixed(2) : 0;
    rows.push([
      start,
      end,
      vus,
      total,
      succ,
      fail,
      succRate,
      failRate,
      itv.code2xx,
      itv.code4xx,
      itv.code5xx
    ].join(","));
  }
  fs.writeFileSync(outCsv, rows.join("\n"));
  console.log("CSV 저장 완료:", outCsv);
})();
