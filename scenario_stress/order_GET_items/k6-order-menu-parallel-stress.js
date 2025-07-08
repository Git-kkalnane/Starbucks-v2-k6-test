import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: '1m', target: 100 },   // 1분간 100VU까지 증가
    { duration: '2m', target: 500 },   // 2분간 500VU까지 증가
    { duration: '2m', target: 1000 },  // 2분간 1000VU까지 증가
    { duration: '2m', target: 2000 },  // 2분간 2000VU까지 증가
    { duration: '2m', target: 0 },     // 2분간 0VU로 감소(정리)
  ],
};

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
    requestMemo: `주문자: ${email} - 스트레스 테스트!`,
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
  const idx = (__VU - 1) % tokens.length;
  const { email, accessToken } = tokens[idx];
  const AUTH_HEADER = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };

  // 1. 주문 API는 각 VU가 1번씩 반드시 호출
  const orderPayload = makeOrderPayload(email, idx + 1);
  let orderRes = http.post(ORDER_URL, orderPayload, { ...AUTH_HEADER, tags: { vu: __VU } });
  check(orderRes, {
    "order status was 200": (r) => r.status === 200,
  });

  // 2. 주문과 별개로, iteration마다 랜덤하게 1~4회 drink/dessert 목록 조회
  const numLookups = Math.floor(Math.random() * 4) + 1; // 1~4회
  for (let i = 0; i < numLookups; i++) {
    let res1 = http.get(DRINKS_URL, { tags: { vu: __VU } });
    check(res1, { "drinks 200": (r) => r.status === 200 });
    let res2 = http.get(DESSERT_URL, { tags: { vu: __VU } });
    check(res2, { "dessert 200": (r) => r.status === 200 });
    sleep(0.1);
  }

  // 3. 카트 시나리오 - 아이템 추가, 수량 변경, 삭제, 조회
  // (id, cartItemId 등은 VU별로 고유하게 생성)
  const cartItemId = __VU * 100 + idx;
  const addPayload = JSON.stringify({
    id: cartItemId,
    itemId: 101,
    image: "https://cdn.starbucks.com/item123.jpg",
    itemType: "BEVERAGE",
    temperatureOption: "HOT",
    cartItemOptions: [
      { id: 1, cartItemId: cartItemId, itemOptionId: 1, quantity: 2, itemOptionName: "샷 추가" },
      { id: 2, cartItemId: cartItemId, itemOptionId: 2, quantity: 1, itemOptionName: "휘핑 추가" }
    ],
    cupSize: "GRANDE",
    quantity: 1,
    priceWithOptions: 6300
  });
  let addRes = http.post(`${BASE_URL}/carts/addItem`, addPayload, { ...AUTH_HEADER, tags: { vu: __VU } });
  check(addRes, { "cart add 200": (r) => r.status === 200 });

  // 수량 변경(5로)
  const modifyPayload = JSON.stringify({
    cartItemId: cartItemId,
    changeQuantity: 5
  });
  let modRes = http.put(`${BASE_URL}/carts/modifyItem`, modifyPayload, { ...AUTH_HEADER, tags: { vu: __VU } });
  check(modRes, { "cart mod 200": (r) => r.status === 200 });

  // 아이템 삭제
  const delPayload = JSON.stringify({
    cartItemId: [cartItemId]
  });
  let delRes = http.del(`${BASE_URL}/carts/deleteItem`, delPayload, { ...AUTH_HEADER, tags: { vu: __VU } });
  check(delRes, { "cart del 200": (r) => r.status === 200 });

  // 카트 조회
  let getRes = http.get(`${BASE_URL}/carts`, { ...AUTH_HEADER, tags: { vu: __VU } });
  check(getRes, { "cart get 200": (r) => r.status === 200 });

  sleep(0.3);
}
