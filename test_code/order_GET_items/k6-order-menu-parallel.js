import http from "k6/http";
import { check, sleep, group } from "k6";

export let options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10, // 전체 VU 수
  iterations: __ENV.ITERATIONS ? parseInt(__ENV.ITERATIONS) : undefined,
  duration: __ENV.DURATION ? __ENV.DURATION : undefined,
};

const accessToken =
  "eyJhbGciOiJIUzUxMiJ9.eyJpZCI6MSwiaWF0IjoxNzUyMjIyNTExLCJleHAiOjE3NTIyMjQzMTF9.cGtxCDu6FEH_stAkkJk2-Xf6lWw2qBhwhQZ6z78h3kQKVviik_1tI1EkiU7mq2LMwTB1Ss8SLxwqon8-UWs82g";
const BASE_URL = "http://localhost:8080/api/v1";
const ORDER_URL = `${BASE_URL}/orders`;
const DRINKS_URL = `${BASE_URL}/items/drinks`;
const DESSERT_URL = `${BASE_URL}/items/desserts`;

// tokens.json에서 토큰 목록 불러오기
const tokens = JSON.parse(open("../../tokens.json"));

function makeOrderPayload(email, idx) {
  return JSON.stringify({
    storeId: 1,
    pickupType: "STORE_PICKUP",
    requestMemo: `주문자: ${email} - 얼음 많이, 샷 연하게 부탁드려요!`,
    cardNumber: `1234-5678-9${String(idx).padStart(3, "0")}-0000`,
    orderItems: [
      {
        itemId: 102,
        itemType: "COFFEE",
        quantity: 1,
        shotQuantity: 1,
        selectedSizes: "TALL",
        selectedTemperatures: "ICE",
        options: [
          {
            itemOptionId: 1,
            quantity: 1,
          },
        ],
      },
      {
        itemId: 201,
        itemType: "DESSERT",
        quantity: 2,
        shotQuantity: null,
        selectedSizes: null,
        selectedTemperatures: null,
        options: [],
      },
    ],
  });
}

export default function () {
  const orderPayload = makeOrderPayload(email, idx + 1);
  const orderParams = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  let orderRes = http.post(ORDER_URL, orderPayload, orderParams);
  check(orderRes, {
    "order status was 200": (r) => r.status === 200,
  });

  // 2. 주문과 별개로, iteration마다 랜덤하게 1~4회 drink/dessert 목록 조회
  const numLookups = Math.floor(Math.random() * 4) + 1; // 1~4회
  for (let i = 0; i < numLookups; i++) {
    let res1 = http.get(DRINKS_URL);
    check(res1, { "drinks 200": (r) => r.status === 200 });
    let res2 = http.get(DESSERT_URL);
    check(res2, { "dessert 200": (r) => r.status === 200 });
    sleep(0.1);
  }
}
