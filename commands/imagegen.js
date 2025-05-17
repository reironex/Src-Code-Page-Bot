const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'imagegen',
  description: 'Generate images via prompt using the Flux model.',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt for image generation.' }, pageAccessToken);
    }

    const prompt = args.join(' ').trim();
    const endpoint = `https://kaiz-apis.gleeze.com/api/flux-realtime?prompt=${encodeURIComponent(prompt)}&stream=false`;

    try {
      const { data } = await axios.get(endpoint);

      if (!data?.url) {
        return sendMessage(senderId, { text: '❎ | No image was returned for the provided prompt.' }, pageAccessToken);
      }

      return sendMessage(senderId, {
        attachment: {
          type: 'image',
          payload: { url: data.url }
        }
      }, pageAccessToken);
    } catch (err) {
      console.error('Flux Error:', err.message || err);
      return sendMessage(senderId, { text: '❎ | Failed to generate image. Please try again later.' }, pageAccessToken);
    }
  }
};