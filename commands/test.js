const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const GEMINI_API_KEY = Buffer.from(
  'QUl6YVN5QW93cTVwbWRYVjhHWjR4SnJHS1NnanNRUTNEczQ4RGxn',
  'base64'
).toString('utf8');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    return data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

module.exports = {
  name: 'test',
  description: 'Ask Gemini (with optional image).',
  usage: '\ngemini [question] (reply to an image)',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    const prompt = args.join(' ').trim();
    if (!prompt) {
      return sendMessage(senderId, { text: "Ask me something!" }, pageAccessToken);
    }

    const imageUrl = await getImageUrl(event, pageAccessToken);

    let imagePart = null;
    if (imageUrl) {
      try {
        const imgResp = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const base64 = Buffer.from(imgResp.data, 'binary').toString('base64');
        const mimeType = imgResp.headers['content-type'];
        imagePart = {
          inline_data: {
            mimeType,
            data: base64,
          },
        };
      } catch (err) {
        console.error("Image download error:", err.message);
        return sendMessage(senderId, { text: "Failed to process the image." }, pageAccessToken);
      }
    }

    const contents = [
      {
        parts: imagePart
          ? [{ text: prompt }, imagePart]
          : [{ text: prompt }],
      },
    ];

    try {
      const { data } = await axios.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-pro-vision:generateContent?key=${GEMINI_API_KEY}`,
        { contents },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      sendMessage(senderId, {
        text: reply ? `🤖 Gemini says:\n\n${reply}` : "No reply received."
      }, pageAccessToken);
    } catch (err) {
      console.error("Gemini API Error:", err?.response?.data || err.message);
      sendMessage(senderId, { text: "Failed to get a response from Gemini." }, pageAccessToken);
    }
  }
};