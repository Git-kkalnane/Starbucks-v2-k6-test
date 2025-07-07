import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 1,
  iterations: 2,
};

const BASE_URL = "http://localhost:8080/api/v1";
const LOGIN_URL = `${BASE_URL}/auth/login`;
const ORDER_URL = `${BASE_URL}/orders`;

// 로그인 정보 (테스트용 계정 정보로 교체 필요)
const loginPayload = JSON.stringify({
  email: "test1234@gmail.com", // 실제 계정 정보로 변경
  password: "Test1234!!", // 실제 계정 정보로 변경
});

const loginParams = {
  headers: {
    "Content-Type": "application/json",
  },
};

// 주문 요청 본문 (샘플)
const orderPayload = JSON.stringify({
  storeId: 1,
  pickupType: "STORE_PICKUP",
  requestMemo: "얼음 많이, 샷 연하게 부탁드려요!",
  cardNumber: "1234-5678-9012-3456",
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

export default function () {
  // 1. 로그인해서 accessToken 획득
  let loginRes = http.post(LOGIN_URL, loginPayload, loginParams);
  check(loginRes, {
    "login status was 200": (r) => r.status === 200,
    // Authorization 헤더에 토큰이 있는지 확인
    "token exists in header": (r) =>
      !!r.headers["Authorization"] || !!r.headers["authorization"],
  });
  // 헤더에서 토큰 추출
  let token = null;
  if (loginRes.headers["Authorization"]) {
    token = loginRes.headers["Authorization"].replace(/^Bearer /i, "");
  } else if (loginRes.headers["authorization"]) {
    token = loginRes.headers["authorization"].replace(/^Bearer /i, "");
  }
  console.log("@@@token:", token);

  // 2. accessToken을 Authorization 헤더에 넣어 주문 요청
  const orderParams = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  let orderRes = http.post(ORDER_URL, orderPayload, orderParams);
  check(orderRes, {
    "order status was 200": (r) => r.status === 200,
  });
  sleep(0.1);
}
