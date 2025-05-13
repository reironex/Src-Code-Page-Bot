const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../handles/sendMessage');

const tokenPath = path.resolve(__dirname, '../token.txt');
let pageAccessToken = '';

try {
  pageAccessToken = fs.readFileSync(tokenPath, 'utf8').trim();
} catch (err) {
  console.error(`Token file not found or unreadable at ${tokenPath}`);
}

module.exports = {
  name: 'pinterest',
  description: 'Search Pinterest for images.',
  usage: '-pinterest query -number',
  author: 'coffee',

  async execute(senderId, args) {
    if (!args?.length) {
      return sendMessage(senderId, { text: 'Please provide a search query.' }, pageAccessToken);
    }

    const input = args.join(' ');
    const match = input.match(/(.+?)(?:\s*-\s*(\d+))?$/);
    const searchQuery = match?.[1]?.trim();
    let imageCount = parseInt(match?.[2], 10) || 5;

    if (!searchQuery) {
      return sendMessage(senderId, { text: 'Invalid search query.' }, pageAccessToken);
    }

    imageCount = Math.max(1, Math.min(imageCount, 20));

    try {
      const response = await axios.get('https://hiroshi-api.onrender.com/image/pinterest', {
        params: { search: searchQuery },
        timeout: 10000
      });

      const images = Array.isArray(response.data?.data) ? response.data.data.slice(0, imageCount) : [];

      if (!images.length) {
        return sendMessage(senderId, { text: `No images found for "${searchQuery}".` }, pageAccessToken);
      }

      for (const url of images) {
        await sendMessage(senderId, {
          attachment: {
            type: 'image',
            payload: { url }
          }
        }, pageAccessToken);
      }
    } catch (error) {
      console.error('Pinterest Fetch Error:', error?.response?.data || error.message);
      await sendMessage(senderId, { text: 'Error: Could not fetch images. Please try again later.' }, pageAccessToken);
    }
  }
};