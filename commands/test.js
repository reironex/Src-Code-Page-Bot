const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../handles/sendMessage');

const HUGGINGFACE_API_KEY = Buffer.from('aGZfVXNLU0lURXlnZ1hBTlJSdWR5RHhqQ2dxWVdtRHdPSUdnUg==', 'base64').toString('utf-8');

module.exports = {
  name: 'test',
  description: 'Generate images via prompt using Hugging Face Stable Diffusion.',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt for image generation.' }, pageAccessToken);
    }

    const prompt = args.join(' ').trim();
    const tmpFilePath = path.join(__dirname, 'tmp_image.png');

    try {
      await sendMessage(senderId, { text: '🧠 Generating your image... please wait a few seconds.' }, pageAccessToken);

      const { data } = await axios.post(
        'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-2',
        { inputs: prompt },
        {
          headers: {
            Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
            Accept: 'image/png'
          },
          responseType: 'arraybuffer'
        }
      );

      fs.writeFileSync(tmpFilePath, Buffer.from(data));

      const form = new FormData();
      form.append('message', JSON.stringify({
        attachment: {
          type: 'image',
          payload: { is_reusable: true }
        }
      }));
      form.append('filedata', fs.createReadStream(tmpFilePath));

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${pageAccessToken}`,
        form,
        { headers: form.getHeaders() }
      );

      const attachmentId = uploadRes.data.attachment_id;

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
    } catch (err) {
      console.error('ImageGen Error:', err.response?.data || err.message || err);
      return sendMessage(senderId, { text: '❎ | Failed to generate image. Try again later.' }, pageAccessToken);
    } finally {
      if (fs.existsSync(tmpFilePath)) fs.unlinkSync(tmpFilePath);
    }
  }
};