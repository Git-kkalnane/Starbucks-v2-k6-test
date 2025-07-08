// signup-generate-users.js
// Node.js + axios로 원하는 수 만큼 계정 순차 생성

const axios = require("axios");

const SIGNUP_URL = "http://localhost:8080/api/v1/members/signup";
const count = Number(process.argv[2]) || 1000;

(async () => {
  for (let i = 1; i <= count; i++) {
    const email = `test${i}@gmail.com`;
    try {
      const res = await axios.post(
        SIGNUP_URL,
        {
          name: "테스트",
          nickname: "테스트터",
          email,
          password: "Test1234!!",
        },
        { headers: { "Content-Type": "application/json" } }
      );
      if (res.status === 201) {
        console.log(`Created: ${email}`);
      } else {
        console.log(`Failed: ${email} - status ${res.status}`);
      }
    } catch (err) {
      console.log(`Failed: ${email} - ${err.response?.status || err.message}`);
    }
  }
})();
