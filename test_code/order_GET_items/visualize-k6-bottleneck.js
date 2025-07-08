// k6 JSONL 결과에서 HTTP 단계별(phase) 평균시간을 API별로 추출하고, bottleneck(병목) 구간을 시각화(그래프)로 보여줌
// 대용량 파일도 line-by-line 스트림 처리
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { spawn } = require("child_process");

const resultFile =
  process.argv[2] || "k6-order-menu-parallel-stress-result.json";
const resultPath = path.join(__dirname, resultFile);

if (!fs.existsSync(resultPath)) {
  console.error("결과 파일이 존재하지 않습니다:", resultPath);
  process.exit(1);
}

// 1. 단계별 시간 집계
const stepStats = {}; // { url: { step: [duration, ...] } }

async function processFile() {
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
    if (
      obj.metric &&
      obj.metric.startsWith("http_req_") &&
      obj.data.tags &&
      obj.data.tags.url
    ) {
      // Extract only 'api/v1/{domainURL}' from the full URL
      let url = obj.data.tags.url;
      let domainURL = url.match(/\/api\/v1\/(.+)/);
      //   url = domainURL ? domainURL[1] : "noting";
      url = "test";
      const step = obj.metric.replace("http_req_", "");
      stepStats[url] = stepStats[url] || {};
      stepStats[url][step] = stepStats[url][step] || [];
      stepStats[url][step].push(obj.data.value);
    }
  }

  // 2. 평균값 계산
  const avgStats = {};
  Object.entries(stepStats).forEach(([url, steps]) => {
    avgStats[url] = {};
    Object.entries(steps).forEach(([step, vals]) => {
      avgStats[url][step] = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : 0;
    });
  });

  // 3. CSV로 저장 (그래프용)
  const csvRows = [["url", "step", "avg_duration_ms"]];
  Object.entries(avgStats).forEach(([url, steps]) => {
    Object.entries(steps).forEach(([step, avg]) => {
      csvRows.push([url, step, avg.toFixed(2)]);
    });
  });
  const csvPath = path.join(__dirname, "reports", "k6-phase-avg.csv");
  if (!fs.existsSync(path.dirname(csvPath)))
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, csvRows.map((row) => row.join(",")).join("\n"));

  // 4. 그래프 자동 생성 (node-canvas, chartjs-node-canvas, or gnuplot 등 활용)
  // 여기서는 gnuplot 사용 예시 (설치 필요)
  const plotScript = `set terminal png size 900,400\nset output 'reports/k6-phase-avg.png'\nset datafile separator ","\nset style data histogram\nset style fill solid border -1\nset boxwidth 0.8\nset ylabel "평균 시간(ms)"\nset xlabel "HTTP 단계(url)"\nset title "k6 단계별 평균 응답시간 (API별)"\nset key autotitle columnhead\nplot for [i=2:3] 'reports/k6-phase-avg.csv' using i:xtic(1) title columnheader(i)\n`;
  const plotPath = path.join(__dirname, "reports", "k6-phase-avg.plot");
  fs.writeFileSync(plotPath, plotScript);

  // gnuplot 실행 (설치 필요)
  const gnuplot = spawn("gnuplot", [plotPath], { cwd: path.join(__dirname) });
  gnuplot.on("close", (code) => {
    if (code === 0) {
      console.log("그래프 생성 완료! (reports/k6-phase-avg.png)");
    } else {
      console.log(
        "gnuplot 실행 실패. CSV를 직접 분석하거나, 엑셀/구글시트로 시각화하세요."
      );
    }
  });
}

processFile();

/*
- gnuplot이 없다면: reports/k6-phase-avg.csv 파일을 엑셀/구글시트로 불러와서 막대그래프(카테고리: url+step, 값: avg_duration_ms)로 그리면 병목 구간을 한눈에 볼 수 있습니다.
- 가장 값이 큰 step이 병목 구간입니다.
*/
