// postprocess-k6.js
// k6 결과(JSON)를 읽어 CSV와 Markdown 리포트로 자동 변환
// 사용법: node postprocess-k6.js k6-loadtest-result.json

const fs = require('fs');

if (process.argv.length < 3) {
  console.error('Usage: node postprocess-k6.js <k6-result-json-file>');
  process.exit(1);
}

const jsonFile = process.argv[2];
const csvFile = jsonFile.replace(/\.json$/, '.csv');
const mdFile = jsonFile.replace(/\.json$/, '-report.md');

const lines = fs.readFileSync(jsonFile, 'utf-8').split('\n').filter(Boolean);

// CSV header
let csv = 'metric,value,url,status\n';
let rows = [];
let summary = {};
let stageStats = {};
let vuStats = { vus: 0, vus_max: 0, iterations: 0, iteration_duration: 0, vus_count: 0, vus_max_count: 0, iter_count: 0, iter_duration_count: 0 };

for (const line of lines) {
  let obj;
  try { obj = JSON.parse(line); } catch { continue; }
  if (obj.type === 'Point' && obj.metric && obj.data && obj.data.tags) {
    const { metric } = obj;
    const value = obj.data.value;
    const url = obj.data.tags.url || '';
    const status = obj.data.tags.status || '';
    if (["http_req_duration","http_req_failed","http_reqs"].includes(metric)) {
      csv += `${metric},${value},${url},${status}\n`;
      // 요약용
      if (url) {
        summary[url] = summary[url] || {count:0, duration:0, failed:0, status:status};
        if (metric==="http_reqs") summary[url].count += value;
        if (metric==="http_req_duration") summary[url].duration += value;
        if (metric==="http_req_failed") summary[url].failed += value;
      }
    }
    // 단계별 시간 수집
    if (["http_req_blocked","http_req_connecting","http_req_tls_handshaking","http_req_sending","http_req_waiting","http_req_receiving"].includes(metric)) {
      const key = metric + (url ? ` (${url})` : '');
      stageStats[key] = stageStats[key] || { total: 0, count: 0 };
      stageStats[key].total += value;
      stageStats[key].count += 1;
    }
    // VU/iteration 정보 수집
    if (metric === "vus") {
      vuStats.vus += value;
      vuStats.vus_count += 1;
    }
    if (metric === "vus_max") {
      vuStats.vus_max += value;
      vuStats.vus_max_count += 1;
    }
    if (metric === "iterations") {
      vuStats.iterations += value;
      vuStats.iter_count += 1;
    }
    if (metric === "iteration_duration") {
      vuStats.iteration_duration += value;
      vuStats.iter_duration_count += 1;
    }
  }
}

// Markdown Report
let md = `# k6 Load Test Report\n\n| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |\n|---------|--------|-------------------|--------|----------|\n`;
for (const url in summary) {
  const s = summary[url];
  const avg = s.count ? (s.duration/s.count).toFixed(2) : '-';
  const failRate = s.count ? ((s.failed/s.count)*100).toFixed(1)+'%' : '-';
  md += `| ${url} | ${s.count} | ${avg} | ${failRate} | ${s.status} |\n`;
}

// 단계별 시간 표 추가
md += `\n## HTTP 단계별 시간 (평균, ms)\n| 단계 | 평균(ms) |\n|------|----------|\n`;
for (const key in stageStats) {
  const avg = stageStats[key].count ? (stageStats[key].total / stageStats[key].count).toFixed(3) : '-';
  md += `| ${key} | ${avg} |\n`;
}

// VU/iteration 정보 추가
md += `\n## VU/Iteration 정보\n`;
md += `- 평균 VU (vus): ${(vuStats.vus_count ? (vuStats.vus / vuStats.vus_count).toFixed(2) : '-')}`;
md += `\n- 최대 VU (vus_max): ${(vuStats.vus_max_count ? (vuStats.vus_max / vuStats.vus_max_count).toFixed(2) : '-')}`;
md += `\n- 총 Iteration 수: ${vuStats.iterations}`;
md += `\n- 평균 Iteration Duration(ms): ${(vuStats.iter_duration_count ? (vuStats.iteration_duration / vuStats.iter_duration_count).toFixed(2) : '-')}`;

fs.writeFileSync(csvFile, csv, 'utf-8');
fs.writeFileSync(mdFile, md, 'utf-8');

console.log(`CSV, Markdown 리포트 생성 완료!\n- CSV: ${csvFile}\n- Markdown: ${mdFile}`);
