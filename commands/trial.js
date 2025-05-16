const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Function to get the image URL from a Facebook Messenger event
const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid;
  if (!mid) return null;
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v21.0/${mid}/attachments`, {
      params: { access_token: token }
    });
    return data?.data?.[0]?.image_data?.url || null;
  } catch (err) {
    console.error("Image URL fetch error:", err);
    return null;
  }
};

module.exports = {
  name: 'geturl',
  description: 'Fetch image URL from a replied image message.',
  usage: '-geturl (use by replying to an image)',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken, event) {
    try {
      const imageUrl = await getImageUrl(event, pageAccessToken);
      const message = imageUrl 
        ? `📷 | 𝐈𝐦𝐚𝐠𝐞 𝐔𝐑𝐋:\n${imageUrl}` 
        : 'No image found in the reply.';
      await sendMessage(senderId, { text: message }, pageAccessToken);
    } catch (error) {
      console.error('Error retrieving image URL:', error);
      await sendMessage(senderId, { text: 'Error retrieving image URL.' }, pageAccessToken);
    }
  },
};
