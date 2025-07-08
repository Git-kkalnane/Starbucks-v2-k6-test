# k6 Cart AddItem Load Test Report

| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |
|---------|--------|-------------------|--------|----------|
| http://localhost:8080/api/v1/carts/addItem | 500 | 449.71 | 0.0% | 200 |

## HTTP 단계별 시간 (평균, ms)
| 단계 | 평균(ms) |
|------|----------|
| blocked (http://localhost:8080/api/v1/carts/addItem) | 1.69 |
| connecting (http://localhost:8080/api/v1/carts/addItem) | 1.50 |
| tls_handshaking (http://localhost:8080/api/v1/carts/addItem) | 0.00 |
| sending (http://localhost:8080/api/v1/carts/addItem) | 0.39 |
| waiting (http://localhost:8080/api/v1/carts/addItem) | 449.23 |
| receiving (http://localhost:8080/api/v1/carts/addItem) | 0.09 |
| failed (http://localhost:8080/api/v1/carts/addItem) | 0.00 |

## VU/Iteration 정보
- 평균 VU (vus): 98.00
- 최대 VU (vus_max): 98
- 총 Iteration 수: NaN
- 평균 Iteration Duration(ms): -
