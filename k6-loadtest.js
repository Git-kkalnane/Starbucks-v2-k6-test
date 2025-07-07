import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 10, // 1 virtual user
  iterations: 100, // total 200 requests (100 per API)
};

const urls = [
  "http://localhost:8080/api/v1/items/drinks",
  "http://localhost:8080/api/v1/items/desserts",
];

export default function () {
  // Alternate between the two APIs
  const url = urls[__ITER % 2];
  const res = http.get(url);
  check(res, {
    "status was 200": (r) => r.status === 200,
  });
  sleep(0.1); // slight delay between requests
}
