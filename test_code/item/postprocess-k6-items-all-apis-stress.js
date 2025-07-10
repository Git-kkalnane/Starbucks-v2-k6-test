const fs = require("fs");
const path = require("path");
const readline = require("readline");

// 입력 파일명과 출력 파일명
const resultPath =
  process.argv[2] || "./test_code/item/k6-items-all-apis-stress.json";

async function processFile() {
  // 통계 변수 선언
  const apiStats = {};
  const stepStats = {};
  let iterations = 0;
  let vusSum = 0,
    vusCount = 0,
    vusMax = 0;
  let sumIterationDuration = 0;
  const errors = [];
  const statusCounts = {};
  const durations = [];
  const csvRows = [["url", "status", "duration", "failed"]];

  // 시간대별 병목 분석용
  const bucketSizeSec = 60;
  const timeBuckets = {};
  // 개별 API별 시간대별 집계
  const apiTimeBuckets = {};
  const timeFormat = (date) =>
    `${date.getHours().toString().padStart(2, "0")}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  const parseTime = (t) => {
    if (!t) return null;
    try {
      return new Date(t);
    } catch {
      return null;
    }
  };

  const rl = readline.createInterface({
    input: fs.createReadStream(resultPath),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    // API별 요청수/코드/응답시간
    if (
      obj.metric === "http_req_duration" &&
      obj.data.tags &&
      obj.data.tags.url
    ) {
      const url = obj.data.tags.url;
      apiStats[url] = apiStats[url] || {
        count: 0,
        sumDuration: 0,
        codes: {},
        failCount: 0,
      };
      apiStats[url].count++;
      apiStats[url].sumDuration += obj.data.value;
      durations.push(obj.data.value);
      // 병목 분석용 시간대별 버킷 집계
      if (obj.data && obj.data.time) {
        const dt = parseTime(obj.data.time);
        if (dt) {
          const bucket = timeFormat(dt);
          // 전체 합계 버킷
          timeBuckets[bucket] = timeBuckets[bucket] || {
            count: 0,
            sum: 0,
            max: 0,
            min: Infinity,
            fail: 0,
            durations: [],
          };
          timeBuckets[bucket].count++;
          timeBuckets[bucket].sum += obj.data.value;
          timeBuckets[bucket].max = Math.max(
            timeBuckets[bucket].max,
            obj.data.value
          );
          timeBuckets[bucket].min = Math.min(
            timeBuckets[bucket].min,
            obj.data.value
          );
          timeBuckets[bucket].durations.push(obj.data.value);

          // 개별 API별 버킷
          apiTimeBuckets[url] = apiTimeBuckets[url] || {};
          apiTimeBuckets[url][bucket] = apiTimeBuckets[url][bucket] || {
            count: 0,
            sum: 0,
            max: 0,
            min: Infinity,
            durations: [],
          };
          apiTimeBuckets[url][bucket].count++;
          apiTimeBuckets[url][bucket].sum += obj.data.value;
          apiTimeBuckets[url][bucket].max = Math.max(
            apiTimeBuckets[url][bucket].max,
            obj.data.value
          );
          apiTimeBuckets[url][bucket].min = Math.min(
            apiTimeBuckets[url][bucket].min,
            obj.data.value
          );
          apiTimeBuckets[url][bucket].durations.push(obj.data.value);
        }
      }
      // CSV
      csvRows.push([
        url,
        obj.data.tags.status || "",
        obj.data.value,
        obj.data.tags.failed || 0,
      ]);
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

  // Markdown/CSV 파일명
  const baseName = path.basename(resultPath, ".json");
  const mdPath = path.join(path.dirname(resultPath), `report/${baseName}.md`);
  const csvPath = path.join(path.dirname(resultPath), `report/${baseName}.csv`);

  // Markdown 리포트 생성
  let md = `# k6 Items Parallel API Load Test Report\n\n`;
  Object.entries(apiStats).forEach(([url, stat]) => {
    const avg = stat.count ? (stat.sumDuration / stat.count).toFixed(2) : 0;
    const failRate = stat.count
      ? ((stat.failCount / stat.count) * 100).toFixed(1)
      : 0;
    const codes = Object.keys(stat.codes).join(", ");
    md += `| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |\n|---------|--------|-------------------|--------|----------|\n`;
    md += `| ${url} | ${stat.count} | ${avg} | ${failRate}% | ${codes} |\n\n`;
  });

  // 단계별 시간 (평균)
  md += `## HTTP 단계별 시간 (평균, ms)\n`;
  // 생략: 실제 단계별 시간 계산 필요(추후 확장)

  // 시간대별 병목 구간 분석
  md += `\n## [시간대별 병목 구간 분석]\n`;
  md += `| 시작 | 평균(ms) | 최대(ms) | 최소(ms) | 요청수 |\n|------|----------|----------|----------|-------|\n`;
  Object.entries(timeBuckets).forEach(([bucket, stat]) => {
    const avg = stat.count ? (stat.sum / stat.count).toFixed(2) : 0;
    md += `| ${bucket} | ${avg} | ${stat.max.toFixed(2)} | ${stat.min.toFixed(
      2
    )} | ${stat.count} |\n`;
  });

  fs.writeFileSync(csvPath, csvRows.map((r) => r.join(",")).join("\n"));

  // 단계별(시간대별) 요청수 표를 메인 리포트에 추가
  // 개별 API별 시간대별 병목 구간 분석만 출력
  Object.entries(apiTimeBuckets).forEach(([url, buckets]) => {
    md += `\n### [${url} 시간대별 병목 구간 분석]\n`;
    md += `| 시작 | 평균(ms) | 최대(ms) | 최소(ms) | 요청수 |\n|------|----------|----------|----------|-------|\n`;
    Object.entries(buckets).forEach(([bucket, stat]) => {
      const avg = stat.count ? (stat.sum / stat.count).toFixed(2) : 0;
      md += `| ${bucket} | ${avg} | ${stat.max.toFixed(2)} | ${stat.min.toFixed(
        2
      )} | ${stat.count} |\n`;
    });
  });
  fs.writeFileSync(mdPath, md);
}

processFile().catch(console.error);
