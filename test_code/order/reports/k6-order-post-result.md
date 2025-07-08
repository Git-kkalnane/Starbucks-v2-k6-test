# k6 Load Test Report

| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |
|---------|--------|-------------------|--------|----------|
| http://localhost:8080/api/v1/orders | 100 | 93.53 | 96.0% | 201, 500 |

## HTTP 단계별 시간 (평균, ms)
| 단계 | 평균(ms) |
|------|----------|
| blocked (http://localhost:8080/api/v1/orders) | 14.279 |
| connecting (http://localhost:8080/api/v1/orders) | 6.041 |
| tls_handshaking (http://localhost:8080/api/v1/orders) | 0.000 |
| sending (http://localhost:8080/api/v1/orders) | 0.160 |
| waiting (http://localhost:8080/api/v1/orders) | 89.776 |
| receiving (http://localhost:8080/api/v1/orders) | 3.593 |
| failed (http://localhost:8080/api/v1/orders) | 0.960 |

## VU/Iteration 정보
- 평균 VU (vus): -
- 최대 VU (vus_max): -
- 총 Iteration 수: NaN
- 평균 Iteration Duration(ms): -
