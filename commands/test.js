const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const API_KEY = 'fw_3ZZP4mu2QeZvFuN7NQA9UF5p'; // Replace with your Fireworks key

module.exports = {
  name: 'test',
  description: 'Generate an image and send the preview as a link.',
  usage: '-fluxlink [prompt]',
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
      form.append('file', fs.createReadStream(tempPath));

      const uploadRes = await fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: form,
      });

      const result = await uploadRes.json();
      fs.unlinkSync(tempPath);

      if (!Array.isArray(result) || !result[0]?.src) {
        return sendMessage(senderId, { text: '❎ | Telegraph upload failed.' }, pageAccessToken);
      }

      const imageUrl = `https://telegra.ph${result[0].src}`;

      await sendMessage(senderId, { text: imageUrl }, pageAccessToken);
    } catch (err) {
      console.error('Image generation error:', err);
      await sendMessage(senderId, { text: '❎ | Error generating or sending the image.' }, pageAccessToken);
    }
  }
};