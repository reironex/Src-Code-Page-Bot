const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const conversationHistory = {};

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token },
    });
    const attachment = data?.data?.[0] || {};
    return attachment.image_data?.url || attachment.file_url || null;
  } catch (e) {
    console.error("Image URL fetch error:", e.response?.data || e.message);
    return null;
  }
};

const chunkMessage = (msg, maxLen = 1900) => {
  const chunks = [];
  for (let i = 0; i < msg.length; i += maxLen) {
    chunks.push(msg.slice(i, i + maxLen));
  }
  return chunks;
};

module.exports = {
  name: 'test',
  description: 'Interact with Mocha AI via text and image analysis',
  usage: 'Ask a question or reply to an image message.',
  author: 'Coffee',

  async execute(senderId, args, token, event) {
    const prompt = args.join(' ').trim() || 'Hello';
    const chatSessionId = "fc053908-a0f3-4a9c-ad4a-008105dcc360";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 10; K)",
      "Accept": "*/*",
      "Accept-Language": "en-US,en;q=0.8",
      "Origin": "https://app.chipp.ai",
      "Referer": "https://app.chipp.ai/applications/35489/build",
    };

    try {
      if (!conversationHistory[senderId]) conversationHistory[senderId] = [];
      conversationHistory[senderId].push({ role: 'user', content: prompt });

      const imageUrl = await getImageUrl(event, token);
      const messages = [...conversationHistory[senderId]];

      const payload = imageUrl
        ? {
            messages,
            chatSessionId,
            toolInvocations: [{
              toolName: 'analyzeImage',
              args: { userQuery: prompt, imageUrls: [imageUrl] }
            }]
          }
        : { messages, chatSessionId };

      const { data } = await axios.post("https://app.chipp.ai/api/chat", payload, { headers });

      // Extract response text
      const resultText = data.match(/"result":"(.*?)"/g)
        ?.map(s => s.slice(10, -1).replace(/\\n/g, '\n'))
        .join('') || '';

      const toolCalls = data.choices?.[0]?.message?.toolInvocations || [];

      for (const tool of toolCalls) {
        if (tool.state !== 'result' || !tool.result) continue;

        if (tool.toolName === 'generateImage') {
          const url = (tool.result.match(/https?:\/\/\S+/) || [''])[0];
          const desc = (tool.result.match(/(?:Image|Generated Image):\s*(.+?)(?=https?:\/\/)/i) || [,'Generated image'])[1].trim();
          const reply = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒 ・───────────・ Generated Image: ${desc}\n\n${url} ・──── >ᴗ< ────・`;
          await sendMessage(senderId, { text: reply }, token);
          return;
        }

        if (tool.toolName === 'analyzeImage') {
          await sendMessage(senderId, { text: `Image analysis result: ${tool.result}` }, token);
          return;
        }

        if (tool.toolName === 'browseWeb') {
          const answerBox = tool.result.answerBox?.answer || '';
          const organic = Array.isArray(tool.result.organic) ? tool.result.organic.map(o => o.snippet).filter(Boolean).join('\n\n') : '';
          const browseText = answerBox || organic || '';
          const reply = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${resultText}\n\nBrowse result:\n${browseText}\n・──── >ᴗ< ────・`;
          await sendMessage(senderId, { text: reply }, token);
          return;
        }
      }

      if (!resultText) throw new Error('Empty response from AI.');

      conversationHistory[senderId].push({ role: 'assistant', content: resultText });
      const formatted = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${resultText}\n・──── >ᴗ< ────・`;

      for (const chunk of chunkMessage(formatted)) {
        await sendMessage(senderId, { text: chunk }, token);
      }

    } catch (err) {
      if (err.response?.status !== 400) console.error("Error:", err.message || err);
    }
  }
};