const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });
    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
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
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
      "Origin": "https://app.chipp.ai",
      "Referer": "https://app.chipp.ai/applications/35489/build?cacheBust=1737088263915",
      "Cookie": "GAESA=...; __Secure-next-auth.session-token=...", // your full cookie here
    };

    const chunkMessage = (message, maxLength = 1900) => {
      const chunks = [];
      for (let i = 0; i < message.length; i += maxLength) {
        chunks.push(message.slice(i, i + maxLength));
      }
      return chunks;
    };

    try {
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
      }

      conversationHistory[senderId].push({ role: 'user', content: prompt });

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
          const formatted = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒 ・───────────・ Generated Image: ${description}\n\n${url} ・──── >ᴗ< ────・`;
          for (const chunk of chunkMessage(formatted)) {
            await sendMessage(senderId, { text: chunk }, pageAccessToken);
          }
          return;
        }

        if (toolCall.toolName === 'analyzeImage' && toolCall.state === 'result' && toolCall.result) {
          const reply = `Image analysis result: ${toolCall.result}`;
          for (const chunk of chunkMessage(reply)) {
            await sendMessage(senderId, { text: chunk }, pageAccessToken);
          }
          return;
        }

        if (toolCall.toolName === 'browseWeb' && toolCall.state === 'result' && toolCall.result) {
          let answerText = '';
          if (toolCall.result.answerBox?.answer) {
            answerText = toolCall.result.answerBox.answer;
          } else if (Array.isArray(toolCall.result.organic)) {
            answerText = toolCall.result.organic.map(o => o.snippet).filter(Boolean).join('\n\n');
          }

          const finalReply = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${fullResponseText}\n\nBrowse result:\n${answerText}\n・──── >ᴗ< ────・`;
          for (const chunk of chunkMessage(finalReply)) {
            await sendMessage(senderId, { text: chunk }, pageAccessToken);
          }
          return;
        }
      }

      if (!fullResponseText) throw new Error('Empty response from the AI.');

      conversationHistory[senderId].push({ role: 'assistant', content: fullResponseText });
      const formattedResponse = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${fullResponseText}\n・──── >ᴗ< ────・`;
      for (const chunk of chunkMessage(formattedResponse)) {
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