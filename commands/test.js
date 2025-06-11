const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Ask DeepSeek AI via Puter backend',
  async execute(senderId, args, pageAccessToken, event) {
    if (!event) return sendMessage(senderId, { text: "Something went wrong." }, pageAccessToken);
    
    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Ask me something!" }, pageAccessToken);

    try {
      const { data } = await axios.post('https://llm.puter.com/chat', {
        model: 'deepseek-chat',   // or 'deepseek-reasoner'
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt }
        ]
      });

      const reply = data.choices?.[0]?.message?.content || "🤔 No response.";
      sendMessage(senderId, { text: `💬 DeepSeek AI\n\n${reply}` }, pageAccessToken);
    } catch (err) {
      console.error('DeepSeek error:', err.response?.data || err.message);
      sendMessage(senderId, { text: "Failed to get a response from DeepSeek." }, pageAccessToken);
    }
  }
};