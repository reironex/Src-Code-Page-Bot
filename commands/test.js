const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

const API_URL = 'https://sdxl-backend-dev.mangoocean-22f78810.switzerlandnorth.azurecontainerapps.io/predict/generate';
const BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJlLmNhcHVjY2lub0B5YW5kZXguY29tIn0.NsoOAF-GkxJEYhEKT3WAeewWgAIn61FSqtMONnYumgs';

module.exports = {
  name: 'test',
  description: 'Generate image using MangoOcean SDXL backend.',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt for image generation.' }, pageAccessToken);
    }

    const prompt = args.join(' ').trim();

    try {
      // Step 1: Request image generation
      const genRes = await axios.post(API_URL, {
        promptInput: {
          prompt_positive: prompt,
          style_code: 'sd35-large-turbo',
          format_code: 'square',
          batch_nbr: 1
        },
        config: { is_default: true }
      }, {
        headers: {
          'Authorization': `Bearer ${BEARER_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://gen-image.com'
        }
      });

      const imageUrl = genRes.data?.output_url;
      if (!imageUrl) {
        throw new Error('Image URL not returned.');
      }

      // Step 2: Download the image
      const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imageRes.data);
      const tmpPath = path.join(__dirname, `mango_image_${Date.now()}.webp`);
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

      // Step 4: Send to user
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
      console.error('MangoOcean ImageGen Error:', err.response?.data || err.message || err);
      return sendMessage(senderId, { text: '❎ | Failed to generate image. Please try again later.' }, pageAccessToken);
    }
  }
};