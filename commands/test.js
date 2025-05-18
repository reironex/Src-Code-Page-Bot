const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Interact with Chipp AI.',
  usage: '\ntest [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event) return sendMessage(senderId, { text: "Error: Unable to process the request." }, pageAccessToken);
    await handleQuestion(senderId, args.join(' '), pageAccessToken);
  }
};

async function handleQuestion(senderId, prompt, pageAccessToken) {
  if (!prompt) return sendMessage(senderId, { text: "I'm here to help! Please ask a question." }, pageAccessToken);

  try {
    const { data } = await axios.post(
      'https://app.chipp.ai/api/v1/chat/completions',
      {
        model: 'kh-67586',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      },
      {
        headers: {
          'Authorization': 'Bearer live_34456586-aa0b-48f2-b476-a4313ee42fc7',
          'Content-Type': 'application/json'
        }
      }
    );

    const response = formatResponse(data.choices?.[0]?.message?.content || 'No reply.');
    await sendMessage(senderId, { text: response }, pageAccessToken);
  } catch (err) {
    console.error('Chipp AI error:', err?.response?.data || err.message);
    await sendMessage(senderId, { text: "Error: Unable to process your question." }, pageAccessToken);
  }
}

const formatResponse = content => `💬 | 𝙲𝚑𝚒𝚙𝚙 𝙰𝚒\n・────────────・\n${content}\n・──── >ᴗ< ─────・`;