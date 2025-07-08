# k6 주문+메뉴 병렬 Load Test Report

| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |
|---------|--------|-------------------|--------|----------|
| http://localhost:8080/api/v1/orders | 100 | 235.98 | 88.0% | 201, 500 |

| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |
|---------|--------|-------------------|--------|----------|
| http://localhost:8080/api/v1/items/drinks | 268 | 28.16 | 0.0% | 200 |

| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |
|---------|--------|-------------------|--------|----------|
| http://localhost:8080/api/v1/items/desserts | 268 | 6.94 | 0.0% | 200 |

## HTTP 단계별 시간 (평균, ms)
| 단계 | 평균(ms) |
|------|----------|
| blocked (http://localhost:8080/api/v1/orders) | 3.44 |
| connecting (http://localhost:8080/api/v1/orders) | 2.34 |
| tls_handshaking (http://localhost:8080/api/v1/orders) | 0.00 |
| sending (http://localhost:8080/api/v1/orders) | 0.02 |
| waiting (http://localhost:8080/api/v1/orders) | 235.51 |
| receiving (http://localhost:8080/api/v1/orders) | 0.45 |
| failed (http://localhost:8080/api/v1/orders) | 0.88 |
| 단계 | 평균(ms) |
|------|----------|
| blocked (http://localhost:8080/api/v1/items/drinks) | 0.06 |
| connecting (http://localhost:8080/api/v1/items/drinks) | 0.05 |
| tls_handshaking (http://localhost:8080/api/v1/items/drinks) | 0.00 |
| sending (http://localhost:8080/api/v1/items/drinks) | 0.01 |
| waiting (http://localhost:8080/api/v1/items/drinks) | 28.08 |
| receiving (http://localhost:8080/api/v1/items/drinks) | 0.07 |
| failed (http://localhost:8080/api/v1/items/drinks) | 0.00 |
| 단계 | 평균(ms) |
|------|----------|
| blocked (http://localhost:8080/api/v1/items/desserts) | 0.00 |
| connecting (http://localhost:8080/api/v1/items/desserts) | 0.00 |
| tls_handshaking (http://localhost:8080/api/v1/items/desserts) | 0.00 |
| sending (http://localhost:8080/api/v1/items/desserts) | 0.01 |
| waiting (http://localhost:8080/api/v1/items/desserts) | 6.89 |
| receiving (http://localhost:8080/api/v1/items/desserts) | 0.05 |
| failed (http://localhost:8080/api/v1/items/desserts) | 0.00 |

## VU/Iteration 정보
- 평균 VU (vus): -
- 최대 VU (vus_max): -
- 총 Iteration 수: NaN
- 평균 Iteration Duration(ms): -

## 에러 상세
| URL | Status | Method | Time | Scenario |
|-----|--------|--------|------|----------|
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.900579+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.901133+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.901505+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.901674+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.901946+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.901983+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.902102+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.902197+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.90239+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.902753+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.903468+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.904845+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.905083+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.905584+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.905876+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.906181+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.930885+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.930899+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.931324+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.931536+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.931644+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.93173+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.931746+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.931841+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.932596+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.932721+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.933215+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.934025+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.938934+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.938946+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.939004+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.940108+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.941173+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.943796+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.944117+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.944312+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.945606+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.95041+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.951516+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.951711+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.952357+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.952389+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.952406+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.952545+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.953656+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.954873+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.956986+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.957074+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.957371+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.959542+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.960141+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.960612+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.966292+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.966356+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.966378+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.966556+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.9669+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.967056+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.967092+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.96724+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.96822+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.968593+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.969361+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.969748+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.974673+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.978849+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.978875+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.979115+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.979404+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.979684+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.97997+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.981003+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.98124+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.98124+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.981353+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.983839+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.984866+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.985672+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.985788+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.98833+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.990737+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:40.990866+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:41.00985+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:41.010393+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:41.011296+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:41.011507+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:41.01377+09:00 | default |
| http://localhost:8080/api/v1/orders | 500 | POST | 2025-07-09T02:28:41.015988+09:00 | default |
