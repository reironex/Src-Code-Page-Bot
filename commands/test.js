const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ytsr = require('@distube/ytsr');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

const API_BASE = 'https://p.oceansaver.in/ajax/download.php';
const API_KEY = 'dfcb6d76f2f6a9894gjkege8a4ab232222';

module.exports = {
  name: 'test',
  description: 'Searches YouTube and uploads MP3 as audio.',
  usage: '-ytmusic <song>',
  author: 'coffee',

  async execute(id, args, token) {
    if (!args[0]) return sendMessage(id, { text: 'Please provide a song title.' }, token);

    const result = (await ytsr(`${args.join(' ')} official music video`, { limit: 1 })).items[0];
    if (!result?.url) return sendMessage(id, { text: 'Could not find the song.' }, token);

    try {
      // Get the MP3 download info
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
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.8'
        }
      });

      const mp3Url = data?.progress_url;
      const title = data?.title || result.title;
      const thumb = data?.info?.image || result.bestThumbnail?.url;

      if (!mp3Url) return sendMessage(id, { text: 'MP3 link not found.' }, token);

      // Download MP3 to a temporary file
      const tempPath = path.join(__dirname, `../temp/${Date.now()}.mp3`);
      const writer = fs.createWriteStream(tempPath);

      const mp3Stream = await axios.get(mp3Url, { responseType: 'stream' });
      mp3Stream.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Upload to Facebook
      const form = new FormData();
      form.append('message', title);
      form.append('filedata', fs.createReadStream(tempPath), {
        filename: `${title}.mp3`,
        contentType: 'audio/mpeg'
      });

      const upload = await axios.post(
        `https://graph.facebook.com/v18.0/me/messages`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${token}`
          },
          params: { recipient: JSON.stringify({ id }) }
        }
      );

      // Cleanup
      fs.unlink(tempPath, () => {});

      // Optional: Send preview card
      await sendMessage(id, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: `🎧 ${title}`,
              image_url: thumb,
              subtitle: `Uploaded as MP3`
            }]
          }
        }
      }, token);

    } catch (err) {
      console.error(err?.response?.data || err.message);
      return sendMessage(id, { text: 'Something went wrong while sending the MP3.' }, token);
    }
  }
};