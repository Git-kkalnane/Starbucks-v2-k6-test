# k6 Load Test Report

| API URL | 요청수 | 평균 응답시간(ms) | 실패율 | 상태코드 |
|---------|--------|-------------------|--------|----------|
| http://localhost:8080/api/v1/auth/login | 100 | 42.61 | 100.0% | 400 |
| http://localhost:8080/api/v1/orders | 100 | 8.00 | 100.0% | 400 |

## HTTP 단계별 시간 (평균, ms)
| 단계 | 평균(ms) |
|------|----------|
| http_req_blocked (http://localhost:8080/api/v1/auth/login) | 0.478 |
| http_req_connecting (http://localhost:8080/api/v1/auth/login) | 0.356 |
| http_req_tls_handshaking (http://localhost:8080/api/v1/auth/login) | 0.000 |
| http_req_sending (http://localhost:8080/api/v1/auth/login) | 0.087 |
| http_req_waiting (http://localhost:8080/api/v1/auth/login) | 42.146 |
| http_req_receiving (http://localhost:8080/api/v1/auth/login) | 0.375 |
| http_req_blocked (http://localhost:8080/api/v1/orders) | 0.289 |
| http_req_connecting (http://localhost:8080/api/v1/orders) | 0.240 |
| http_req_tls_handshaking (http://localhost:8080/api/v1/orders) | 0.000 |
| http_req_sending (http://localhost:8080/api/v1/orders) | 0.032 |
| http_req_waiting (http://localhost:8080/api/v1/orders) | 7.686 |
| http_req_receiving (http://localhost:8080/api/v1/orders) | 0.281 |

## VU/Iteration 정보
- 평균 VU (vus): 10.00
- 최대 VU (vus_max): 10.00
- 총 Iteration 수: 100
- 평균 Iteration Duration(ms): 152.28