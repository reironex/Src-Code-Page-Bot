const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    const imageUrl = data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
    return imageUrl;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

const conversationHistory = {};

module.exports = {
  name: 'test',
  description: 'Interact with Mocha AI using text queries and image analysis',
  usage: 'ask a question, or send a reply question to an image.',
  author: 'Coffee',

  async execute(senderId, args, pageAccessToken, event) {
    const prompt = args.join(' ').trim() || 'Hello';
    const chatSessionId = "fc053908-a0f3-4a9c-ad4a-008105dcc360";

    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
      "Sec-CH-UA-Platform": "Android",
      "Sec-CH-UA": '"Brave";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
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
      "Cookie": "GAESA=...; __Secure-next-auth.session-token=...", 
      "Priority": "u=1, i",
    };

    try {
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
      }

      conversationHistory[senderId].push({ role: 'user', content: prompt });

      const chunkMessage = (message, maxLength) => {
        const chunks = [];
        for (let i = 0; i < message.length; i += maxLength) {
          chunks.push(message.slice(i, i + maxLength));
        }
        return chunks;
      };

      const imageUrl = await getImageUrl(event, pageAccessToken);

      let payload;

      if (imageUrl) {
        const combinedPrompt = `${prompt}\nImage URL: ${imageUrl}`;
        payload = {
          messages: [...conversationHistory[senderId], { role: 'user', content: combinedPrompt }],
          chatSessionId,
          toolInvocations: [
            {
              toolName: 'analyzeImage',
              args: {
                userQuery: prompt,
                imageUrls: [imageUrl],
              }
            }
          ]
        };
      } else {
        payload = {
          messages: [...conversationHistory[senderId]],
          chatSessionId,
        };
      }

      const { data } = await axios.post("https://app.chipp.ai/api/chat", payload, { headers });

      const responseTextChunks = data.match(/"result":"(.*?)"/g)?.map(chunk => chunk.slice(10, -1).replace(/\\n/g, '\n')) 
        || data.match(/0:"(.*?)"/g)?.map(chunk => chunk.slice(3, -1).replace(/\\n/g, '\n')) || [];

      const fullResponseText = responseTextChunks.join('');
      const toolCalls = data.choices?.[0]?.message?.toolInvocations || [];

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'generateImage' && toolCall.state === 'result' && toolCall.result) {
          const descMatch = toolCall.result.match(/(?:Image|Generated Image):\s*(.+?)(?:https?:\/\/)/i);
          const description = descMatch ? descMatch[1].trim() : 'Generated image';
          const urlMatch = toolCall.result.match(/https?:\/\/\S+/);
          const url = urlMatch ? urlMatch[0] : '';

          const formattedImageReply = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\nGenerated Image: ${description}\n\n${url}\n・──── >ᴗ< ────・`;
          await sendMessage(senderId, { text: formattedImageReply }, pageAccessToken);
          return;
        }

        if (toolCall.toolName === 'analyzeImage' && toolCall.state === 'result' && toolCall.result) {
          await sendMessage(senderId, { text: `Image analysis result: ${toolCall.result}` }, pageAccessToken);
          return;
        }
      }

      if (!fullResponseText) {
        throw new Error('Empty response from the AI.');
      }

      conversationHistory[senderId].push({ role: 'assistant', content: fullResponseText });
      const formattedResponse = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${fullResponseText}\n・──── >ᴗ< ────・`;
      const messageChunks = chunkMessage(formattedResponse, 1900);
      for (const chunk of messageChunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }

    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.error("Bad Request: Ignored.");
      } else {
        console.error("Error:", err);
      }
    }
  },
};