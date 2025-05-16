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
      const message = {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [
              {
                title: `${top.title} (${top.duration})`,
                image_url: top.thumbnail,
                subtitle: `By ${top.author} | Released: ${top.release_date}`,
                default_action: {
                  type: 'web_url',
                  url: top.trackUrl,
                  webview_height_ratio: 'tall'
                },
                buttons: [
                  {
                    type: 'web_url',
                    url: top.trackUrl,
                    title: 'Listen on Spotify'
                  }
                ]
              }
            ]
          }
        }
      };

      sendMessage(senderId, message, pageAccessToken);
    } catch (error) {
      sendMessage(senderId, { text: 'Sorry, there was an error processing your request.' }, pageAccessToken);
    }
  }
};