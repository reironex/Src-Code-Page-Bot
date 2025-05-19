const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token },
    });
    const attachment = data?.data?.[0];
    return attachment?.image_data?.url || attachment?.file_url || null;
  } catch (err) {
    console.error("Image URL fetch error:", err.response?.data || err.message);
    return null;
  }
};

const conversationHistory = {};

const chunkMessage = (msg, maxLen = 1900) => {
  const chunks = [];
  for (let i = 0; i < msg.length; i += maxLen) {
    chunks.push(msg.slice(i, i + maxLen));
  }
  return chunks;
};

const buildHeaders = () => ({
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
  "Sec-CH-UA-Platform": "Android",
  "Sec-CH-UA": '"Brave";v="136", "Chromium";v="136", "Not_A Brand";v="24"',
  "Sec-CH-UA-Mobile": "?1",
  "Accept": "*/*",
  "Sec-GPC": "1",
  "Accept-Language": "en-US,en;q=0.8",
  "Origin": "https://app.chipp.ai",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  "Referer": "https://app.chipp.ai/applications/35489/build?cacheBust=1737088263915",
  "Accept-Encoding": "gzip, deflate, br, zstd",
  "Cookie": "GAESA=CooBMDBjYTM2OTVkMjBiNTE5MWY3NzFkZTk2MTZjNzU3NjFkZDMxNTA2MDUwNGViMzA0MzUzNGIxZDM2MzIwMmZiNDEzZjA0MGEwNWNhYjhiYjMzMTRjMWRkZGE2ZTMxMGVjYWExNTdkNmNiMjFkNWViMzc2YWYxODg5ZjQ0YWIwZWRmMWIwZjNjNGE1EIbvm5THMg; __Host-next-auth.csrf-token=54510ff606af01782c0d6c08c39a96fb421ca5e0bfe58ae323702e5b2daab8b9%7C67f259a94de43fc5157335500f498153ad55759cd7e8350e1c36a98073db160a; __Secure-next-auth.callback-url=https%3A%2F%2Fapp.chipp.ai; ph_phc_58R4nRj6BbHvFBIwUiMlHyD8X7B5xrup5HMX1EDFsFw_posthog=%7B%22distinct_id%22%3A%22mjaymjas%40gmail.com%22%2C%22%24sesid%22%3A%5B1737088291942%2C%2201947286-f553-74f6-8a85-c5ed3e3815c8%22%2C1737088234835%5D%2C%22%24epp%22%3Atrue%7D; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..dvZRGwF9T9nrJ8nX.Zezd6eR8u8MQhtSMghHVdbCHu3xFW4CXq3aHXLxw8QNC976iR3D797jF5u1Xm2RRv0TBy76El39mBltfXn2aa_7YShF-HztxeglSoBlxFBeI6OBCwDECWt_wMxqVaXeVnuWT60yVzH54cd3Xqq09kE3mTszWG9nGH5CXHYpghmUZtVfEhQKTgW139A86U42N2xR3VONMo_QO2kYpUZlCgKvubCsJv9KkATlz2tZwQeR1EHagYvlC8YQtI4zIUbaNcoDXxAmIpFR7J0GSQL3oi4akOk-pKhHFDa3KRLkw6e1WA7fvAgc7dXPaAbu7-ZfVVpcvP_uDi54UNCH-awQK4CVkR6Oqpx3nK-2kdd7DDxu3qRzmw0ItZCahU4Q.V4aAtYuxd2mCQZ_qLkKE2Q",
});

module.exports = {
  name: 'test',
  description: 'Interact with Mocha AI using text and image analysis',
  usage: 'Ask a question or reply to an image',
  author: 'Coffee',

  async execute(senderId, args, pageAccessToken, event) {
    try {
      const prompt = args.join(' ').trim() || 'Hello';
      const chatSessionId = "fc053908-a0f3-4a9c-ad4a-008105dcc360";

      if (!conversationHistory[senderId]) conversationHistory[senderId] = [];
      conversationHistory[senderId].push({ role: 'user', content: prompt });

      const imageUrl = await getImageUrl(event, pageAccessToken);

      const payload = {
        messages: [...conversationHistory[senderId]],
        chatSessionId,
      };

      if (imageUrl) {
        payload.messages.push({
          role: 'user',
          content: `${prompt}\nImage URL: ${imageUrl}`,
        });
        payload.toolInvocations = [{
          toolName: 'analyzeImage',
          args: { userQuery: prompt, imageUrls: [imageUrl] },
        }];
      }

      const { data } = await axios.post("https://app.chipp.ai/api/chat", payload, {
        headers: buildHeaders(),
      });

      const resultText = (() => {
        if (data.choices?.[0]?.message?.content) return data.choices[0].message.content;
        const matchResults = data.match(/"result":"(.*?)"/g) || data.match(/0:"(.*?)"/g);
        if (!matchResults) return '';
        return matchResults.map(chunk => chunk.replace(/.*?"(.*?)"/, '$1').replace(/\\n/g, '\n')).join('');
      })();

      const toolInvocations = data.choices?.[0]?.message?.toolInvocations || [];

for (const tool of toolInvocations) {
  if (tool.state !== 'result' || !tool.result) continue;

  if (tool.toolName === 'generateImage') {
    const urlMatch = tool.result.match(/https?:\/\/\S+/);
    const descriptionMatch = tool.result.match(/(?:Image|Generated Image):\s*(.+?)(?:https?:\/\/|$)/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : 'Generated image';
    const url = urlMatch ? urlMatch[0] : '';
    const reply = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒 ・───────────・ Generated Image: ${description}\n\n${url} ・──── >ᴗ< ────・`;
    for (const chunk of chunkMessage(reply)) {
      await sendMessage(senderId, { text: chunk }, pageAccessToken);
    }
    return;
  }

  const header = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n`;
  const footer = `\n・──── >ᴗ< ────・`;
  let fullText = "";

  if (tool.toolName === 'analyzeImage') {
    fullText = `${header}Image analysis result:\n${tool.result}${footer}`;
  } else if (tool.toolName === 'browseWeb') {
    const answerBox = tool.result.answerBox?.answer;
    const organicSnippets = Array.isArray(tool.result.organic)
      ? tool.result.organic.map(o => o.snippet).filter(Boolean).join('\n\n')
      : '';
    const answerText = answerBox || organicSnippets || '';
    fullText = `${header}${resultText}\n\nBrowse result:\n${answerText}${footer}`;
  }

  if (fullText) {
    for (const chunk of chunkMessage(fullText)) {
      await sendMessage(senderId, { text: chunk }, pageAccessToken);
    }
    return;
  }
}

      if (!resultText) throw new Error('Empty AI response');

      conversationHistory[senderId].push({ role: 'assistant', content: resultText });

      const reply = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${resultText}\n・──── >ᴗ< ────・`;
      for (const chunk of chunkMessage(reply)) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }

    } catch (err) {
      if (err.response?.status === 400) {
        console.error("Bad Request: Ignored.");
      } else {
        console.error("Error:", err);
      }
    }
  },
};