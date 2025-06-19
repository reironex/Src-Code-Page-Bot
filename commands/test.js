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
  description: 'Searches YouTube and sends MP3 as a Facebook audio attachment.',
  usage: '-ytmusic <song name>',
  author: 'coffee',

  async execute(id, args, token) {
    if (!args[0]) return sendMessage(id, { text: '❌ Please provide a song title.' }, token);

    // Step 1: Search YouTube
    const result = (await ytsr(`${args.join(' ')} official music video`, { limit: 1 })).items[0];
    if (!result?.url) return sendMessage(id, { text: '❌ Could not find that song.' }, token);

    // Step 2: Get MP3 info from oceansaver
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
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10)',
          'Accept': '*/*',
          'Accept-Language': 'en-US,en;q=0.8'
        }
      });

      const mp3url = data?.progress_url;
      const title = data?.title || result.title;
      const thumb = data?.info?.image || result.bestThumbnail?.url;

      if (!mp3url) return sendMessage(id, { text: '❌ MP3 download link missing.' }, token);

      // Step 3: Download MP3 to temp file
      const mp3 = await axios.get(mp3url, { responseType: 'arraybuffer' });
      const filePath = path.join(__dirname, 'temp.mp3');
      fs.writeFileSync(filePath, mp3.data);

      // Step 4: Upload MP3 to Facebook
      const form = new FormData();
      form.append('message', JSON.stringify({ attachment: { type: 'audio', payload: { is_reusable: true } } }));
      form.append('filedata', fs.createReadStream(filePath));

      const upload = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${token}`,
        form, { headers: form.getHeaders() }
      );

      const attachmentId = upload.data.attachment_id;

      // Step 5: Send preview + MP3
      await sendMessage(id, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: `🎧 ${title}`,
              image_url: thumb,
              subtitle: `Audio will follow below.`
            }]
          }
        }
      }, token);

      await sendMessage(id, {
        message: {
          attachment: {
            type: 'audio',
            payload: { attachment_id: attachmentId }
          }
        }
      }, token);

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('ytmusic error:', err.message);
      return sendMessage(id, { text: '❎ Failed to fetch or send audio.' }, token);
    }
  }
};