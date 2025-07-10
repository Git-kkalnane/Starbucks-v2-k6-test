// postprocess-item-single-api.js
// 단일 API k6 결과(.json)들을 취합해 .md, .csv로 요약 리포트 생성
const fs = require('fs');
const path = require('path');

const scripts = [
  { name: 'drinks list', file: 'k6-items-drinks-list-single.json' },
  { name: 'drink 101', file: 'k6-items-drink-101-single.json' },
  { name: 'drink 104', file: 'k6-items-drink-104-single.json' },
  { name: 'desserts list', file: 'k6-items-desserts-list-single.json' },
  { name: 'dessert 202', file: 'k6-items-dessert-202-single.json' },
];

const reportDir = path.join(__dirname, 'report');
if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);
const mdPath = path.join(reportDir, 'item-single-api-summary.md');
const csvPath = path.join(reportDir, 'item-single-api-summary.csv');

const apiUrls = [
  'http://localhost:8080/api/v1/items/drinks?page=0',
  'http://localhost:8080/api/v1/items/drinks/101',
  'http://localhost:8080/api/v1/items/drinks/104',
  'http://localhost:8080/api/v1/items/desserts',
  'http://localhost:8080/api/v1/items/desserts/202',
];

let summaryRows = [['API URL', '요청수', '평균응답(ms)', '최대(ms)', '최소(ms)', '실패수', '성공률(%)']];
let md = `# 단일 Item API 부하테스트 결과 요약\n\n`;
let csvRows = [['API', '요청수', '평균응답(ms)', '최대(ms)', '최소(ms)', '실패수', '성공률(%)']];

scripts.forEach(({ name, file }, idx) => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    md += `## ${name}\n결과 파일 없음: ${file}\n\n`;
    return;
  }
  // k6 .json output is line-delimited JSON
  const lines = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
  let durations = [], fail = 0;
  lines.forEach(line => {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'Point' && obj.metric === 'http_req_duration') durations.push(obj.data.value);
      if (obj.type === 'Point' && obj.metric === 'http_req_failed') fail += obj.data.value;
    } catch {}
  });
  const reqs = durations.length;
  const avg = reqs ? durations.reduce((a, b) => a + b, 0) / reqs : 0;
  const max = reqs ? Math.max(...durations) : 0;
  const min = reqs ? Math.min(...durations) : 0;
  const success = reqs ? (((reqs - fail) / reqs) * 100).toFixed(2) : 0;

  // csv는 계속 누적하지만, md에는 per-API summary block을 출력하지 않음

  csvRows.push([name, reqs, avg.toFixed(2), max.toFixed(2), min.toFixed(2), fail, success]);
  summaryRows.push([
    apiUrls[idx], reqs, avg.toFixed(2), max.toFixed(2), min.toFixed(2), fail, success
  ]);

  // 시간대별 병목 구간 분석
  // minute별로 duration을 그룹화
  const linesForBuckets = fs.readFileSync(filePath, 'utf-8').split(/\r?\n/).filter(Boolean);
  const buckets = {};
  linesForBuckets.forEach(line => {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'Point' && obj.metric === 'http_req_duration') {
        const t = new Date(obj.data.time);
        const min = t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0');
        if (!buckets[min]) buckets[min] = [];
        buckets[min].push(obj.data.value);
      }
    } catch {}
  });
  md += `\n### [${name} 시간대별 병목 구간 분석]\n`;
  md += `| 시작 | 평균(ms) | 최대(ms) | 최소(ms) | 요청수 |\n|------|----------|----------|----------|-------|\n`;
  Object.entries(buckets).sort().forEach(([min, arr]) => {
    const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
    const max = Math.max(...arr);
    const minv = Math.min(...arr);
    md += `| ${min} | ${avg.toFixed(2)} | ${max.toFixed(2)} | ${minv.toFixed(2)} | ${arr.length} |\n`;
  });
  md += '\n';
});

// Add summary table at the top
let summaryMd = '| API URL | 요청수 | 평균 응답시간(ms) | 최대(ms) | 최소(ms) | 실패수 | 성공률(%) |\n| --- | --- | --- | --- | --- | --- | --- |\n';
summaryRows.slice(1).forEach(row => {
  summaryMd += `| ${row[0]} | ${row[1]} | ${row[2]} | ${row[3]} | ${row[4]} | ${row[5]} | ${row[6]} |\n`;
});
md = `# 단일 Item API 부하테스트 결과 요약\n\n${summaryMd}\n` + md.split('\n').slice(2).join('\n');

fs.writeFileSync(mdPath, md);
fs.writeFileSync(csvPath, csvRows.map(r=>r.join(",")).join("\n"));

console.log(`\n리포트 생성 완료: ${mdPath}\n${csvPath}`);
