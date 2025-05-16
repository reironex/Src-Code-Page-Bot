const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Simple hash function to convert string to numeric UID
function hashUID(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash); // Ensure it's positive
}

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
      const uid = hashUID(senderId); // Convert senderId to numeric UID
      const url = `https://kaiz-apis.gleeze.com/api/gpt-4o?ask=${encodeURIComponent(prompt)}&uid=${uid}&webSearch=off`;
      const { data } = await axios.get(url);

      if (data?.response) {
        sendMessage(senderId, { text: data.response }, pageAccessToken);
      } else {
        sendMessage(senderId, { text: 'No response received from the AI.' }, pageAccessToken);
      }
    } catch (error) {
      console.error('GPT-4o (Kaiz API) Error:', error?.response?.data || error.message);
      sendMessage(senderId, { text: 'There was an error generating the content. Please try again later.' }, pageAccessToken);
    }
  }
};