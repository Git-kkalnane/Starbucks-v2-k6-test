import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "1m", target: 1000 }, // 1분간 1000VU까지 증가
    { duration: "1m", target: 1100 }, // 1분간 1500VU까지 증가
    { duration: "1m", target: 1200 }, // 1분간 2000VU까지 증가
    { duration: "1m", target: 1300 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 1400 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 1500 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 1600 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 1700 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 1800 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 1900 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 2000 }, // 1분간 2500VU까지 증가
    { duration: "1m", target: 0 }, // 1분간 0VU로 감소(정리)
  ],
};

const BASE_URL = "http://localhost:8080/api/v1";

export default function () {
  // 1. 모든 음료 목록 조회
  let res1 = http.get(`${BASE_URL}/items/drinks?page=0`);
  check(res1, { "drinks list 200": (r) => r.status === 200 });
  sleep(0.1);

  // 2. 단일 음료 조회 (101)
  let res2 = http.get(`${BASE_URL}/items/drinks/101`);
  check(res2, { "drink 101 200": (r) => r.status === 200 });
  sleep(0.1);

  // 3. 옵션이 있는 단일 음료 조회 (104)
  let res3 = http.get(`${BASE_URL}/items/drinks/104`);
  check(res3, { "drink 104 200": (r) => r.status === 200 });
  sleep(0.1);

  // 4. 모든 디저트 목록 조회
  let res4 = http.get(`${BASE_URL}/items/desserts`);
  check(res4, { "desserts list 200": (r) => r.status === 200 });
  sleep(0.1);

  // 5. 단일 디저트 조회 (202)
  let res5 = http.get(`${BASE_URL}/items/desserts/202`);
  check(res5, { "dessert 202 200": (r) => r.status === 200 });
  sleep(0.1);
}
