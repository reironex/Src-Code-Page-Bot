const axios = require('axios');
const ytsr = require('@distube/ytsr');
const { sendMessage } = require('../handles/sendMessage');

const API_BASE = 'https://p.oceansaver.in/ajax/download.php';
const API_KEY = 'dfcb6d76f2f6a9894gjkege8a4ab232222';

module.exports = {
  name: 'test',
  description: 'Searches YouTube for a song and returns the MP3 audio.',
  usage: '-ytmusic <song name>',
  author: 'coffee',

  async execute(id, args, token) {
    if (!args[0]) {
      return sendMessage(id, { text: 'Error: Please provide a song title.' }, token);
    }

    // Step 1: Search on YouTube
    const result = (await ytsr(`${args.join(' ')} official music video`, { limit: 1 })).items[0];
    if (!result?.url) {
      return sendMessage(id, { text: 'Error: Could not find the song.' }, token);
    }

    // Step 2: Call Oceansaver API
    try {
      const { data } = await axios.get(API_BASE, {
        params: {
          copyright: 0,
          format: 'mp3',
          url: result.url,
          api: API_KEY
        },
        headers: {
          'Referer': 'https://loader.fo/',
          'Origin': 'https://loader.fo/',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.8'
        }
      });

      const mp3 = data?.progress_url;
      const title = data?.title || result.title;
      const thumb = data?.info?.image || result.bestThumbnail?.url;

      if (!mp3) {
        return sendMessage(id, { text: 'Error: MP3 link not found.' }, token);
      }

      // Step 3: Send info preview
      await sendMessage(id, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: `🎧 Title: ${title}`,
              image_url: thumb,
              subtitle: `From YouTube`,
              buttons: [{
                type: 'web_url',
                url: mp3,
                title: '🔊 Listen'
              }]
            }]
          }
        }
      }, token);

      // Step 4: Send audio directly
      await sendMessage(id, {
        attachment: {
          type: 'audio',
          payload: { url: mp3 }
        }
      }, token);

    } catch (err) {
      console.error(err?.response?.data || err.message);
      return sendMessage(id, { text: 'Error: Failed to fetch download link.' }, token);
    }
  }
};