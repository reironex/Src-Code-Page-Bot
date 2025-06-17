const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Generate image using Flux model (Pollinations)',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, token) => {
    if (!args.length) return sendMessage(senderId, { text: 'Please provide a prompt.' }, token);

    const prompt = encodeURIComponent(args.join(' ').trim());
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${prompt}?model=flux&width=1024&height=1024`;
    const tmp = path.join(__dirname, `flux.jpg`);

    try {
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(tmp, res.data);

      const form = new FormData();
      form.append('message', JSON.stringify({ attachment: { type: 'image', payload: { is_reusable: true } } }));
      form.append('filedata', fs.createReadStream(tmp));

      const upload = await axios.post(`https://graph.facebook.com/v22.0/me/message_attachments?access_token=${token}`, form, { headers: form.getHeaders() });
      const id = upload.data.attachment_id;

      await axios.post(`https://graph.facebook.com/v22.0/me/messages?access_token=${token}`, {
        recipient: { id: senderId },
        message: { attachment: { type: 'image', payload: { attachment_id: id } } }
      });

      fs.unlinkSync(tmp);
    } catch (err) {
      console.error('ImageGen Error:', err.response?.data || err.message);
      sendMessage(senderId, { text: '❎ | Failed to generate image. Try again later.' }, token);
    }
  }
};