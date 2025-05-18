const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Interact with Chipp AI.',
  usage: '\ntest [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event) return sendMessage(senderId, { text: "Error: Unable to process the request." }, pageAccessToken);
    await handleQuestion(senderId, args.join(' '), pageAccessToken);
  }
};

async function handleQuestion(senderId, prompt, pageAccessToken) {
  if (!prompt) return sendMessage(senderId, { text: "I'm here to help! Please ask a question." }, pageAccessToken);

  try {
    const { data } = await axios.post(
      'https://app.chipp.ai/api/v1/chat/completions',
      {
        model: 'kh-67586',
        messages: [{ role: 'user', content: prompt }],
        stream: false
      },
      {
        headers: {
          'Authorization': 'Bearer live_34456586-aa0b-48f2-b476-a4313ee42fc7',
          'Content-Type': 'application/json'
        }
      }
    );

    // Check for tool calls in the response
    if (data.toolCalls && data.toolCalls.length > 0) {
      for (const toolCall of data.toolCalls) {
        if (toolCall.toolName === 'generateImage' && toolCall.result) {
          const imageUrlMatch = toolCall.result.match(/(https?:\/\/[^\s)]+)/);
          if (imageUrlMatch && imageUrlMatch[1]) {
            await sendMessage(senderId, {
              attachment: {
                type: 'image',
                payload: { url: imageUrlMatch[1] }
              }
            }, pageAccessToken);
            return;
          }
        }
        if (toolCall.toolName === 'browseWeb' && toolCall.result) {
          const finalAnswer = data.choices?.[0]?.message?.content;
          if (finalAnswer) {
            await sendMessage(senderId, { text: finalAnswer }, pageAccessToken);
            return;
          }
        }
        if (toolCall.toolName === 'analyzeImage' && toolCall.result) {
          // toolCall.result is the analysis text of the image
          await sendMessage(senderId, { text: toolCall.result }, pageAccessToken);
          return;
        }
      }
    }

    // If no tool calls or unrecognized tool, send normal text response
    const response = formatResponse(data.choices?.[0]?.message?.content || 'No reply.');
    await sendMessage(senderId, { text: response }, pageAccessToken);

  } catch (err) {
    console.error('Chipp AI error:', err?.response?.data || err.message);
    await sendMessage(senderId, { text: "Error: Unable to process your question." }, pageAccessToken);
  }
}

const formatResponse = content =>
  `💬 | 𝙲𝚑𝚒𝚙𝚙 𝙰𝚒\n・────────────・\n${content}\n・──── >ᴗ< ─────・`;