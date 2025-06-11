const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Ask a question using Blackbox AI.',
  usage: '\ntest [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event) {
      return sendMessage(senderId, { text: "Something went wrong." }, pageAccessToken);
    }

    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, { text: "Please ask something." }, pageAccessToken);
    }

    try {
      const body = {
        messages: [{ role: 'user', content: prompt, id: senderId }],
        id: senderId,
        codeModelMode: true,
        isMicMode: false,
        maxTokens: 1024,
        imageGenerationMode: false,
        imageGenMode: 'autoMode',
        deepSearchMode: false,
        userSelectedModel: null,
        validated: '00f37b34-a166-4efb-bce5-1312d87f2f94',
        webSearchModeOption: { autoMode: true, webMode: false, offlineMode: false },
        customProfile: {
          name: '',
          occupation: '',
          traits: [],
          additionalInfo: '',
          enableNewChats: false
        }
      };

      const { data } = await axios.post('https://www.blackbox.ai/api/chat', body, {
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10)',
          'origin': 'https://www.blackbox.ai',
          'referer': `https://www.blackbox.ai/chat/${senderId}`,
          'accept': '*/*'
        }
      });

      const response = data.replace(/^\$~~~\$.*?\$~~~\$\n*/s, '').trim();
      sendMessage(senderId, { text: `🧠 Blackbox AI\n\n${response}` }, pageAccessToken);
    } catch (err) {
      console.error(err?.response?.data || err.message);
      sendMessage(senderId, { text: "Failed to get a response from Blackbox AI." }, pageAccessToken);
    }
  }
};