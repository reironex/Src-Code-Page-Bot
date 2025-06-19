const axios = require('axios');
const ytsr = require('@distube/ytsr');
const { sendMessage } = require('../handles/sendMessage');

const API = 'https://kaiz-apis.gleeze.com/api/ytmp3-v2';
const API_KEY = 'b59784be-020d-4a15-bb50-3cfb0f1ae5b0';

module.exports = {
  name: 'test',
  description: 'Searches for songs on YouTube and provides audio links.',
  usage: '-ytmusic <song name>',
  author: 'coffee',

  async execute(id, args, token) {
    if (!args[0]) {
      return sendMessage(id, { text: 'Error: Please provide a song title.' }, token);
    }

    // Search YouTube for song
    const result = (await ytsr(`${args.join(' ')}, official music video`, { limit: 1 })).items[0];
    if (!result?.url) {
      return sendMessage(id, { text: 'Error: Could not find the song.' }, token);
    }

    try {
      // Call the Kaizenji API
      const { data } = await axios.get(API, {
        params: {
          url: result.url,
          apikey: API_KEY
        }
      });

      if (!data?.download_url) {
        return sendMessage(id, { text: 'Error: Failed to get MP3 download link.' }, token);
      }

      // Send the song info card
      await sendMessage(id, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: `🎧 Title: ${data.title}`,
              image_url: data.thumbnail,
              subtitle: `Source: YouTube`,
              buttons: [{
                type: 'web_url',
                url: data.download_url,
                title: '🔊 Listen'
              }]
            }]
          }
        }
      }, token);

      // Send audio directly if preferred
      await sendMessage(id, {
        attachment: {
          type: 'audio',
          payload: {
            url: data.download_url
          }
        }
      }, token);

    } catch (err) {
      return sendMessage(id, { text: 'Error: API request failed or invalid response.' }, token);
    }
  }
};