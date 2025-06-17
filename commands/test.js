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
          'accept': 'image/*'
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