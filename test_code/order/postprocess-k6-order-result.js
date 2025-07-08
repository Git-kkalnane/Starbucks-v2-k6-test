// postprocess-k6-order-result.js
// k6 결과(JSONL) 파일을 분석해 주문 API의 status code별 통계 및 응답시간 요약 리포트 출력
// 사용법: node postprocess-k6-order-result.js k6-order-post-result.json

const fs = require("fs");
const path = require("path");

const resultFile = process.argv[2] || "k6-order-post-result.json";
const resultPath = path.join(__dirname, resultFile);

if (!fs.existsSync(resultPath)) {
  console.error("결과 파일이 존재하지 않습니다:", resultPath);
  process.exit(1);
}

// 입력 파일 경로는 사용자가 입력한 상대경로 그대로 사용
const raw = fs.readFileSync(resultPath, "utf-8").split("\n").filter(Boolean);

const statusCounts = {};
const durations = [];
const errors = [];
const csvRows = [["email", "status", "duration", "errorMessage"]];

for (const line of raw) {
  let obj;
  try {
    obj = JSON.parse(line);
  } catch {
    continue;
  }
  // 주문 요청 결과
  if (
    obj.metric === "http_reqs" &&
    obj.data.tags &&
    obj.data.tags.url &&
    obj.data.tags.url.includes("/orders")
  ) {
    const status = obj.data.tags.status;
    statusCounts[status] = (statusCounts[status] || 0) + 1;
    // 실패/에러 상세 수집
    if (status !== "201" && status !== "200") {
      errors.push({
        status,
        url: obj.data.tags.url,
        method: obj.data.tags.method,
        time: obj.data.time,
        errorMessage: obj.data.tags.error || "",
      });
    }
    // CSV용 row 추가 (email은 tags에 없을 수도 있음)
    csvRows.push([
      obj.data.tags.email || "",
      status,
      "", // duration은 아래에서 채움
      obj.data.tags.error || "",
    ]);
  }
  // 응답시간
  if (
    obj.metric === "http_req_duration" &&
    obj.data.tags &&
    obj.data.tags.url &&
    obj.data.tags.url.includes("/orders")
  ) {
    durations.push(obj.data.value);
    // CSV duration 채우기 (마지막 row 기준, 단순 매칭)
    if (csvRows.length > 1) {
      csvRows[csvRows.length - 1][2] = obj.data.value;
    }
  }
}

function avg(arr) {
  return arr.length
    ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2)
    : 0;
}
function max(arr) {
  return arr.length ? Math.max(...arr).toFixed(2) : 0;
}
function min(arr) {
  return arr.length ? Math.min(...arr).toFixed(2) : 0;
}

console.log("--- K6 주문 API 부하테스트 결과 요약 ---");
console.log("Status code별 통계:");
Object.entries(statusCounts).forEach(([status, count]) => {
  console.log(`  status ${status}: ${count}건`);
});
console.log(
  `응답시간(ms): 평균 ${avg(durations)}, 최소 ${min(durations)}, 최대 ${max(
    durations
  )}`
);

