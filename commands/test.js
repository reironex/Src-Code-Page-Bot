const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    const imageUrl = data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
    return imageUrl;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

// Splits text into chunks <= 1900 characters
const chunkMessage = (text, limit = 1900) => {
  const chunks = [];
  while (text.length > 0) {
    chunks.push(text.slice(0, limit));
    text = text.slice(limit);
  }
  return chunks;
};

module.exports = {
  name: 'test',
  description: 'Ask Mocha AI anything using Kaiz API.',
  usage: '\nai [question]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    if (!event) {
      return sendMessage(senderId, { text: "Something went wrong." }, pageAccessToken);
    }

    const prompt = args.join(' ');
    if (!prompt) {
      return sendMessage(senderId, { text: "Ask me something!" }, pageAccessToken);
    }

    const imageUrl = await getImageUrl(event, pageAccessToken);

    const url = 'https://kaiz-apis.gleeze.com/api/chipp-ai';
    const params = {
      ask: prompt,
      uid: senderId,
      imageUrl: imageUrl || '',
      apikey: '66669c82-6aa6-47f2-a7ab-f285185efb65'
    };

    try {
      const { data } = await axios.get(url, { params, timeout: 10000 });
      const reply = data?.response?.trim();

      if (reply) {
        const chunks = chunkMessage(reply);
        for (let i = 0; i < chunks.length; i++) {
          const prefix = i === 0 ? "💬 Mocha AI\n\n" : '';
          await sendMessage(senderId, { text: `${prefix}${chunks[i]}` }, pageAccessToken);
        }
      } else {
        sendMessage(senderId, { text: "Mocha AI didn't return a valid response." }, pageAccessToken);
      }
    } catch (error) {
      console.error('Mocha AI API error:', error.message);
      sendMessage(senderId, { text: "Failed to get a response from Mocha AI." }, pageAccessToken);
    }
  }
};