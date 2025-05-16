const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid;
  if (!mid) return null;
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });
    return data?.data?.[0]?.image_data?.url || null;
  } catch (err) {
    console.error("Image URL fetch error:", err);
    return null;
  }
};

module.exports = {
  name: 'trial',
  description: 'Return the image URL from a replied image message',
  author: 'Tester',

  async execute(senderId, args, pageAccessToken, event) {
    const imageUrl = await getImageUrl(event, pageAccessToken);

    if (imageUrl) {
      await sendMessage(senderId, { text: `Image URL: ${imageUrl}` }, pageAccessToken);
    } else {
      await sendMessage(senderId, { text: "No image URL found. Make sure you reply to an image message." }, pageAccessToken);
    }
  }
};