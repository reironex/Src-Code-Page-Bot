const { sendMessage } = require('../handles/sendMessage');  
const Genius = require("genius-lyrics");  
const Client = new Genius.Client("3GEwVjDlZoyhjY_vyrB-vjOpAI3-tEgnyQK2ideAf-YBIPIGKLRwHK6sRJ8aQ7Eq");

module.exports = {
  name: 'lyrics',
  description: 'Fetch song lyrics',
  usage: '-lyrics <song name>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please send the song name.\nExample: -lyrics Faded' }, pageAccessToken);
    }

    await fetchLyrics(senderId, args.join(' '), pageAccessToken);
  }
};

const fetchLyrics = async (senderId, songName, pageAccessToken) => {
  try {
    // Search for the song
    const searches = await Client.songs.search(songName);
    if (!searches.length) {
      return sendMessage(senderId, { text: 'Error: No matching song found.' }, pageAccessToken);
    }

    // Get the first result
    const firstSong = searches[0];

    let lyrics;
    try {
      lyrics = await firstSong.lyrics();
    } catch (err) {
      return sendMessage(senderId, { text: 'Error: Could not extract lyrics. Genius may have blocked access.' }, pageAccessToken);
    }

    // Send Title, Artist, and Image as a generic template
    await sendMessage(senderId, {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: `🎧 | 𝐓𝐢𝐭𝐥𝐞: ${firstSong.title}`,
            subtitle: `🎙️ | 𝐀𝐫𝐭𝐢𝐬𝐭: ${firstSong.artist.name}`,
            image_url: firstSong.thumbnail,
          }]
        }
      }
    }, pageAccessToken);

    // Send lyrics in chunks
    await sendInChunks(senderId, lyrics, pageAccessToken);
  } catch (error) {
    console.error('Error fetching lyrics:', error.message);
    sendMessage(senderId, { text: 'Error: Unable to fetch lyrics. Please try again later.' }, pageAccessToken);
  }
};

// Sends text in chunks if it exceeds the max length
const sendInChunks = async (senderId, text, pageAccessToken, maxLength = 1900) => {
  for (let i = 0; i < text.length; i += maxLength) {
    await sendMessage(senderId, { text: text.slice(i, i + maxLength) }, pageAccessToken);
  }
};