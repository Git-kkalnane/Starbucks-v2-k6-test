# k6 자동 리포트/CSV 생성 가이드

## 사용 방법

1. **k6 테스트 실행**

```bash
k6 run k6-loadtest.js --out json=k6-loadtest-result.json
```

2. **자동 리포트/CSV 생성**

```bash
npm run postk6
```
- 또는 직접 실행: `node postprocess-k6.js k6-loadtest-result.json`

3. **생성 파일**
- `k6-loadtest-result.csv`: 엑셀 분석용 CSV
- `k6-loadtest-result-report.md`: Markdown 포맷 리포트

---

## 자동화 (선택)
- k6 실행 후 후처리까지 자동화하려면 아래처럼 한 줄로 쓸 수 있습니다:

```bash
k6 run k6-loadtest.js --out json=k6-loadtest-result.json && npm run postk6
```

---

## Node.js 필요
- postprocess-k6.js는 Node.js 환경에서 동작합니다 (추가 패키지 설치 불필요)

---

## 참고
- 더 다양한 리포트 포맷(HTML, PDF 등)이 필요하면 말씀해 주세요!
