const { sendMessage } = require('../handles/sendMessage');
const { find } = require('llyrics');

module.exports = {
  name: 'lyrics',
  description: 'Fetch song lyrics',
  usage: '-lyrics <song name>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please send the song name.\nExample: -lyrics Faded' }, pageAccessToken);
    }

    const songName = args.join(' ');
    await fetchLyrics(senderId, songName, pageAccessToken);
  }
};

const fetchLyrics = async (senderId, songName, pageAccessToken) => {
  try {
    await sendMessage(senderId, { text: `Searching for "${songName}"...` }, pageAccessToken);

    const response = await find({
      song: songName,
      engine: 'youtube', // You can change this to 'musixmatch' or 'youtube'
      forceSearch: true,
    });

    if (!response || !response.lyrics) {
      return sendMessage(senderId, { text: `No lyrics found for "${songName}".` }, pageAccessToken);
    }

    const { title, artist, artworkURL, lyrics } = response;

    // Send generic template with song info
    await sendMessage(senderId, {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: `🎧 | 𝐓𝐢𝐭𝐥𝐞: ${title}`,
            subtitle: `🎙️ | 𝐀𝐫𝐭𝐢𝐬𝐭: ${artist}`,
            image_url: artworkURL || undefined,
          }]
        }
      }
    }, pageAccessToken);

    await sendInChunks(senderId, lyrics, pageAccessToken);

  } catch (error) {
    console.error('Error fetching lyrics:', error);
    sendMessage(senderId, { text: 'Error: Unable to fetch lyrics. Please try again later.' }, pageAccessToken);
  }
};

const sendInChunks = async (senderId, text, pageAccessToken, maxLength = 1900) => {
  const chunks = text.match(new RegExp(`.{1,${maxLength}}`, 'gs')) || [];
  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? `Part ${i + 1}/${chunks.length}\n` : '';
    await sendMessage(senderId, { text: prefix + chunks[i] }, pageAccessToken);
  }
};