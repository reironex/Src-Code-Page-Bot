const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'chipp',
  description: 'Ask Chipp AI a question or generate content',
  usage: 'chipp <prompt>',
  author: 'openai.com/chatgpt',

  async execute(message, args) {
    if (!args.length) {
      return sendMessage(message, 'Please provide a message to send to Chipp AI.');
    }

    const prompt = args.join(' ');

    try {
      const response = await axios.post(
        'https://app.chipp.ai/api/chat',
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
        },
        {
          headers: {
            'authority': 'app.chipp.ai',
            'accept': 'application/json',
            'accept-language': 'en-US,en;q=0.9',
            'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTZjY2NhZGM1ZjQ0MzY3MjY3MjRiMzMiLCJpYXQiOjE3MTU4NTcwNzUsImV4cCI6MTc0NzM5MzY3NX0.qbB9Anq0spRTrG32cgnQIdo8dNaQ4zqxtfGLilfhcag',
            'content-type': 'application/json',
            'cookie': '__Host-next-auth.csrf-token=8a72c5c0915fd76436997d5c86f2c76dfca3e6f39fa7c3ef621dbec4e58a0651%7Cea515ad8bd0b2cf5451e1bd1c671bdc6b64d09f8aeeb32a2f8c22832c2e6e730; __Secure-next-auth.session-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NTZjY2NhZGM1ZjQ0MzY3MjY3MjRiMzMiLCJpYXQiOjE3MTU4NTcwNzUsImV4cCI6MTc0NzM5MzY3NX0.qbB9Anq0spRTrG32cgnQIdo8dNaQ4zqxtfGLilfhcag',
            'origin': 'https://app.chipp.ai',
            'referer': 'https://app.chipp.ai/',
            'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            'sec-ch-ua-mobile': '?1',
            'sec-ch-ua-platform': '"Android"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; SM-A107F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
          }
        }
      );

      const data = response.data;
      const choice = data?.choices?.[0];

      if (!choice) {
        return sendMessage(message, 'No response received from Chipp AI.');
      }

      if (choice.tool_calls?.length > 0) {
        const tool = choice.tool_calls[0];
        const name = tool.toolName;
        const result = tool.result;

        if (name === 'generateImage') {
          return sendMessage(message, result?.imageUrl || 'Image URL not found.');
        }

        if (name === 'browseWeb') {
          return sendMessage(message, result?.answerBox?.answer || 'No answer found from web search.');
        }

        if (name === 'analyzeImage') {
          return sendMessage(message, result || 'Image analysis result not found.');
        }

        return sendMessage(message, `[${name}] Tool response:\n` + JSON.stringify(result, null, 2));
      }

      const text = choice.message?.content || 'No message content found.';
      return sendMessage(message, text);

    } catch (err) {
      console.error('Chipp AI Error:', err?.response?.data || err.message);
      return sendMessage(message, 'An error occurred while contacting Chipp AI.');
    }
  }
};