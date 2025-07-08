// k6-order-menu-parallel-stress-result.json 결과를 분석하여 md/csv 리포트 생성
const fs = require("fs");
const path = require("path");

const resultFile = process.argv[2] || "k6-order-menu-parallel-stress-result.json";
const resultPath = path.join(__dirname, resultFile);

if (!fs.existsSync(resultPath)) {
  console.error("결과 파일이 존재하지 않습니다:", resultPath);
  process.exit(1);
}

// 대용량 k6 JSONL 파일을 스트림(line-by-line)으로 처리
const readline = require("readline");

const apiStats = {}; // url별 { count, sumDuration, codes, failCount }
const stepStats = {}; // { url: { step: [duration, ...] } }
let vusArr = [];
let vusMax = 0;
let vusSum = 0;
let vusCount = 0;
let iterations = 0;
let sumIterationDuration = 0;
const errors = [];
const statusCounts = {};
const durations = [];
const csvRows = [["url", "status", "duration", "failed"]];

async function processFile() {
  const rl = readline.createInterface({
    input: fs.createReadStream(resultPath),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    // API별 요청수/코드/응답시간
    if (obj.metric === "http_req_duration" && obj.data.tags && obj.data.tags.url) {
      const url = obj.data.tags.url;
      apiStats[url] = apiStats[url] || { count: 0, sumDuration: 0, codes: {}, failCount: 0 };
      apiStats[url].count++;
      apiStats[url].sumDuration += obj.data.value;
      durations.push(obj.data.value);
    }
    if (obj.metric === "http_reqs" && obj.data.tags && obj.data.tags.url) {
      const url = obj.data.tags.url;
      const code = obj.data.tags.status;
      apiStats[url] = apiStats[url] || { count: 0, sumDuration: 0, codes: {}, failCount: 0 };
      apiStats[url].codes[code] = (apiStats[url].codes[code] || 0) + 1;
      statusCounts[code] = (statusCounts[code] || 0) + 1;
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
    if (obj.metric === "vus" && typeof obj.data.value === "number") {
      vusArr.push(obj.data.value);
      vusSum += obj.data.value;
      vusCount++;
      vusMax = Math.max(vusMax, obj.data.value);
    }
    if (obj.metric === "iteration_duration") {
      sumIterationDuration += obj.data.value;
    }
    // 에러 상세
    if (obj.metric === "http_req_failed" && obj.data.value > 0 && obj.data.tags) {
      errors.push({
        url: obj.data.tags.url,
        status: obj.data.tags.status,
        time: obj.data.time,
        method: obj.data.tags.method,
        scenario: obj.data.tags.scenario,
      });
    }
    // CSV row
    if (obj.metric === "http_req_duration" && obj.data.tags && obj.data.tags.url) {
      csvRows.push([
        obj.data.tags.url,
        obj.data.tags.status || '',
        obj.data.value,
        obj.metric === "http_req_failed" ? 1 : 0
      ]);
    }
  }

  function avg(arr) { return arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0; }
  function max(arr) { return arr.length ? Math.max(...arr).toFixed(2) : 0; }
  function min(arr) { return arr.length ? Math.min(...arr).toFixed(2) : 0; }

  // 결과 저장 디렉토리 설정
  const reportsDir = path.join(__dirname, "reports");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // CSV 파일 저장
  const csvPath = path.join(reportsDir, "k6-order-menu-parallel-stress-result.csv");
  fs.writeFileSync(
    csvPath,
    csvRows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
  );

  // Markdown 리포트 생성
  let md = `# k6 주문+메뉴 병렬 스트레스테스트 Load Test Report\n`;

  Object.entries(apiStats).forEach(([url, stat]) => {
    md += `\n| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |\n`;
    md += `|---------|--------|-------------------|--------|----------|\n`;
    const codes = Object.keys(stat.codes).join(", ");
    md += `| ${url} | ${stat.count} | ${(stat.sumDuration/stat.count).toFixed(2)} | ${((stat.failCount/stat.count)*100).toFixed(1)}% | ${codes} |\n`;
  });

  // 단계별 시간
  md += `\n## HTTP 단계별 시간 (평균, ms)\n`;
  const bottlenecks = [];
  Object.entries(stepStats).forEach(([url, steps]) => {
    md += `| 단계 | 평균(ms) |\n`;
    md += `|------|----------|\n`;
    let maxStep = null, maxAvg = -1;
    Object.entries(steps).forEach(([step, vals]) => {
      const avgVal = parseFloat(avg(vals));
      md += `| ${step.replace("http_req_","")} (${url}) | ${avgVal} |\n`;
      if (avgVal > maxAvg) {
        maxAvg = avgVal;
        maxStep = step.replace("http_req_", "");
      }
    });
    if (maxStep) {
      bottlenecks.push({ url, step: maxStep, avg: maxAvg });
    }
  });

  // 병목 구간 분석 추가
  md += `\n### 병목 구간 분석 (Bottleneck Phase)\n`;
  if (bottlenecks.length === 0) {
    md += `- 병목 구간을 찾을 수 없습니다.\n`;
  } else {
    bottlenecks.forEach(({ url, step, avg }) => {
      // stepStats[url]["http_req_"+step] 에 저장된 배열의 길이가 호출 횟수
      const stepKey = Object.keys(stepStats[url]).find(k => k.replace("http_req_","") === step);
      const callCount = stepKey && stepStats[url][stepKey] ? stepStats[url][stepKey].length : 0;
      md += `- **${url}**: 가장 느린 단계는 '**${step}**' (평균 ${avg}ms, 호출 ${callCount}회) 입니다.\n`;
    });
    md += `\n> 병목 구간은 각 API별로 평균 시간이 가장 큰 단계(phase)입니다. 일반적으로 waiting 단계가 크면 서버/DB 처리 병목, blocked/connecting이 크면 네트워크 병목, sending/receiving이 크면 전송 병목을 의미합니다.\n`;
  }

  // VU/Iteration 정보
  const vusAvg = vusCount ? (vusSum / vusCount).toFixed(2) : '-';
  md += `\n## VU/Iteration 정보\n`;
  md += `- 평균 VU (vus): ${vusAvg}\n`;
  md += `- 최대 VU (vus_max): ${vusMax || '-'}\n`;
  md += `- 총 Iteration 수: ${iterations}\n`;
  md += `- 평균 Iteration Duration(ms): ${iterations ? (sumIterationDuration/iterations).toFixed(2) : '-'}\n`;

  // 에러 상세
  if (errors.length > 0) {
    md += `\n## 에러 상세\n`;
    md += `| URL | Status | Method | Time | Scenario |\n`;
    md += `|-----|--------|--------|------|----------|\n`;
    errors.forEach(e => {
      md += `| ${e.url} | ${e.status} | ${e.method} | ${e.time} | ${e.scenario} |\n`;
    });
  }

  const mdPath = path.join(reportsDir, "k6-order-menu-parallel-stress-result.md");
  fs.writeFileSync(mdPath, md);

  console.log(`리포트 생성 완료!\n- Markdown: ${mdPath}\n- CSV: ${csvPath}`);
}

processFile();

