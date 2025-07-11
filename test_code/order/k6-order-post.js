import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 1,
  iterations: __ENV.ITERATIONS ? parseInt(__ENV.ITERATIONS) : undefined,
  duration: __ENV.DURATION ? __ENV.DURATION : undefined,
};

const accessToken =
  "eyJhbGciOiJIUzUxMiJ9.eyJpZCI6MSwiaWF0IjoxNzUyMjIyNTExLCJleHAiOjE3NTIyMjQzMTF9.cGtxCDu6FEH_stAkkJk2-Xf6lWw2qBhwhQZ6z78h3kQKVviik_1tI1EkiU7mq2LMwTB1Ss8SLxwqon8-UWs82g";

const BASE_URL = "http://localhost:8080/api/v1";
const LOGIN_URL = `${BASE_URL}/auth/login`;
const ORDER_URL = `${BASE_URL}/orders`;

// tokens.json에서 토큰 목록 불러오기
const tokens = JSON.parse(open("../../tokens.json"));

// 주문 요청 본문 (계정별 고유값 적용)
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
  sleep(0.1);
}
