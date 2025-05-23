const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'pinterest',
  description: 'Get Pinterest images by keyword.',
  usage: 'pinterest <search> [count]',
  author: 'Coffee',

  async execute(senderId, args, pageAccessToken) {
    const input = args.join(' ');

    // Extract search term and optional number (with or without dash/space)
    const match = input.match(/^(.+?)[-\s]?(\d+)?$/i);
    if (!match) {
      return sendMessage(senderId, { text: 'Please provide a valid search term.' }, pageAccessToken);
    }

    const searchQuery = match[1].trim();
    let count = match[2] ? parseInt(match[2], 10) : 5;
    count = Math.min(Math.max(count, 1), 20); // limit between 1 and 20

    try {
      const res = await axios.get(`https://orc-six.vercel.app/pinterest?search=${encodeURIComponent(searchQuery)}`);
      const images = Array.isArray(res.data?.data) ? [...new Set(res.data.data)] : [];

      if (!images.length) {
        return sendMessage(senderId, { text: 'No results found.' }, pageAccessToken);
      }

      // Send images one by one
      for (const url of images.slice(0, count)) {
        await sendMessage(senderId, { attachment: { type: 'image', payload: { url } } }, pageAccessToken);
      }
    } catch (error) {
      console.error('[Pinterest Error]', error.message);
      sendMessage(senderId, { text: 'Error fetching Pinterest images.' }, pageAccessToken);
    }
  }
};