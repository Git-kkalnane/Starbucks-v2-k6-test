// postprocess-k6-stores-all-apis-stress.js
// K6 JSON 결과를 읽어 PR-k6-stores-all-apis-stress.md 마크다운 리포트로 변환

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const INPUT_JSON = path.join(__dirname, "k6-stores-all-apis-stress.json");
const OUTPUT_MD = path.join(__dirname, "./report/k6-stores-all-apis-stress.md");

// 통계 변수 선언
const apiStats = {};
const bucketSizeSec = 60;
const timeBuckets = {};
const apiTimeBuckets = {}; // 각 API별 시간대별 병목 분석용

function timeFormat(date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function addToBucket(bucketObj, key, duration, timestamp) {
  if (!bucketObj[key]) bucketObj[key] = [];
  bucketObj[key].push({ duration, timestamp });
}

async function processFile() {
  const rl = readline.createInterface({
    input: fs.createReadStream(INPUT_JSON),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (e) {
      continue;
    }
    if (obj.type !== "Point" || !obj.metric) continue;
    // API별 응답시간, 상태코드, 실패율 집계
    if (
      obj.metric === "http_req_duration" &&
      obj.data.tags &&
      obj.data.tags.url
    ) {
      const url = obj.data.tags.url;
      if (!apiStats[url]) {
        apiStats[url] = {
          count: 0,
          sum: 0,
          codes: {},
          failCount: 0,
          durations: [],
        };
      }
      apiStats[url].count++;
      apiStats[url].sum += obj.data.value;
      apiStats[url].durations.push(obj.data.value);
      // 시간대별 병목 분석용
      const time = obj.data.time ? new Date(obj.data.time) : null;
      if (time) {
        const bucketKey = Math.floor(time.getTime() / 1000 / bucketSizeSec);
        addToBucket(timeBuckets, bucketKey, obj.data.value, time);
        // 각 API별 시간대별 집계
        if (!apiTimeBuckets[url]) apiTimeBuckets[url] = {};
        addToBucket(apiTimeBuckets[url], bucketKey, obj.data.value, time);
      }
    }
    // 상태코드 카운트
    if (
      obj.metric === "http_req_duration" &&
      obj.data.tags &&
      obj.data.tags.url &&
      obj.data.tags.status
    ) {
      const url = obj.data.tags.url;
      apiStats[url].codes[obj.data.tags.status] =
        (apiStats[url].codes[obj.data.tags.status] || 0) + 1;
    }
    // 실패 카운트
    if (
      obj.metric === "http_req_failed" &&
      obj.data.tags &&
      obj.data.tags.url
    ) {
      const url = obj.data.tags.url;
      if (obj.data.value > 0) apiStats[url].failCount++;
    }
  }

  // Markdown 파일 생성
  let md = `# k6 Stores Parallel API Load Test Report\n\n`;
  Object.keys(apiStats).forEach((url) => {
    const stat = apiStats[url];
    const avg = stat.sum / stat.count;
    const total = stat.count;
    const fails = stat.failCount;
    const failRate = total > 0 ? (fails / total) * 100 : 0;
    // 가장 많이 발생한 상태코드
    let mainStatus =
      Object.entries(stat.codes).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    md += `| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |\n`;
    md += `|---------|--------|-------------------|--------|----------|\n`;
    md += `| ${url} | ${total} | ${avg.toFixed(2)} | ${failRate.toFixed(
      1
    )}% | ${mainStatus} |\n\n`;
  });

  md += `\n## HTTP 단계별 시간 (평균, ms)\n`;
  // (추가 구현 가능)

  // 시간대별 병목 구간 분석
  md += `\n## [시간대별 병목 구간 분석]\n`;
  md += `| 시작 | 평균(ms) | 최대(ms) | 최소(ms) | 요청수 |\n`;
  md += `|------|----------|----------|----------|-------|\n`;
  Object.keys(timeBuckets)
    .sort()
    .forEach((bucketKey) => {
      const arr = timeBuckets[bucketKey];
      const avg = arr.reduce((a, b) => a + b.duration, 0) / arr.length;
      // Use reduce to avoid stack overflow with large arrays
      const max = arr.reduce(
        (acc, x) => (acc > x.duration ? acc : x.duration),
        -Infinity
      );
      const min = arr.reduce(
        (acc, x) => (acc < x.duration ? acc : x.duration),
        Infinity
      );
      const count = arr.length;
      const startTime = timeFormat(arr[0].timestamp);
      md += `| ${startTime} | ${avg.toFixed(2)} | ${max.toFixed(
        2
      )} | ${min.toFixed(2)} | ${count} |\n`;
    });

  // 각 API별 시간대별 병목 구간 분석 추가
  Object.keys(apiTimeBuckets).forEach((url) => {
    md += `\n### [${url} 시간대별 병목 구간 분석]\n`;
    md += `| 시작 | 평균(ms) | 최대(ms) | 최소(ms) | 요청수 |\n`;
    md += `|------|----------|----------|----------|-------|\n`;
    Object.keys(apiTimeBuckets[url])
      .sort()
      .forEach((bucketKey) => {
        const arr = apiTimeBuckets[url][bucketKey];
        const avg = arr.reduce((a, b) => a + b.duration, 0) / arr.length;
        const max = arr.reduce(
          (acc, x) => (acc > x.duration ? acc : x.duration),
          -Infinity
        );
        const min = arr.reduce(
          (acc, x) => (acc < x.duration ? acc : x.duration),
          Infinity
        );
        const count = arr.length;
        const startTime = timeFormat(arr[0].timestamp);
        md += `| ${startTime} | ${avg.toFixed(2)} | ${max.toFixed(
          2
        )} | ${min.toFixed(2)} | ${count} |\n`;
      });
  });

  fs.mkdirSync(path.dirname(OUTPUT_MD), { recursive: true });
  fs.writeFileSync(OUTPUT_MD, md, "utf-8");
  console.log(`Markdown report generated: ${OUTPUT_MD}`);
}

processFile();
