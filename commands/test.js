const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Ask GPT-4o (Kaizenji AI) anything.',
  usage: '\ntest [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event) {
      return sendMessage(senderId, {
        text: "💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\nSomething went wrong.\n・──── >ᴗ< ────・"
      }, pageAccessToken);
    }

    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, {
        text: "💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\nPlease ask me something so I can help you!\n・──── >ᴗ< ────・"
      }, pageAccessToken);
    }

    try {
      const { data } = await axios.get('https://kaiz-apis.gleeze.com/api/gpt-4o', {
        params: {
          ask: prompt,
          uid: senderId,
          webSearch: prompt,
          apikey: 'b59784be-020d-4a15-bb50-3cfb0f1ae5b0'
        }
      });

      const reply = data?.response?.trim();
      if (reply) {
        sendMessage(senderId, {
          text: `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${reply}\n・──── >ᴗ< ────・`
        }, pageAccessToken);
      } else {
        sendMessage(senderId, {
          text: "💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\nI couldn't come up with an answer.\n・──── >ᴗ< ────・"
        }, pageAccessToken);
      }
    } catch (err) {
      console.error('Kaiz API Error:', err.message);
      sendMessage(senderId, {
        text: "💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\nFailed to get a response from Kaiz API.\n・──── >ᴗ< ────・"
      }, pageAccessToken);
    }
  }
};