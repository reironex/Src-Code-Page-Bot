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
          'accept': '*/*',
          'cookie': [
            'render_app_version_affinity=dep-d149ps15pdvs73bbcn30',
            'sessionId=336f68f2-86a9-4653-a5b5-b26e4c5f04d1',
            'intercom-id-x55eda6t=aab4d07b-a6b8-4f3a-8177-c77e6bc7c4bb',
            'intercom-device-id-x55eda6t=7e3922c6-d977-4e5a-a857-4376589d4bec',
            '__Host-authjs.csrf-token=26ea109817a3a4670b17e20d689ddf15bd590f3d4c63e7e729b27680c548b7d5%7Cd7375ff6e111430dfc88d13771a179866975e5f822eb64e5d843f0cd2abb9820',
            '__Secure-authjs.callback-url=https%3A%2F%2Fwww.blackbox.ai'
          ].join('; ')
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