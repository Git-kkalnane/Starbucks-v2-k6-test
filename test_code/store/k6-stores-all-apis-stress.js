import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "1m", target: 1000 },
    { duration: "1m", target: 1100 },
    { duration: "1m", target: 1200 },
    { duration: "1m", target: 1300 },
    { duration: "1m", target: 1400 },
    { duration: "1m", target: 1500 },
    { duration: "1m", target: 1600 },
    { duration: "1m", target: 0 },
  ],
};

const BASE_URL = "http://localhost:8080/api/v1";

export default function () {
  // 1. 지점 목록 기본 조회 (첫 페이지, 15개)
  let res1 = http.get(`${BASE_URL}/stores`);
  check(res1, { "stores list page1 200": (r) => r.status === 200 });
  sleep(0.1);

  // 2. 지점 목록 페이지네이션 테스트 (2페이지, 5개씩)
  let res2 = http.get(`${BASE_URL}/stores?page=1&size=5`);
  check(res2, { "stores list page2 size5 200": (r) => r.status === 200 });
  sleep(0.1);

  // 3. 존재하는 지점 상세 조회 (ID: 1)
  let res3 = http.get(`${BASE_URL}/stores/1`);
  check(res3, { "store 1 detail 200": (r) => r.status === 200 });
  sleep(0.1);

  // 4. 존재하지 않는 지점 상세 조회 (ID: 999) - 404 에러 확인
  let res4 = http.get(`${BASE_URL}/stores/999`);
  check(res4, { "store 999 detail 404": (r) => r.status === 404 });
  sleep(0.1);
}
