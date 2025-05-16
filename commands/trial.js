const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    const url = data?.data?.[0]?.image_data?.url ||
                data?.data?.[0]?.file_url ||
                data?.data?.[0]?.payload?.url ||
                null;

    if (!url) {
      console.log("Attachment fetch result:", JSON.stringify(data, null, 2));
    }

    return url;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

module.exports = {
  name: 'trial',
  description: 'Fetch and display image URL from a replied message',
  author: 'Tester',

  async execute(senderId, args, pageAccessToken, event) {
    const imageUrl = await getImageUrl(event, pageAccessToken);

    if (imageUrl) {
      await sendMessage(senderId, { text: `Image URL: ${imageUrl}` }, pageAccessToken);
    } else {
      await sendMessage(senderId, { text: "No image found in the replied message." }, pageAccessToken);
    }
  }
};