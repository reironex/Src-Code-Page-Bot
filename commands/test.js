const axios = require('axios');
const ytsr = require('@distube/ytsr');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

const API_BASE = 'https://p.oceansaver.in/ajax/download.php';
const API_KEY = 'dfcb6d76f2f6a9894gjkege8a4ab232222';
const TEMP_DIR = path.join(__dirname, '..', 'temp');

module.exports = {
  name: 'test',
  description: 'Searches YouTube and sends a downloadable MP3 as a Facebook audio attachment.',
  usage: '-ytmusic <song name>',
  author: 'coffee',

  async execute(id, args, token) {
    if (!args[0]) {
      return sendMessage(id, { text: 'Error: Please provide a song title.' }, token);
    }

    // Step 1: YouTube search
    const result = (await ytsr(`${args.join(' ')} official music video`, { limit: 1 })).items[0];
    if (!result?.url) return sendMessage(id, { text: 'Error: Could not find the song.' }, token);

    try {
      // Step 2: Get MP3 link from Oceansaver
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

      if (!mp3Url) return sendMessage(id, { text: 'Error: MP3 not available.' }, token);

      // Step 3: Ensure temp directory exists
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
      }

      // Step 4: Download MP3 to temp folder
      const filePath = path.join(TEMP_DIR, `${Date.now()}.mp3`);
      const writer = fs.createWriteStream(filePath);

      const mp3Stream = await axios.get(mp3Url, { responseType: 'stream' });
      await new Promise((resolve, reject) => {
        mp3Stream.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Step 5: Upload to Facebook
      const form = new FormData();
      form.append('message', '');
      form.append('filedata', fs.createReadStream(filePath));
      form.append('type', 'audio');

      const { data: uploadRes } = await axios.post(
        `https://graph.facebook.com/v19.0/me/message_attachments?access_token=${token}`,
        form,
        { headers: form.getHeaders() }
      );

      const attachmentId = uploadRes.attachment_id;
      fs.unlinkSync(filePath); // cleanup temp file

      if (!attachmentId) throw new Error('Attachment ID missing');

      // Step 6: Send preview + audio
      await sendMessage(id, {
        attachment: {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: `🎧 Title: ${title}`,
              image_url: thumb,
              subtitle: 'Now playing from YouTube'
            }]
          }
        }
      }, token);

      await sendMessage(id, {
        attachment: {
          type: 'audio',
          payload: { attachment_id: attachmentId }
        }
      }, token);

    } catch (err) {
      console.error(err?.response?.data || err.message);
      return sendMessage(id, { text: 'Error: Unable to fetch and send the audio.' }, token);
    }
  }
};