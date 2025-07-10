import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  stages: [
    { duration: "1m", target: 100 },
    { duration: "1m", target: 150 },
    { duration: "1m", target: 200 },
    { duration: "1m", target: 250 },
    { duration: "1m", target: 300 },
    { duration: "1m", target: 0 },
  ],
};

const BASE_URL = "http://localhost:8080/api/v1";

const EMAIL = "test1234@gmail.com";
const PASSWORD = "Test1234!!";

function login() {
  const payload = JSON.stringify({ email: EMAIL, password: PASSWORD });
  const res = http.post(`${BASE_URL}/auth/login`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  const token = res.headers["Authorization"];
  if (!token) {
    console.error(
      "[login] No Authorization header in response",
      JSON.stringify(res.headers)
    );
  }
  return token || null;
}

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
    headers: { "Content-Type": "application/json", Authorization: token },
  });
}

function modifyCartItem(token, cartItemId) {
  const payload = JSON.stringify({ cartItemId: cartItemId, changeQuantity: 5 });
  return http.put(`${BASE_URL}/carts/modifyItem`, payload, {
    headers: { "Content-Type": "application/json", Authorization: token },
  });
}

function deleteCartItems(token, cartItemId) {
  const payload = JSON.stringify({ cartItemId: [cartItemId] });
  return http.request("DELETE", `${BASE_URL}/carts/deleteItem`, payload, {
    headers: { "Content-Type": "application/json", Authorization: token },
  });
}

function getCart(token) {
  // return http.get(`${BASE_URL}/carts`, {
  //   headers: { "Content-Type": "application/json", Authorization: token },
  // });

  let getCartRes = http.get(`${BASE_URL}/carts`, {
    headers: { "Content-Type": "application/json", Authorization: token },
    tags: { vu: __VU },
  });
  check(getCartRes, { "cart get 200": (r) => r.status === 200 });

  sleep(0.3);

  let cartJson = getCartRes.json();
  let currentCartItemId = 1;
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
  // 1. 로그인 및 토큰 획득
  // const token = login();
  const token =
    "Bearer eyJhbGciOiJIUzUxMiJ9.eyJpZCI6MSwiaWF0IjoxNzUyMDQzNTk4LCJleHAiOjE3NTIwNDUzOTh9.BjpwnrxVSmT3n2kptZwuqwPSAkeLmnP9pcIG-0Nu4lnvW3BZh1jT4NKNB0KwBAUxSlyT3lGuyGHOnbihBR3SHg";
  // check(token, { "로그인 성공": (t) => !!t });

  // 2. 카트 아이템 추가
  const addRes = addCartItem(token);
  check(addRes, {
    "카트 추가 성공": (r) => r.status === 200 || r.status === 201,
  });
  sleep(1);
  // ------------------------------------------------

  const getRes = getCart(token);

  // check(getRes, { "카트 조회": (r) => r.status === 200 });

  // let getCartRes = http.get(`${BASE_URL}/carts`, {
  //   ...AUTH_HEADER,
  //   tags: { vu: __VU },
  // });
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
