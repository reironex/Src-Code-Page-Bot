const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

const KAIZEN_API = 'https://kaiz-apis.gleeze.com/api/flux-realtime';
const KAIZEN_API_KEY = 'b59784be-020d-4a15-bb50-3cfb0f1ae5b0';

module.exports = {
  name: 'test',
  description: 'Generate images via prompt using the Flux model.',
  usage: '-imagegen [prompt]',
  author: 'Kaizenji',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt for image generation.' }, pageAccessToken);
    }

    const prompt = args.join(' ').trim();

    try {
      // Step 1: Request image URL
      const res = await axios.get(KAIZEN_API, {
        params: { prompt, stream: 'false', apikey: KAIZEN_API_KEY }
      });

      const imageUrl = res.data?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned from API.');
      }

      // Step 2: Download the image
      const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imgRes.data);
      const tmpPath = path.join(__dirname, 'tmp_image.webp');
      fs.writeFileSync(tmpPath, buffer);

      // Step 3: Upload to Facebook
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

      // Step 4: Send image to user
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

      fs.unlinkSync(tmpPath);
    } catch (err) {
      console.error('ImageGen Error:', err.response?.data || err.message || err);
      return sendMessage(senderId, { text: '❎ | Failed to generate image. Please try again later.' }, pageAccessToken);
    }
  }
};