const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid;
  if (!mid) {
    console.log("No MID found in replied message.");
    return null;
  }

  try {
    const url = `https://graph.facebook.com/v22.0/${mid}/attachments`;
    console.log("Fetching image attachment from:", url);

    const { data } = await axios.get(url, {
      params: { access_token: token }
    });

    const imageUrl = data?.data?.[0]?.image_data?.url || null;
    console.log("Fetched image URL:", imageUrl);
    return imageUrl;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

module.exports = {
  name: 'test',
  description: 'Reply to an image message and extract its image URL',
  author: 'Mocha Dev',

  async execute(senderId, args, pageAccessToken, event) {
    console.log("Incoming event payload:");
    console.dir(event, { depth: null });

    const imageUrl = await getImageUrl(event, pageAccessToken);

    if (imageUrl) {
      await sendMessage(senderId, { text: `Image URL: ${imageUrl}` }, pageAccessToken);
    } else {
      await sendMessage(senderId, { text: "No image found in the replied message." }, pageAccessToken);
    }
  }
};