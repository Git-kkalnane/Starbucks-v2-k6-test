import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "1m", target: 1000 },
    { duration: "1m", target: 1500 },
    { duration: "1m", target: 2000 },
    { duration: "1m", target: 2500 },
    { duration: "1m", target: 3000 },
    { duration: "1m", target: 0 },
  ],
};

const BASE_URL = "http://localhost:8080/api/v1";

function addCartItem(token) {
  const payload = JSON.stringify({
    id: 1,
    itemId: 101,
    image: "https://cdn.starbucks.com/item123.jpg",
    itemType: "BEVERAGE",
    temperatureOption: "HOT",
    cartItemOptions: [
      {
        id: 1,
        cartItemId: 1,
        itemOptionId: 1,
        quantity: 2,
        itemOptionName: "샷 추가",
      },
      {
        id: 2,
        cartItemId: 1,
        itemOptionId: 2,
        quantity: 1,
        itemOptionName: "휘핑 추가",
      },
    ],
    cupSize: "GRANDE",
    quantity: 1,
    priceWithOptions: 6300,
  });
  return http.post(`${BASE_URL}/carts/addItem`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function modifyCartItem(token, cartItemId) {
  const payload = JSON.stringify({ cartItemId: cartItemId, changeQuantity: 5 });
  return http.put(`${BASE_URL}/carts/modifyItem`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function deleteCartItems(token, cartItemId) {
  const payload = JSON.stringify({ cartItemId: [cartItemId] });
  return http.request("DELETE", `${BASE_URL}/carts/deleteItem`, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

function getCart(token) {
  let getCartRes = http.get(`${BASE_URL}/carts`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    tags: { vu: __VU },
  });
  check(getCartRes, { "cart get 200": (r) => r.status === 200 });

  sleep(0.3);

  let cartJson = getCartRes.json();
  if (
    cartJson &&
    cartJson.result &&
    Array.isArray(cartJson.result.cartItemDto) &&
    cartJson.result.cartItemDto.length > 0 &&
    cartJson.result.cartItemDto[0].cartItemId
  ) {
    // currentCartItemId = cartJson.result.cartItemDto[0].cartItemId;
    return cartJson.result.cartItemDto;
  } else {
    // 응답이 예상과 다를 때 기본값 또는 에러 처리
    console.warn(
      "카트 응답에 cartItemId가 없습니다:",
      JSON.stringify(cartJson)
    );
    return [];
  }
}

export default function () {
  // 1. 토큰 설정 (postman을 이용해 획득)
  const token =
    "eyJhbGciOiJIUzUxMiJ9.eyJpZCI6MSwiaWF0IjoxNzUyMjIyNTExLCJleHAiOjE3NTIyMjQzMTF9.cGtxCDu6FEH_stAkkJk2-Xf6lWw2qBhwhQZ6z78h3kQKVviik_1tI1EkiU7mq2LMwTB1Ss8SLxwqon8-UWs82g";

  // 2. 카트 아이템 추가
  const addRes = addCartItem(token);
  check(addRes, {
    "카트 추가 성공": (r) => r.status === 200 || r.status === 201,
  });
  sleep(1);
  // ------------------------------------------------

  const getRes = getCart(token);

  check(getRes, { "cart get 200": (r) => r.status === 200 });
  const firstCartItemId = getRes[0].cartItemId ?? 1;
  console.log(">>firstCartItemId:", firstCartItemId);
  sleep(1);

  //----------------------------------------------

  // 3. 카트 아이템 수량 변경
  const modifyRes = modifyCartItem(token, firstCartItemId);
  check(modifyRes, { "카트 수량 변경": (r) => r.status === 200 });
  sleep(1);

  // 4. 카트 아이템 삭제
  const deleteRes = deleteCartItems(token, firstCartItemId);
  check(deleteRes, { "카트 삭제": (r) => r.status === 200 });
  sleep(1);

  // 5. 카트 조회
}
