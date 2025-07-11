// postprocess-store-single-api.js
// 단일 Store API k6 결과(.json)들을 취합해 .md, .csv로 요약 리포트 생성
const fs = require('fs');
const path = require('path');

const scripts = [
  { name: 'stores list', file: 'k6-stores-list-single.json' },
  { name: 'store detail', file: 'k6-stores-detail.json' },
  { name: 'store not found', file: 'k6-stores-faill-detail.json' },
];

const reportDir = path.join(__dirname, 'report');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
const mdPath = path.join(reportDir, 'store-single-api-summary.md');
const csvPath = path.join(reportDir, 'store-single-api-summary.csv');

const apiUrls = [
  'http://localhost:8080/api/v1/stores',
  'http://localhost:8080/api/v1/stores/1',
  'http://localhost:8080/api/v1/stores/999',
];

let md = `# 단일 Store API 부하테스트 결과 요약\n\n`;
md += `| API URL | 요청수 | 평균 응답시간(ms) | 최대(ms) | 최소(ms) | 실패수 | 성공률(%) |\n`;
md += `| --- | --- | --- | --- | --- | --- | --- |\n`;
let csvRows = [['API', '요청수', '평균응답(ms)', '최대(ms)', '최소(ms)', '실패수', '성공률(%)']];

// For per-API time-bucketed stats
const bucketSizeSec = 60;
const apiBuckets = [ {}, {}, {} ]; // One per API

scripts.forEach(({ name, file }, idx) => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(Boolean);
  let count = 0, sum = 0, max = -Infinity, min = Infinity, fail = 0;
  lines.forEach(line => {
    let obj;
    try { obj = JSON.parse(line); } catch { return; }
    if (obj.type !== 'Point' || obj.metric !== 'http_req_duration') return;
    // Only aggregate for correct API URL
    if (!obj.data.tags) return;
    // stores list: exact match
    if (idx === 0 && obj.data.tags.url !== apiUrls[0]) return;
    // store detail: match /stores/<number>
    if (idx === 1 && !/^http:\/\/localhost:8080\/api\/v1\/stores\/\d+$/.test(obj.data.tags.url)) return;
    // store not found: exact match
    if (idx === 2 && obj.data.tags.url !== apiUrls[2]) return;
    count++;
    sum += obj.data.value;
    if (obj.data.value > max) max = obj.data.value;
    if (obj.data.value < min) min = obj.data.value;
    // Per-minute bucket
    if (obj.time) {
      const d = new Date(obj.time);
      const bucketKey = Math.floor(d.getTime() / 1000 / bucketSizeSec);
      if (!apiBuckets[idx][bucketKey]) apiBuckets[idx][bucketKey] = [];
      apiBuckets[idx][bucketKey].push({ duration: obj.data.value, timestamp: d });
    }
  });
  // 실패 카운트
  lines.forEach(line => {
    let obj;
    try { obj = JSON.parse(line); } catch { return; }
    if (obj.type !== 'Point' || obj.metric !== 'http_req_failed') return;
    if (obj.data.value > 0) fail++;
  });
  const avg = count ? sum / count : 0;
  const successRate = count ? ((count - fail) / count) * 100 : 0;
  md += `| ${apiUrls[idx]} | ${count} | ${avg.toFixed(2)} | ${max === -Infinity ? '-' : max.toFixed(2)} | ${min === Infinity ? '-' : min.toFixed(2)} | ${fail} | ${successRate.toFixed(2)} |\n`;
  csvRows.push([
    name,
    count,
    avg.toFixed(2),
    max === -Infinity ? '-' : max.toFixed(2),
    min === Infinity ? '-' : min.toFixed(2),
    fail,
    successRate.toFixed(2),
  ]);
});

// Per-API time-bucketed bottleneck analysis
const labelNames = [ 'stores list', 'store detail', 'store not found' ];
function timeFormat(date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}
apiBuckets.forEach((buckets, idx) => {
  md += `\n\n### [${labelNames[idx]} 시간대별 병목 구간 분석]\n`;
  md += `| 시작 | 평균(ms) | 최대(ms) | 최소(ms) | 요청수 |\n`;
  md += `|------|----------|----------|----------|-------|\n`;
  Object.keys(buckets).sort().forEach(bucketKey => {
    const arr = buckets[bucketKey];
    if (!arr || arr.length === 0) return;
    const avg = arr.reduce((a, b) => a + b.duration, 0) / arr.length;
    const max = arr.reduce((acc, x) => acc > x.duration ? acc : x.duration, -Infinity);
    const min = arr.reduce((acc, x) => acc < x.duration ? acc : x.duration, Infinity);
    const count = arr.length;
    const startTime = timeFormat(arr[0].timestamp);
    md += `| ${startTime} | ${avg.toFixed(2)} | ${max.toFixed(2)} | ${min.toFixed(2)} | ${count} |\n`;
  });
});

// Write Markdown
fs.writeFileSync(mdPath, md, 'utf-8');
// Write CSV
fs.writeFileSync(csvPath, csvRows.map(r => r.join(',')).join('\n'), 'utf-8');
console.log(`Store 단일 API 요약 리포트 생성 완료: ${mdPath}, ${csvPath}`);
