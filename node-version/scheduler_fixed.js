const cron = require('node-cron');
const { google } = require('googleapis');
const dayjs = require('dayjs');
const { Client } = require('@line/bot-sdk');
require('dotenv').config({ path: './node-version/.env' });

// LINE 與 Google Sheets 設定
const lineClient = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    keyFile: './path/to/your/google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  }),
});

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const DATA_RANGE = process.env.DATA_RANGE || 'Sheet1!A:C';

// 讀取 Google Sheets 擺攤資訊
async function getStallInfo(queryDate) {
  try {
    const authClient = await sheets.auth.getClient();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: DATA_RANGE,
      auth: authClient,
    });
    const rows = response.data.values;
    if (rows && rows.length) {
      for (let i = 1; i < rows.length; i++) {
        let rowDate = dayjs(rows[i][0], 'YYYY-MM-DD');
        if (rowDate.isSame(queryDate, 'day')) {
          return rows[i][1];  // 假設第二欄是地點資訊
        }
      }
      return '今日無擺攤資訊，請稍後再查詢。';
    } else {
      return '擺攤資訊暫無資料。';
    }
  } catch (error) {
    console.error('Google Sheets API error:', error);
    return '取得擺攤資訊時發生錯誤。';
  }
}

// 設定每日公告任務：例如每天早上8點執行
cron.schedule('0 8 * * *', async () => {
  const today = dayjs();
  const stallInfo = await getStallInfo(today);
  const message = `【每日公告】\n今天(${today.format('YYYY-MM-DD')})擺攤地點：${stallInfo}`;
  console.log('發送公告訊息：', message);

  // 發送 LINE 訊息給特定群組或使用者（依您設定）
  // 請將以下範例中的 targetId 改成實際的接收者 ID
  const targetId = 'C7d9aa320b9291f4b44d12cc336f691cd';
  try {
    await lineClient.pushMessage(targetId, {
      type: 'text',
      text: message,
    });
    console.log('公告訊息已發送。');
  } catch (err) {
    console.error('公告訊息發送失敗：', err);
  }
}, {
  scheduled: true,
  timezone: 'Asia/Taipei' // 根據實際需求設定時區
});

console.log('每日公告排程已啟動。');