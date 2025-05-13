const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'gpt4',
  description: 'Interact with GPT-4o (Kaiz API)',
  usage: 'gpt4 [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, { text: 'Usage: gpt4 <question>' }, pageAccessToken);
    }

    try {
      const url = `https://kaiz-apis.gleeze.com/api/gpt-4o?ask=${encodeURIComponent(prompt)}&uid=${senderId}&webSearch=off`;
      const { data } = await axios.get(url);

      if (data?.response) {
        sendMessage(senderId, { text: data.response }, pageAccessToken);
      } else {
        sendMessage(senderId, { text: 'No response received from the AI.' }, pageAccessToken);
      }
    } catch (error) {
      console.error('GPT-4o (Kaiz API) Error:', error.message);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};