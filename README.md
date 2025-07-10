# k6 테스트 가이드

## 사전 준비

### k6 설치

MacOS의 경우 Homebrew를 통해 k6를 설치해 주어야 한다.

```shell
brew install k6
```

Windows는 아래의 둘 중 한 가지 방법을 선택하면 된다.

```shell
choco install k6

# 또는

winget intall k6 --source winget
```

### 코드 에디터 선택

메모장을 사용하더라도 k6 테스트 케이스를 작성하는 데는 아무런 지장이 없지만 가급적이면 VSCode 또는 VSCode 기반의 코드 에디터로 k6 테스트를 작성하는 것을 추천한다.

뿐만 아니라 TypeScript로 코드를 작성할 경우 아래와 같이 npm @types 라이브러리를 사용할 수도 있다.

```shell
# create a `package.json` file
$ npm init --yes

# install the k6 types as dev dependency
$ npm install --save-dev @types/k6
```

### 테스트 케이스 작성

1. 먼저 테스트를 하고 싶은 도메인의 이름을 가진 폴더가 있는지 확인하고 없다면 생성한다.
2. 폴더 내부에 적절한 이름을 가진 js 파일을 생성한다.
3. k6 파일의 기본적인 뼈대는 아래와 같다.

   ```javascript
   import http from "k6/http";
   import { sleep, check } from "k6";

   export const options = {
     iterations: 10,
   };

   // default exported 함수는 k6에 의해 테스트 스크립트의 진입점으로 선택된다. 이 함수는 테스트 전체 기간 동안 “반복”을 통해 반복적으로 실행된다.
   export default function () {
     // 테스트 대상 엔드포인트에 GET 요청을 보낸다.
     http.get("https://quickpizza.grafana.com");

     // 1초 동안 대기하여 실제 사용 환경을 시뮬레이션한다.
     sleep(1);
   }
   ```

4. 사전에 다른 팀원들이 작성해 둔 테스트 케이스, [공식 문서](https://grafana.com/docs/k6/latest/) 또는 인터넷에 있는 예시를 참고하여 테스트 케이스를 작성한다.
5. 테스트 케이스 작성이 완료되었을 경우 스프링 부트 애플리케이션을 실행 후 아래의 사용법을 참고하여 테스트를 진행하면 된다.

## 스프링 부트 애플리케이션 실행 방법

스타벅스 클론코딩 백엔드 서버의 테스트는 서비스를 배포할 AWS t3.small 인스턴스의 스펙과 유사한 도커 컨테이너에서 진행 할 예정이다.

따라서 테스트를 진행하기 전 먼저 아래와 같은 절차를 거쳐야한다.

1. Docker Desktop이 현재 실행중인지 확인. 만일 실행중인 상태가 아니라면 실행.
2. 프로젝트 루트 폴더 (./starbucks-backend-v2)에서 아래와 같이 docker compose 실행
   ```shell
   docker-compose -f docker-compose.yml up --build
   ```
3. `docker ps` 명령 또는 Docker Desktop을 통해 스프링 부트 애플리케이션이 정상적으로 실행되었는지 확인
4. 우리 팀의 Organization에 있는 [monitoring 리포지토리](https://github.com/Git-kkalnane/monitoring)를 pull 받아 마찬가지로 docker compose 실행 (자세한 설명은 해당 리파지토리 참고)
5. 준비가 완료되었다면 테스트를 수행하며 메트릭 지표들의 변동을 관측하며 병목 지점을 유추하면 된다.

## 사용법

### 인증이 필요한 엔드포인트에 대한 테스트 시 필요한 사전 설정 (K6 명령어 아님)

```shell
// 원하는 수 만큼 계정 생성
node ./ready/auth/signup-generate-users.js 500


// 토큰 생성 시 원하는 계정 수 지정,
node ./ready/auth/generate-tokens.js 500
```

### 테스트 목록

주문 요청 로직

```shell
// 횟수 500명 유저가 30초 동안 500
k6 run --vus 500 --duration 30s ./test_code/order/k6-order-post.js --out json=./test_code/order/k6-order-post-result.json

// 횟수 500명 유저가 500회 실행
k6 run --env VUS=500 --env ITERATIONS=500 --out json=./test_code/order/k6-order-post-result.json ./test_code/order/k6-order-post.js

// 결과 보기
node ./test_code/order/postprocess-k6-order-result.js

```

장바구니 아이템 추가 로직

```shell
// 500명 유저가 500회 실행
k6 run --env VUS=500 --env ITERATIONS=500 --out json=./test_code/cart/k6-cart-add-item-result.json ./test_code/cart/k6-cart-add-item.js

// 결과 보기
node ./test_code/cart/postprocess-k6-cart-add-item-result.js

```

주문하기와 아이템 조회 병렬로 실행

```shell
// 최소 100번 주문하기와 아이템과 디저트 병렬로 조회
k6 run --env VUS=100 --env ITERATIONS=100 --out json=./test_code/order_GET_items/k6-order-menu-parallel-result.json ./test_code/order_GET_items/k6-order-menu-parallel.js

node ./test_code/order_GET_items/postprocess-k6-order-menu-parallel-result.js k6-order-menu-parallel-result.json

```

item 테스트

모든 item API 스트레스 테스트

```shell
npm run k6:all-item-stress  // 테스트 실행
npm run post:all-item-stress // 결과 보기

결과 파일 생성됨
=> test_code/item/report/k6-items-all-apis-stress.md
=> test_code/item/report/k6-items-all-apis-stress.csv
```
