const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

// Import SDKs (make sure these packages are installed)
const { fireworks } = require('@ai-sdk/fireworks');
const { experimental_generateImage: generateImage } = require('ai');

module.exports = {
  name: 'test',
  description: 'Generate images via prompt using the Flux model.',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt for image generation.' }, pageAccessToken);
    }

    const prompt = args.join(' ').trim();

    try {
      // Step 1: Generate image
      const { image } = await generateImage({
        model: fireworks.image('accounts/fireworks/models/flux-1-dev-fp8'),
        prompt,
      });

      // Step 2: Save image to file
      const filename = path.join(__dirname, `tmp-${Date.now()}.jpg`);
      fs.writeFileSync(filename, image.uint8Array);

      // Step 3: Upload to Facebook
      const form = new FormData();
      form.append('message', JSON.stringify({
        attachment: {
          type: 'image',
          payload: { is_reusable: true }
        }
      }));
      form.append('filedata', fs.createReadStream(filename));

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${pageAccessToken}`,
        form,
        { headers: form.getHeaders() }
      );

      const attachmentId = uploadRes.data.attachment_id;

      // Step 4: Send image to user via attachment ID
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

      // Step 5: Clean up
      fs.unlinkSync(filename);

    } catch (err) {
      console.error('ImageGen Error:', err.response?.data || err.message || err);
      return sendMessage(senderId, { text: '❎ | Failed to generate image. Please try again later.' }, pageAccessToken);
    }
  }
};