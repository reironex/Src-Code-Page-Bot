const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Generate image using Pollinations Flux model.',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt for image generation.' }, pageAccessToken);
    }

    const prompt = encodeURIComponent(args.join(' ').trim());
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${prompt}?model=flux&width=1024&height=1024&nologo=true&private=false&enhance=false&safe=false&referrer=sec${seed}&seed=${seed}`;

    try {
      // Step 1: Download the image
      const imageRes = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'accept': 'application/json, text/plain, */*',
          'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
          'origin': 'https://827e3247e183969c5f8c06b88c48dd73.perchance.org',
          'referer': 'https://827e3247e183969c5f8c06b88c48dd73.perchance.org',
          'sec-ch-ua': '"Brave";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
          'sec-ch-ua-mobile': '?1',
          'sec-ch-ua-platform': '"Android"',
          'sec-gpc': '1',
          'accept-language': 'en-US,en;q=0.8',
          'accept-encoding': 'gzip, deflate, br, zstd',
          'sec-fetch-site': 'cross-site',
          'sec-fetch-mode': 'cors',
          'sec-fetch-dest': 'empty'
        }
      });

      const buffer = Buffer.from(imageRes.data);
      const tmpPath = path.join(__dirname, `pollinations_image_${Date.now()}.jpg`);
      fs.writeFileSync(tmpPath, buffer);

      // Step 2: Upload to Facebook
      const form = new FormData();
      form.append('message', JSON.stringify({
        attachment: {
          type: 'image',
          payload: { is_reusable: true }
        }
      }));
      form.append('filedata', fs.createReadStream(tmpPath));

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${pageAccessToken}`,
        form,
        { headers: form.getHeaders() }
      );

      const attachmentId = uploadRes.data.attachment_id;

      // Step 3: Send the image to the user
      await axios.post(
        `https://graph.facebook.com/v22.0/me/messages?access_token=${pageAccessToken}`,
        {
          recipient: { id: senderId },
          message: {
            attachment: {
              type: 'image',
              payload: { attachment_id: attachmentId }
            }
          }
        }
      );

      fs.unlinkSync(tmpPath); // Clean up temp file
    } catch (err) {
      console.error('Pollinations ImageGen Error:', err.response?.data || err.message || err);
      return sendMessage(senderId, { text: '❎ | Failed to generate image. Please try again later.' }, pageAccessToken);
    }
  }
};