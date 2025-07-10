import http from "k6/http";
import { check, sleep } from "k6";

const ITERATIONS = __ENV.ITERATIONS ? parseInt(__ENV.ITERATIONS) : 1000;
const DURATION = __ENV.DURATION ? __ENV.DURATION : "1s";

export let options = {
  vus: 1,
  iterations: ITERATIONS,
  duration: DURATION,
};

const BASE_URL = "http://localhost:8080/api/v1";

export default function () {
  let res = http.get(`${BASE_URL}/items/desserts`);
  check(res, { "desserts list 200": (r) => r.status === 200 });
  sleep(0.1);
}
