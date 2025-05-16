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
    const response = await find({
      song: songName,
      engine: 'musixmatch',
      forceSearch: true
    });

    if (!response || !response.lyrics) {
      return sendMessage(senderId, { text: `No lyrics found for "${songName}".` }, pageAccessToken);
    }

    const { title, artist, artworkURL, lyrics } = response;

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

    const formattedLyrics = formatLyrics(lyrics);
    await sendInChunks(senderId, formattedLyrics, pageAccessToken);

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

const formatLyrics = (lyrics) => {
  const lines = lyrics
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.charAt(0).toUpperCase() + line.slice(1));

  const grouped = [];
  let currentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    currentBlock.push(lines[i]);

    const nextLineEmptyOrEnd = !lines[i + 1] || lines[i + 1] === '';
    if (nextLineEmptyOrEnd || i === lines.length - 1) {
      grouped.push(currentBlock.join('\n'));
      currentBlock = [];
    }
  }

  const counts = {};
  for (const block of grouped) {
    counts[block] = (counts[block] || 0) + 1;
  }

  let sectionIndex = 0;
  const labeled = grouped.map(block => {
    const count = counts[block];
    let label = '';

    if (count > 1) {
      if (block.length <= 300) label = '[Chorus]';
      else label = '[Verse]';
    } else {
      label = sectionIndex === grouped.length - 1 ? '[Outro]' : '[Verse]';
    }

    sectionIndex++;
    return `${label}\n${block}`;
  });

  return labeled.join('\n\n');
};