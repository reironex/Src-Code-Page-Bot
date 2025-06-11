const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Ask Blackbox AI a question.',
  usage: '\nblackbox [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event) return sendMessage(senderId, { text: "Something went wrong." }, pageAccessToken);

    const prompt = args.join(' ');
    if (!prompt) return sendMessage(senderId, { text: "Ask me something!" }, pageAccessToken);

    const payload = {
      messages: [
        { role: 'user', content: prompt, id: senderId }
      ],
      id: senderId,
      previewToken: null,
      userId: null,
      codeModelMode: true,
      trendingAgentMode: {},
      isMicMode: false,
      userSystemPrompt: null,
      maxTokens: 1024,
      isChromeExt: false,
      githubToken: '',
      clickedAnswer2: false,
      clickedAnswer3: false,
      clickedForceWebSearch: false,
      visitFromDelta: false,
      isMemoryEnabled: false,
      mobileClient: false,
      userSelectedModel: null,
      validated: '00f37b34-a166-4efb-bce5-1312d87f2f94',
      imageGenerationMode: false,
      imageGenMode: 'autoMode',
      webSearchModePrompt: false,
      deepSearchMode: false,
      domains: null,
      vscodeClient: false,
      codeInterpreterMode: false,
      customProfile: {
        name: '',
        occupation: '',
        traits: [],
        additionalInfo: '',
        enableNewChats: false
      },
      webSearchModeOption: {
        autoMode: true,
        webMode: false,
        offlineMode: false
      },
      session: null,
      isPremium: false,
      subscriptionCache: null,
      beastMode: false,
      reasoningMode: false,
      designerMode: false,
      workspaceId: '',
      asyncMode: false,
      isTaskPersistent: false
    };

    try {
      const { data } = await axios.post('https://www.blackbox.ai/api/chat', payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
          'Origin': 'https://www.blackbox.ai',
          'Referer': `https://www.blackbox.ai/chat/${senderId}`,
          'Cookie': 'sessionId=336f68f2-86a9-4653-a5b5-b26e4c5f04d1',
          'Accept': '*/*'
        }
      });

      sendMessage(senderId, { text: `🧠 Blackbox AI\n\n${data}` }, pageAccessToken);
    } catch (err) {
      console.error(err?.response?.data || err.message);
      sendMessage(senderId, { text: "Blackbox AI failed to respond." }, pageAccessToken);
    }
  }
};