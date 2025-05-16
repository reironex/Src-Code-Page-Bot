const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

const imageCache = {}; // Stores last image per sender

module.exports = {
  name: 'test',
  description: 'Reply with last image URL sent by the user',
  author: 'Mocha Dev',

  async execute(senderId, args, pageAccessToken, event) {
    // If user sends an image, cache its URL
    const attachments = event?.message?.attachments;
    if (attachments?.[0]?.type === 'image') {
      const imageUrl = attachments[0].payload.url;
      imageCache[senderId] = {
        url: imageUrl,
        time: Date.now()
      };
      await sendMessage(senderId, { text: 'Image received and cached.' }, pageAccessToken);
      return;
    }

    // If user sends 'test', try to retrieve cached image
    const lastImage = imageCache[senderId]?.url;
    if (lastImage) {
      await sendMessage(senderId, { text: `Cached image URL: ${lastImage}` }, pageAccessToken);
    } else {
      await sendMessage(senderId, { text: 'No cached image found. Please send an image first.' }, pageAccessToken);
    }
  }
};