const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Chat with Chipp AI (multi-turn, per-user session)',
  usage: '\nchippai [message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event || !args.length) return sendMessage(senderId, { text: "What would you like to ask?" }, pageAccessToken);
    await handleChat(senderId, args.join(' '), pageAccessToken);
  }
};

async function handleChat(senderId, prompt, pageAccessToken) {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://mochaai-35489.chipp.ai/api/chat',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://mochaai-35489.chipp.ai',
        'referer': 'https://mochaai-35489.chipp.ai/w/chat/',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.6',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'cookie': `chatSessionId_35489=${senderId}; correlationId=${senderId}`,
      },
      data: {
        messages: [{ role: 'user', content: prompt }],
        chatSessionId: senderId
      },
      responseType: 'stream'
    });

    let reply = '';
    response.data.on('data', chunk => {
      const matches = chunk.toString().match(/0:"(.*?)"/g);
      if (matches) {
        for (let match of matches) {
          reply += match.replace(/^0:"|"$/g, '');
        }
      }
    });

    response.data.on('end', async () => {
      const clean = reply.replace(/\\"/g, '"').replace(/\\n/g, '\n');
      await sendMessage(senderId, { text: clean.trim() || "No response received." }, pageAccessToken);
    });

  } catch (err) {
    await sendMessage(senderId, { text: "Failed to reach Chipp AI." }, pageAccessToken);
  }
}