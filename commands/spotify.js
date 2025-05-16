const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'spotify',
  description: 'Search and share a Spotify track.',
  usage: 'spotify [song name]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    try {
      const query = encodeURIComponent(args.join(' '));
      const { data } = await axios.get(`https://kaiz-apis.gleeze.com/api/spotify-search?q=${query}`);

      if (!Array.isArray(data) || data.length === 0) {
        return sendMessage(senderId, { text: 'No tracks found for that search.' }, pageAccessToken);
      }

      const top = data[0];

      // Send generic template with image and title (no buttons, no default action)
      const templateMessage = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: top.title,
                image_url: top.thumbnail,
                subtitle: `By ${top.author} | ${top.duration} | Released: ${top.release_date}`
              }
            ]
          }
        }
      };

      // Send the template first
      await sendMessage(senderId, templateMessage, pageAccessToken);

      // Send the audio attachment (note: Messenger will only play real audio files)
      await sendMessage(senderId, {
        attachment: {
          type: 'audio',
          payload: {
            url: top.trackUrl,
            is_reusable: true
          }
        }
      }, pageAccessToken);

    } catch (error) {
      sendMessage(senderId, { text: 'Sorry, there was an error processing your request.' }, pageAccessToken);
    }
  }
};