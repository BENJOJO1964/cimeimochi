
require('dotenv').config({ path: './node-version/.env' });

const { google } = require('googleapis');

// ✅ 從 .env 中讀取 service account JSON 字串
const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });

require('./scheduler_fixed.js');
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('@line/bot-sdk');
const dayjs = require('dayjs');

const weekdayMapping = {
  0: '星期日',
  1: '星期一',
  2: '星期二',
  3: '星期三',
  4: '星期四',
  5: '星期五',
  6: '星期六'
};

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const app = express();
app.use(bodyParser.json());

const lineClient = new Client(config);

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const DATA_RANGE = process.env.DATA_RANGE || 'Sheet1!A:C';

const flavorMapping = {
  '花生': '好吃喔，你一定吃後感覺很棒，還想再吃噢。',
  '紅豆': '紅豆是我們的熱門口味，不光我們自己講，絕大部分客人也都說好吃。',
  '芝麻': '芝麻麻糬香氣迷人😍，不分老或小的客人讚不絕口，你一定要試試看噢。',
  '咖哩': '咖哩是比較新奇不屬於傳統的口味，目前為止市場反應很熱烈，相信你一定不錯過。',
  '芋泥': '芋泥麻糬吃起來有種說不出的熟悉感，彷彿小學時吃棉花糖的幸福感覺，值得你一再體驗。',
  '滷味香菇': '滷味香菇又是一種我們想推廣的口味，包上麻糬皮後可以品嚐一種口齒留香的嚼勁，你可能沒想像過，期待'
};

async function getStallLocation(queryWeekday) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: DATA_RANGE,
    });
    const rows = response.data.values;
    if (rows && rows.length) {
      for (let i = 1; i < rows.length; i++) {
        let rowWeekday = rows[i][0].trim().split(' ')[0];
        if (rowWeekday === queryWeekday) {
          let location = rows[i][1] ? rows[i][1].trim() : '';
          let time = rows[i][2] ? rows[i][2].trim() : '';
          return time !== '' ? `${location}，時間：${time}` : location;
        }
      }
      return '查無擺攤資訊，請稍後再試。';
    } else {
      return '擺攤資訊暫無資料。';
    }
  } catch (error) {
    console.error('Google Sheets API error:', error);
    return '取得擺攤資訊時發生錯誤。';
  }
}

function getFlavorResponse(text) {
  for (let key in flavorMapping) {
    if (text.includes(key)) {
      return flavorMapping[key];
    }
  }
  return null;
}

async function handleUserQuery(text) {
  if (text.includes('擺攤')) {
    let targetWeekday;
    if (text.includes('今天')) {
      targetWeekday = weekdayMapping[dayjs().day()];
    } else if (text.includes('明天')) {
      targetWeekday = weekdayMapping[dayjs().add(1, 'day').day()];
    } else if (text.includes('後天')) {
      targetWeekday = weekdayMapping[dayjs().add(2, 'day').day()];
    } else {
      targetWeekday = weekdayMapping[dayjs().day()];
    }
    const location = await getStallLocation(targetWeekday);
    return `根據查詢，${targetWeekday} 的擺攤地點為：${location}`;
  } else {
    const flavorResponse = getFlavorResponse(text);
    if (flavorResponse) {
      return flavorResponse;
    } else {
      return '抱歉，無法理解您的問題，請試著詢問「今天哪裡擺攤？」或「花生麻糬好不好吃？」等問題。';
    }
  }
}

app.post('/webhook', async (req, res) => {
  console.log('✅ 收到 LINE Webhook 訊息');
  const events = req.body.events;
  try {
    const results = await Promise.all(events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        if (event.source.type === 'group') {
          console.log('群組ID:', event.source.groupId);
        }
        const replyText = await handleUserQuery(event.message.text);
        return lineClient.replyMessage(event.replyToken, { type: 'text', text: replyText });
      }
    }));
    res.json(results);
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).end();
  }
});

// ✅ Render 預設首頁
app.get('/', (req, res) => {
  res.send('次妹手工麻糬 BOT 上線成功 🍡');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});