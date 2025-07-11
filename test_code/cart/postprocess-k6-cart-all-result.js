const fs = require("fs");
const path = require("path");
const readline = require("readline");

// 입력 파일명과 출력 파일명
const resultFile = process.argv[2] || "k6-cart-all-result.json";
const resultPath = path.join(__dirname, resultFile);

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
          const bucket = Math.floor(dt.getTime() / 1000 / bucketSizeSec);
          if (!timeBuckets[bucket]) timeBuckets[bucket] = [];
          timeBuckets[bucket].push({
            url: obj.data.tags.url,
            status: obj.data.tags.status,
            duration: obj.data.value,
            failed: 0,
            time: dt,
          });
        }
      }
    }
    if (obj.metric === "http_reqs" && obj.data.tags && obj.data.tags.url) {
      const url = obj.data.tags.url;
      const code = obj.data.tags.status;
      apiStats[url] = apiStats[url] || {
        count: 0,
        sumDuration: 0,
        codes: {},
        failCount: 0,
      };
      apiStats[url].codes[code] = (apiStats[url].codes[code] || 0) + 1;
      statusCounts[code] = (statusCounts[code] || 0) + 1;
      if (code !== "200" && code !== "201") apiStats[url].failCount++;
    }
    // 단계별 시간
    if (
      obj.metric &&
      obj.metric.startsWith("http_req_") &&
      obj.metric !== "http_req_duration" &&
      obj.data.tags &&
      obj.data.tags.url
    ) {
      const url = obj.data.tags.url;
      stepStats[url] = stepStats[url] || {};
      stepStats[url][obj.metric] = stepStats[url][obj.metric] || [];
      stepStats[url][obj.metric].push(obj.data.value);
    }
    if (obj.metric === "iterations") {
      iterations += obj.data.value;
    }
    if (obj.metric === "vus" && typeof obj.data.value === "number") {
      vusSum += obj.data.value;
      vusCount++;
      vusMax = Math.max(vusMax, obj.data.value);
    }
    if (obj.metric === "iteration_duration") {
      sumIterationDuration += obj.data.value;
    }
    // 에러 상세
    if (
      obj.metric === "http_req_failed" &&
      obj.data.value > 0 &&
      obj.data.tags
    ) {
      errors.push({
        url: obj.data.tags.url,
        status: obj.data.tags.status,
        time: obj.data.time,
        method: obj.data.tags.method,
        scenario: obj.data.tags.scenario,
      });
    }
    // CSV row
    if (
      obj.metric === "http_req_duration" &&
      obj.data.tags &&
      obj.data.tags.url
    ) {
      csvRows.push([
        obj.data.tags.url,
        obj.data.tags.status || "",
        obj.data.value,
        obj.metric === "http_req_failed" ? 1 : 0,
      ]);
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

  // === 시간대별 병목 구간 분석 ===
  let prevAvg = null;
  let bottleneckRows = [];
  Object.keys(timeBuckets)
    .sort((a, b) => a - b)
    .forEach((bucket) => {
      const rows = timeBuckets[bucket];
      if (!rows || !rows.length) return;
      const avgDur = rows.reduce((a, b) => a + b.duration, 0) / rows.length;
      const maxDur = Math.max(...rows.map((r) => r.duration));
      const minDur = Math.min(...rows.map((r) => r.duration));
      const count = rows.length;
      const failCount = rows.filter(
        (r) => r.status && r.status[0] !== "2"
      ).length;
      const failRate = (failCount / count) * 100;
      const sorted = rows.map((r) => r.duration).sort((a, b) => a - b);
      const p90 = sorted[Math.floor(0.9 * sorted.length)] || 0;
      const p95 = sorted[Math.floor(0.95 * sorted.length)] || 0;
      const p99 = sorted[Math.floor(0.99 * sorted.length)] || 0;
      const startTime = timeFormat(rows[0].time);
      const endTime = timeFormat(rows[rows.length - 1].time);
      let highlight = false;
      if (prevAvg && avgDur > prevAvg * 1.5 && avgDur > 500) highlight = true;
      prevAvg = avgDur;
      bottleneckRows.push({
        startTime,
        endTime,
        avgDur,
        maxDur,
        minDur,
        count,
        failRate,
        p90,
        p95,
        p99,
        highlight,
      });
    });

  const reportsDir = path.join(path.dirname(resultPath), "report");
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  // CSV 저장
  const csvPath = path.join(reportsDir, "k6-cart-all-result.csv");
  fs.writeFileSync(
    csvPath,
    csvRows
      .map((row) =>
        row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n")
  );

  // Markdown 리포트 생성
  let md = `# k6 Cart All API Load Test Report\n`;

  Object.entries(apiStats).forEach(([url, stat]) => {
    md += `\n| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |\n`;
    md += `|---------|--------|-------------------|--------|----------|\n`;
    const codes = Object.keys(stat.codes).join(", ");
    md += `| ${url} | ${stat.count} | ${(stat.sumDuration / stat.count).toFixed(
      2
    )} | ${((stat.failCount / stat.count) * 100).toFixed(1)}% | ${codes} |\n`;
  });

  // 단계별 시간
  md += `\n## HTTP 단계별 시간 (평균, ms)\n`;
  Object.entries(stepStats).forEach(([url, steps]) => {
    md += `| 단계 | 평균(ms) |\n`;
    md += `|------|----------|\n`;
    Object.entries(steps).forEach(([step, vals]) => {
      md += `| ${step.replace("http_req_", "")} (${url}) | ${avg(vals)} |\n`;
    });
  });

  // VU/Iteration 정보
  const vusAvg = vusCount ? (vusSum / vusCount).toFixed(2) : "-";
  md += `\n## VU/Iteration 정보\n`;
  md += `- 평균 VU (vus): ${vusAvg}\n`;
  md += `- 최대 VU (vus_max): ${vusMax || "-"}\n`;
  md += `- 총 Iteration 수: ${iterations}\n`;
  md += `- 평균 Iteration Duration(ms): ${
    iterations ? (sumIterationDuration / iterations).toFixed(2) : "-"
  }\n`;

  // === 리포트에 병목 구간 표 추가 ===
  md += `\n## [시간대별 병목 구간 분석]\n`;
  md += `| 시작 | 끝 | 평균(ms) | 최대(ms) | 최소(ms) | 요청수 | 실패율(%) | p90 | p95 | p99 |\n`;
  md += `|------|------|----------|----------|----------|-------|------------|------|------|------|\n`;
  bottleneckRows.forEach((row) => {
    const line = `| ${row.startTime} | ${row.endTime} | ${row.avgDur.toFixed(
      2
    )} | ${row.maxDur.toFixed(2)} | ${row.minDur.toFixed(2)} | ${
      row.count
    } | ${row.failRate.toFixed(2)} | ${row.p90.toFixed(2)} | ${row.p95.toFixed(
      2
    )} | ${row.p99.toFixed(2)} |`;
    md += row.highlight ? `**${line}**\n` : `${line}\n`;
  });

  // 에러 상세
  if (errors.length > 0) {
    md += `\n## 에러 상세\n`;
    md += `| URL | Status | Method | Time | Scenario |\n`;
    md += `|-----|--------|--------|------|----------|\n`;
    errors.forEach((e) => {
      md += `| ${e.url} | ${e.status} | ${e.method} | ${e.time} | ${e.scenario} |\n`;
    });
  }

  const mdPath = path.join(reportsDir, "k6-cart-all-result.md");
  fs.writeFileSync(mdPath, md);

  console.log(`리포트 생성 완료!\n- Markdown: ${mdPath}\n- CSV: ${csvPath}`);
}

processFile().catch(console.error);
