const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const base64Api = 'aHR0cHM6Ly9vcmMtc2l4LnZlcmNlbC5hcHAvcGludGVyZXN0P3NlYXJjaD0=';
const apiBase = Buffer.from(base64Api, 'base64').toString('utf-8');

module.exports = {
  name: 'pinterest',
  description: 'Search and Fetch Images in Pinterest.',
  usage: 'pinterest <search> [count]',
  author: 'Coffee',

  async execute(senderId, args, pageAccessToken) {
    const input = args.join(' ');
    const match = input.match(/^(.+?)[-\s]?(\d+)?$/i);
    if (!match) {
      return sendMessage(senderId, { text: 'Please provide a valid search term.' }, pageAccessToken);
    }

    const searchQuery = match[1].trim();
    let count = match[2] ? parseInt(match[2], 10) : 5;
    count = Math.min(Math.max(count, 1), 20);

    try {
      const res = await axios.get(apiBase + encodeURIComponent(searchQuery));
      const images = Array.isArray(res.data?.data) ? [...new Set(res.data.data)] : [];

      if (!images.length) {
        return sendMessage(senderId, { text: 'No results found.' }, pageAccessToken);
      }

      const shuffledImages = shuffleArray(images);
      for (const url of shuffledImages.slice(0, count)) {
        await sendMessage(senderId, { attachment: { type: 'image', payload: { url } } }, pageAccessToken);
      }
    } catch (error) {
      sendMessage(senderId, { text: 'Error fetching Pinterest images.' }, pageAccessToken);
    }
  }
};