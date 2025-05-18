const axios = require('axios');

module.exports = {
  name: 'chipp',
  description: 'Interact with Chipp AI sending only the latest prompt.',
  usage: '\nchipp [your message]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    const prompt = args.join(' ').trim();
    if (!prompt) return sendMessage(senderId, { text: "Please enter a message." }, pageAccessToken);

    try {
      // Send only the latest user message as the conversation
      const response = await callChippAI([{ role: 'user', content: prompt }]);

      if (!response || !response.messages) {
        console.error("No assistant reply found");
        return sendMessage(senderId, { text: "No reply from assistant." }, pageAccessToken);
      }

      const lastMsg = response.messages[response.messages.length - 1];

      // Check if the assistant sent any tool results like images
      if (lastMsg.toolInvocations && lastMsg.toolInvocations.length) {
        for (const toolCall of lastMsg.toolInvocations) {
          if (toolCall.toolName === 'generateImage' && toolCall.state === 'result' && toolCall.result?.imageUrl) {
            await sendMessage(senderId, { image: { url: toolCall.result.imageUrl } }, pageAccessToken);
            return;
          }
          // Add other tool handling if needed here
        }
      }

      // Otherwise send text reply
      const textReply = lastMsg.content || "No content from assistant.";
      await sendMessage(senderId, { text: textReply }, pageAccessToken);

    } catch (error) {
      console.error("Chipp AI call failed:", error?.response?.data || error.message);
      await sendMessage(senderId, { text: "Failed to contact Chipp AI." }, pageAccessToken);
    }
  }
};

async function callChippAI(messages) {
  const headers = {
    ':authority': 'app.chipp.ai',
    'content-type': 'application/json',
    'sec-ch-ua-platform': '"Android"',
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
    'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    'sec-ch-ua-mobile': '?1',
    'accept': '*/*',
    'sec-gpc': '1',
    'accept-language': 'en-US,en;q=0.5',
    'origin': 'https://app.chipp.ai',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-mode': 'cors',
    'sec-fetch-dest': 'empty',
    'referer': 'https://app.chipp.ai/app_builder/67586/build?cacheBust=1747590080994',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'cookie': '__Host-next-auth.csrf-token=your_token_here; __Secure-next-auth.callback-url=https%3A%2F%2Fapp.chipp.ai; chatSessionId_67586=some_id; __Secure-next-auth.session-token=your_session_token; correlationId=your_correlation_id',
    'priority': 'u=1, i'
  };

  const payload = { messages };

  const { data } = await axios.post('https://app.chipp.ai/api/chat', payload, { headers });
  return data;
}

async function sendMessage(senderId, messagePayload, pageAccessToken) {
  // Your implementation to send message to user here
  console.log(`Sending to ${senderId}:`, messagePayload);
}