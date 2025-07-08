import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 1,
  iterations: __ENV.ITERATIONS ? parseInt(__ENV.ITERATIONS) : undefined,
  duration: __ENV.DURATION ? __ENV.DURATION : undefined
};

const BASE_URL = "http://localhost:8080/api/v1";
const CART_ADD_URL = `${BASE_URL}/carts/addItem`;

// tokens.json에서 토큰 목록 불러오기
const tokens = JSON.parse(open("../../tokens.json"));

// cart 추가 요청 본문 (계정별 고유값 적용)
function makeCartPayload(email, idx) {
  return JSON.stringify({
    id: idx + 1,
    itemId: 101 + (idx % 5), // 다양한 상품 ID
    image: `https://cdn.starbucks.com/item${100+idx}.jpg`,
    itemType: "BEVERAGE",
    temperatureOption: idx % 2 === 0 ? "HOT" : "ICE",
    cartItemOptions: [
      {
        id: 1,
        cartItemId: idx + 1,
        itemOptionId: 1,
        quantity: 2,
        itemOptionName: "샷 추가"
      },
      {
        id: 2,
        cartItemId: idx + 1,
        itemOptionId: 2,
        quantity: 1,
        itemOptionName: "휘핑 추가"
      }
    ],
    cupSize: idx % 3 === 0 ? "GRANDE" : "TALL",
    quantity: 1,
    priceWithOptions: 6300 + (idx % 4) * 100
  });
}

export default function () {
  const idx = (__VU - 1) % tokens.length;
  const { email, accessToken } = tokens[idx];
  console.log(`사용 계정: ${email}`);

  // 계정별 고유 cart payload 생성
  const cartPayload = makeCartPayload(email, idx);

  // cart 추가 요청 시 accessToken 사용
  const cartParams = {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  };
  let cartRes = http.post(CART_ADD_URL, cartPayload, cartParams);
  check(cartRes, {
    "cart add status was 200": (r) => r.status === 200,
  });
  sleep(0.1);
}
