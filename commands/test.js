const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
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