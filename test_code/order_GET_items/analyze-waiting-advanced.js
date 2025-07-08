// waiting 단계의 평균(ms)을 시간대별, VU별, 커스텀 기준 등으로 분석
// k6-order-menu-parallel-stress-result.json을 대상으로, 각 측정값의 타임스탬프(time), VU, 호출순서 등으로 그룹핑하여 평균 계산

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const resultFile = process.argv[2] || "k6-order-menu-parallel-stress-result.json";
const resultPath = path.join(__dirname, resultFile);
const BATCH_SIZE = 10000; // 호출순서 기준 구간 크기
const TIME_WINDOW = 60;   // 초 단위 시간 구간(1분)
const VU_WINDOW = 1;    // VU별 구간 크기
const TARGET_URL = process.argv[3] || null; // 특정 url만 분석할 경우

if (!fs.existsSync(resultPath)) {
  console.error("결과 파일이 존재하지 않습니다:", resultPath);
  process.exit(1);
}

async function analyzeWaitingAdvanced() {
  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  let md = `# Waiting 단계 고급 분석 리포트\n`;
  const batchCsv = fs.createWriteStream(path.join(reportsDir, "waiting-batch.csv"));
  const timeCsv = fs.createWriteStream(path.join(reportsDir, "waiting-time.csv"));
  const vuCsv = fs.createWriteStream(path.join(reportsDir, "waiting-vu.csv"));
  batchCsv.write("url,start_idx,end_idx,avg_ms,count\n");
  timeCsv.write("url,start_time,end_time,avg_ms,count\n");
  vuCsv.write("url,vu_start,vu_end,avg_ms,count\n");

  // rolling state per url
  const rolling = {};
  let idx = 0;
  let lineCount = 0;

  const rl = readline.createInterface({
    input: fs.createReadStream(resultPath),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    lineCount++;
    if (lineCount % 1_000_000 === 0) {
      console.log(`...${lineCount} lines processed`);
    }
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    if (
      obj.metric === "http_req_waiting" &&
      obj.data.tags && obj.data.tags.url &&
      obj.data.time
    ) {
      const url = obj.data.tags.url;
      if (TARGET_URL && url !== TARGET_URL) continue;
      if (!rolling[url]) {
        rolling[url] = {
          batch: {sum:0, count:0, start:idx+1},
          time: {sum:0, count:0, tStart:null, tEnd:null},
          vu: {},
          vuMin: null,
          vuMax: null,
          allVu: new Set(),
          arr: [], // only used for sorting time window later
          lastTime: null,
          vuSeen: false
        };
      }
      const r = rolling[url];
      // Batch (순서 기준)
      r.batch.sum += obj.data.value;
      r.batch.count++;
      if (!r.batch.start) r.batch.start = idx+1;
      // Time (epoch sec)
      const t = new Date(obj.data.time).getTime() / 1000;
      if (r.time.tStart === null) r.time.tStart = t;
      r.time.tEnd = t;
      r.time.sum += obj.data.value;
      r.time.count++;
      r.arr.push({time: t, waiting: obj.data.value}); // for time window flush later
      // VU (optional)
      let vu = obj.data.tags.vu;
      if (vu !== undefined) {
        vu = typeof vu === "number" ? vu : parseInt(vu, 10);
        if (!isNaN(vu)) {
          r.vuSeen = true;
          if (r.vuMin === null || vu < r.vuMin) r.vuMin = vu;
          if (r.vuMax === null || vu > r.vuMax) r.vuMax = vu;
          r.allVu.add(vu);
          const vuKey = Math.floor(vu / VU_WINDOW) * VU_WINDOW;
          if (!r.vu[vuKey]) r.vu[vuKey] = {sum:0, count:0};
          r.vu[vuKey].sum += obj.data.value;
          r.vu[vuKey].count++;
        }
      }
      // Batch flush
      if (r.batch.count === BATCH_SIZE) {
        const avg = r.batch.sum / r.batch.count;
        batchCsv.write(`${url},${r.batch.start},${r.batch.start+BATCH_SIZE-1},${avg.toFixed(2)},${r.batch.count}\n`);
        r.batch.sum = 0; r.batch.count = 0; r.batch.start = idx+2;
      }
      idx++;
    }
  }
  // flush remaining batch/time/vu for each url
  for (const url in rolling) {
    const r = rolling[url];
    // Batch flush
    if (r.batch.count > 0) {
      const avg = r.batch.sum / r.batch.count;
      batchCsv.write(`${url},${r.batch.start},${r.batch.start+r.batch.count-1},${avg.toFixed(2)},${r.batch.count}\n`);
    }
    // Time window flush
    r.arr.sort((a,b)=>a.time-b.time);
    let t0 = r.arr[0]?.time || 0;
    let tMax = r.arr[r.arr.length-1]?.time || t0;
    for (let t = t0; t <= tMax; t += TIME_WINDOW) {
      const batch = r.arr.filter(e => e.time >= t && e.time < t + TIME_WINDOW);
      if (batch.length === 0) continue;
      const avg = batch.reduce((a, b) => a + b.waiting, 0) / batch.length;
      const ts = new Date(t * 1000).toISOString().slice(11, 19);
      const te = new Date((t + TIME_WINDOW) * 1000).toISOString().slice(11, 19);
      timeCsv.write(`${url},${ts},${te},${avg.toFixed(2)},${batch.length}\n`);
    }
    // VU window flush (only if vuSeen)
    if (r.vuSeen && r.vuMin !== null && r.vuMax !== null) {
      for (let v = r.vuMin; v <= r.vuMax; v += VU_WINDOW) {
        const vuEntry = r.vu[v];
        if (vuEntry && vuEntry.count > 0) {
          const avg = vuEntry.sum / vuEntry.count;
          vuCsv.write(`${url},${v},${v+VU_WINDOW-1},${avg.toFixed(2)},${vuEntry.count}\n`);
        }
      }
    }
    // Markdown summary
    md += `\n\n## ${url} waiting(ms) 분석`;
    md += `\n### [호출순서별 평균]`;
    md += `\n| 호출 시작 | 호출 끝 | 평균(ms) | 개수 |`;
    md += `\n|------|------|----------|-----|`;
    md += `\n(자세한 데이터는 waiting-batch.csv 참고)`;
    md += `\n\n### [시간대별 평균]`;
    md += `\n| 시작 시각 | 끝 시각 | 평균(ms) | 개수 |`;
    md += `\n|------|------|----------|-----|`;
    for (let t = t0; t <= tMax; t += TIME_WINDOW) {
      const batch = r.arr.filter(e => e.time >= t && e.time < t + TIME_WINDOW);
      if (batch.length === 0) continue;
      const avg = batch.reduce((a, b) => a + b.waiting, 0) / batch.length;
      const ts = new Date(t * 1000).toISOString().slice(11, 19);
      const te = new Date((t + TIME_WINDOW) * 1000).toISOString().slice(11, 19);
      md += `\n| ${ts} | ${te} | ${avg.toFixed(2)} | ${batch.length} |`;
    }

  }
  batchCsv.end();
  timeCsv.end();
  vuCsv.end();
  // 기존 분석 리포트 저장
  fs.writeFileSync(path.join(reportsDir, "waiting-analysis.md"), md);

  // --- 구간별 VU/응답코드/성공률 요약 자동 추가 ---
  const intervalCsv = path.join(__dirname, "time-status-vu-error-per-interval.csv");
  if (fs.existsSync(intervalCsv)) {
    const lines = fs.readFileSync(intervalCsv, "utf-8").trim().split(/\r?\n/);
    if (lines.length > 1) {
      const headers = [
        "시작 시각", "끝 시각", "평균 VU", "요청수", "성공수", "실패수", "성공률(%)", "실패율(%)", "2xx", "4xx", "5xx"
      ];
      let mdTable = "\n\n### [구간별 VU/응답코드/성공률 요약]\n\n";
      mdTable += `| ${headers.join(" | ")} |\n`;
      mdTable += `|${headers.map(_=>"------").join("|")}|\n`;
      for (let i = 1; i < lines.length; ++i) {
        const cols = lines[i].split(",");
        mdTable += `| ${cols.join(" | ")} |\n`;
      }
      fs.appendFileSync(path.join(reportsDir, "waiting-analysis.md"), mdTable);
    }
  }
  let vuWarn = Object.values(rolling).every(r => !r.vuSeen);
  if (vuWarn) {
    console.warn("[경고] k6 결과에 vu 필드가 없어 VU별 분석이 생략되었습니다. k6 스크립트에서 tags: { vu: __VU } 옵션을 추가하면 VU별 분석이 가능합니다.");
  }
  console.log("분석 결과가 reports/ 디렉토리에 저장되었습니다.");
}

analyzeWaitingAdvanced();
