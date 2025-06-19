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
  description: 'Searches YouTube for a song and uploads MP3 audio.',
  usage: '-ytmusic <song name>',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    if (!args.length) {
      return sendMessage(senderId, { text: '❎ | Please provide a song title.' }, pageAccessToken);
    }

    const query = args.join(' ') + ' official music video';
    const result = (await ytsr(query, { limit: 1 })).items[0];
    if (!result?.url) {
      return sendMessage(senderId, { text: '❎ | Could not find the song.' }, pageAccessToken);
    }

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

      const mp3Url = data?.progress_url;
      const title = data?.title || result.title;
      const thumb = data?.info?.image || result.bestThumbnail?.url;

      if (!mp3Url) {
        return sendMessage(senderId, { text: '❎ | MP3 download link not found.' }, pageAccessToken);
      }

      // Download the MP3
      const buffer = (await axios.get(mp3Url, { responseType: 'arraybuffer' })).data;
      const tempPath = path.join(__dirname, 'tmp.mp3');
      fs.writeFileSync(tempPath, Buffer.from(buffer));

      // Upload MP3 to Facebook
      const form = new FormData();
      form.append('message', JSON.stringify({ attachment: { type: 'audio', payload: { is_reusable: true } } }));
      form.append('filedata', fs.createReadStream(tempPath));

      const upload = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${pageAccessToken}`,
        form,
        { headers: form.getHeaders() }
      );

      const attachmentId = upload.data.attachment_id;

      // Send audio with preview
      await sendMessage(senderId, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: `🎧 Title: ${title}`,
              image_url: thumb,
              subtitle: 'MP3 from YouTube'
            }]
          }
        }
      }, pageAccessToken);

      await axios.post(`https://graph.facebook.com/v22.0/me/messages?access_token=${pageAccessToken}`, {
        recipient: { id: senderId },
        message: { attachment: { type: 'audio', payload: { attachment_id: attachmentId } } }
      });

      fs.unlinkSync(tempPath);

    } catch (e) {
      console.error('YTMUSIC ERROR:', e.message);
      return sendMessage(senderId, { text: '❎ | Failed to download or send MP3.' }, pageAccessToken);
    }
  }
};