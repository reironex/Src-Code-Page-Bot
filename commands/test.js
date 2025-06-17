const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

const key = () => {
  const src = 'b59784be-020d-4a15-bb50-3cfb0f1ae5b0_e42x';
  const pick = [11, 24, 3, 21, 9];
  const k = pick.map(i => src[i]).join('');
  const hex = '3d3b2a382f7f343f211f36797f7c0c36787432395c173f7e732d1a63200c302f257b652b2e3274327d2b1939';
  let out = '';
  for (let i = 0; i < hex.length; i += 2) {
    const h = hex.substr(i, 2);
    out += String.fromCharCode(parseInt(h, 16) ^ k.charCodeAt(i / 2 % k.length));
  }
  return out;
};

module.exports = {
  name: 'test',
  description: 'Generate images via prompt using Flux.',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, pageAccessToken) => {
    if (!args.length)
      return sendMessage(senderId, { text: 'Please provide a prompt.' }, pageAccessToken);

    const prompt = encodeURIComponent(args.join(' ').trim());
    const url = key().replace('${prompt}', prompt);

    try {
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      const temp = path.join(__dirname, 'tmp.jpg');
      fs.writeFileSync(temp, Buffer.from(res.data));

      const form = new FormData();
      form.append('message', JSON.stringify({ attachment: { type: 'image', payload: { is_reusable: true } } }));
      form.append('filedata', fs.createReadStream(temp));

      const upload = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${pageAccessToken}`,
        form,
        { headers: form.getHeaders() }
      );

      await axios.post(`https://graph.facebook.com/v22.0/me/messages?access_token=${pageAccessToken}`, {
        recipient: { id: senderId },
        message: {
          attachment: {
            type: 'image',
            payload: { attachment_id: upload.data.attachment_id }
          }
        }
      });

      fs.unlinkSync(temp);
    } catch (e) {
      console.error('ImageGen Error:', e.message);
      return sendMessage(senderId, { text: '❎ | Failed to generate image.' }, pageAccessToken);
    }
  }
};