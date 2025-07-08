// generate-tokens.js
// Node.js script: 계정 리스트(account.json)로 로그인 후 accessToken을 tokens.json에 저장

const fs = require("fs");
const axios = require("axios");

const LOGIN_URL = "http://localhost:8080/api/v1/auth/login";

// node generate-tokens.js [생성할_계정_수]
let accounts = [];
try {
  const lines = fs
    .readFileSync("account.json", "utf-8")
    .split("\n")
    .filter(Boolean);
  accounts = lines.map((line) => JSON.parse(line));
  console.log(`Loaded ${accounts.length} accounts from account.json`);
} catch (e) {
  // account.json이 없으면 인자 또는 기본값(1000)만큼 생성
  const count = Number(process.argv[2]) || 1000;
  accounts = Array.from({ length: count }, (_, i) => ({
    email: `test${i + 1}@gmail.com`,
    password: "Test1234!!",
  }));
  console.log(`Generated ${accounts.length} accounts (test1~test${accounts.length}@gmail.com)`);
}

(async () => {
  const tokens = [];
  for (const { email, password } of accounts) {
    try {
      const res = await axios.post(
        LOGIN_URL,
        { email, password },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 5000,
        }
      );
      // 서버는 accessToken을 Authorization 헤더(Bearer ...)로 반환함
      let accessToken = null;
      const authHeader = res.headers['authorization'] || res.headers['Authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.replace('Bearer ', '');
      }
      if (accessToken) {
        tokens.push({ email, accessToken });
        console.log(`Success: ${email}`);
      } else {
        console.log(`Login response for ${email} has no accessToken. (authHeader: ${authHeader})`);
      }
    } catch (err) {
      console.log(
        `Login failed for ${email}: ${
          err.response ? err.response.status : err.message
        }`
      );
    }
  }
  fs.writeFileSync("tokens.json", JSON.stringify(tokens, null, 2));
  console.log("tokens.json saved.");
})();
