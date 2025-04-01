require('dotenv').config();
const { google } = require('googleapis');
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

async function testAuth() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const client = await auth.getClient();
    console.log("✅ Google Auth 驗證成功！");
  } catch (err) {
    console.error("❌ Google Auth 驗證失敗：", err);
  }
}

testAuth();
