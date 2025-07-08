# k6 테스트 가이드

테스트를 하기전에 꼭 서버를 준비해 주세요 localhost:8080

## 사용법

### 테스트를 위한 준비 설정 ( K6 명령어 아님)

```base
// 원하는 수 만큼 계정 생성
node ./ready/auth/signup-generate-users.js 500


// 토큰 생성 시 원하는 계정 수 지정,
 node ./ready/auth/generate-tokens.js 500
```

### 테스트 목록

주문하기 로직

```base
// 횟수 500명 유저가 30초 동안 500
k6 run --vus 500 --duration 30s ./test_code/order/k6-order-post.js --out json=./test_code/order/k6-order-post-result.json

// 횟수 500명 유저가 500회 실행
k6 run --env VUS=500 --env ITERATIONS=500 --out json=./test_code/order/k6-order-post-result.json ./test_code/order/k6-order-post.js

// 결과 보기
node ./test_code/order/postprocess-k6-order-result.js

```

카드 추가 로직

```
// 500명 유저가 500회 실행
k6 run --env VUS=500 --env ITERATIONS=500 --out json=./test_code/cart/k6-cart-add-item-result.json ./test_code/cart/k6-cart-add-item.js

// 결과 보기
node ./test_code/cart/postprocess-k6-cart-add-item-result.js
```
