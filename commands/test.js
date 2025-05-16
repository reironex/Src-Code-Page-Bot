const fetch = require('node-fetch');
const FormData = require('form-data');
const { writeFileSync, unlinkSync } = require('fs');
const path = require('path');

const API_KEY = 'your_fireworks_api_key'; // Replace this
const IMGBB_KEY = 'your_imgbb_api_key';   // Replace this

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
      const response = await fetch("https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/accounts/fireworks/models/flux-1-dev-fp8/text_to_image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "image/jpeg",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({ prompt }),
      });

      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);

      const tempImagePath = path.join(__dirname, 'temp.jpg');
      writeFileSync(tempImagePath, imageBuffer);

      // Upload to imgbb
      const form = new FormData();
      form.append('image', imageBuffer.toString('base64'));

      const uploadRes = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
        method: 'POST',
        body: form,
      });

      const uploadData = await uploadRes.json();
      unlinkSync(tempImagePath);

      if (!uploadData?.data?.url) {
        return sendMessage(senderId, { text: '❎ | Failed to upload image for preview.' }, pageAccessToken);
      }

      // Send image as preview link
      await sendMessage(senderId, { text: uploadData.data.url }, pageAccessToken);
    } catch (err) {
      console.error('Error:', err);
      await sendMessage(senderId, { text: '❎ | Failed to generate or send image preview.' }, pageAccessToken);
    }
  }
};