// 결과 저장 디렉토리 설정
const reportsDir = path.join(__dirname, "reports");
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// CSV 파일 저장
const csvPath = path.join(reportsDir, "k6-order-post-result.csv");
fs.writeFileSync(
  csvPath,
  csvRows
    .map((row) =>
      row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n")
);
console.log(`CSV 저장 완료: ${csvPath}`);

// --- API별 통계/단계별 시간/Iteration 정보 집계 ---
const apiStats = {}; // url별 { count, sumDuration, codes, failCount }
const stepStats = {}; // { url: { step: [duration, ...] } }
let vusArr = [];
let vusMax = 0;
let vusSum = 0;
let vusCount = 0;
let iterations = 0;
let sumIterationDuration = 0;

for (const line of raw) {
  let obj;
  try { obj = JSON.parse(line); } catch { continue; }
  // API별 요청수/코드/응답시간
  if (obj.metric === "http_req_duration" && obj.data.tags && obj.data.tags.url) {
    const url = obj.data.tags.url;
    apiStats[url] = apiStats[url] || { count: 0, sumDuration: 0, codes: {}, failCount: 0 };
    apiStats[url].count++;
    apiStats[url].sumDuration += obj.data.value;
  }
  if (obj.metric === "http_reqs" && obj.data.tags && obj.data.tags.url) {
    const url = obj.data.tags.url;
    const code = obj.data.tags.status;
    apiStats[url] = apiStats[url] || { count: 0, sumDuration: 0, codes: {}, failCount: 0 };
    apiStats[url].codes[code] = (apiStats[url].codes[code] || 0) + 1;
    if (code !== "200" && code !== "201") apiStats[url].failCount++;
  }
  // 단계별 시간
  if (obj.metric && obj.metric.startsWith("http_req_") && obj.metric !== "http_req_duration" && obj.data.tags && obj.data.tags.url) {
    const url = obj.data.tags.url;
    stepStats[url] = stepStats[url] || {};
    stepStats[url][obj.metric] = stepStats[url][obj.metric] || [];
    stepStats[url][obj.metric].push(obj.data.value);
  }
  // VU/iteration
  if (obj.metric === "iterations") {
    iterations += obj.data.value;
  }
  if (obj.metric === "vus" && typeof obj.data.value === 'number') {
    vusArr.push(obj.data.value);
    vusSum += obj.data.value;
    vusCount++;
    vusMax = Math.max(vusMax, obj.data.value);
  }
  if (obj.metric === "iteration_duration") {
    sumIterationDuration += obj.data.value;
  }
}

// --- Markdown 리포트 생성 ---
const mdPath = path.join(reportsDir, "k6-order-post-result.md");
let md = `# k6 Load Test Report\n\n`;
md += `| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |\n|---------|--------|-------------------|--------|----------|\n`;
Object.entries(apiStats).forEach(([url, stat]) => {
  const avgDur = stat.count ? (stat.sumDuration / stat.count).toFixed(2) : '-';
  const failRate = stat.count ? ((stat.failCount / stat.count) * 100).toFixed(1) + '%' : '-';
  const codes = Object.keys(stat.codes).sort().join(', ');
  md += `| ${url} | ${stat.count} | ${avgDur} | ${failRate} | ${codes} |\n`;
});

// 단계별 평균시간
md += `\n## HTTP 단계별 시간 (평균, ms)\n| 단계 | 평균(ms) |\n|------|----------|\n`;
Object.entries(stepStats).forEach(([url, steps]) => {
  Object.entries(steps).forEach(([step, arr]) => {
    const avgStep = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(3) : '-';
    md += `| ${step.replace('http_req_','')} (${url}) | ${avgStep} |\n`;
  });
});

// VU/Iteration 정보
const vusAvg = vusCount ? (vusSum / vusCount).toFixed(2) : '-';
md += `\n## VU/Iteration 정보\n`;
md += `- 평균 VU (vus): ${vusAvg}\n`;
md += `- 최대 VU (vus_max): ${vusMax || '-'}\n`;
md += `- 총 Iteration 수: ${iterations}\n`;
md += `- 평균 Iteration Duration(ms): ${iterations ? (sumIterationDuration/iterations).toFixed(2) : '-'}\n`;

fs.writeFileSync(mdPath, md);
console.log(`Markdown 저장 완료: ${mdPath}`);

// 에러 상세 콘솔 출력
if (errors.length) {
  console.log(`\n상위 10개 에러 상세:`);
  errors.slice(0, 10).forEach((e, i) => {
    console.log(
      `#${i + 1} [${e.status}] ${e.method} ${e.url} time=${
        e.time
      }ms\n  error: ${e.errorMessage}`
    );
  });
  console.log(`총 에러/비정상 응답: ${errors.length}건`);
}
