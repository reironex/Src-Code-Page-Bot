const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = 'fw_3ZZP4mu2QeZvFuN7NQA9UF5p'; // Fireworks API Key
const IMGBB_KEY = '596919061a4512babcb009c50c65fca1'; // ImgBB API Key

module.exports = {
  name: 'test',
  description: 'Generate an image and send the preview as a link.',
  usage: '-test [prompt]',
  author: 'coffee',

  async execute(senderId, args, pageAccessToken) {
    if (!args.length) {
      return sendMessage(senderId, { text: 'Please provide a prompt.' }, pageAccessToken);
    }

    const prompt = args.join(' ');

    try {
      const res = await fetch("https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/accounts/fireworks/models/flux-1-dev-fp8/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "image/jpeg",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ prompt }),
      });

      const buffer = Buffer.from(await res.arrayBuffer());
      const tempPath = path.join(__dirname, 'temp.jpg');
      fs.writeFileSync(tempPath, buffer);

      const form = new FormData();
      form.append('key', IMGBB_KEY);
      form.append('image', fs.createReadStream(tempPath));

      const uploadRes = await fetch('https://api.imgbb.com/1/upload', {
        method: 'POST',
        body: form,
        headers: form.getHeaders(),
      });

      const uploadData = await uploadRes.json();
      fs.unlinkSync(tempPath);

      if (!uploadData?.data?.url) {
        console.error('ImgBB error:', uploadData);
        return sendMessage(senderId, { text: '❎ | Failed to upload image.' }, pageAccessToken);
      }

      await sendMessage(senderId, { text: uploadData.data.url }, pageAccessToken);
    } catch (err) {
      console.error('Image generation error:', err);
      await sendMessage(senderId, { text: '❎ | Error generating or sending the image.' }, pageAccessToken);
    }
  }
};