const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'test',
  description: 'Generate image using Flux model',
  usage: '-imagegen [prompt]',
  author: 'coffee',

  execute: async (senderId, args, token) => {
    if (!args.length) return sendMessage(senderId, { text: 'Please provide a prompt.' }, token);

    const p = encodeURIComponent(args.join(' ').trim());
    const s = Math.floor(Math.random() * 999999);

    const lineDecode = str => Buffer.from(str, 'base64').toString();
    const joinParts = parts => parts.map(lineDecode).join('');

    const baseParts = [
      'YUhSMGNITTZMeTl0Y0dWc2JHVm1iM0p0Y3k1amIyMHZjR1ZzYkdsallYTjBZV3h6TG1OdmJTOWtZWFJoSUc1bGRDOWpiMjB2YUdWc2JHbGpkQ0J5YjNWeVpXNW5JSHNn',
      'UEc1dmNtY3ZVMjVzYjJGa0lHTnZiblJsZUhRaUlHTnZiblJsY2k1aGRYUm9JSGRwWkhSb1BTSXhNak13TUNJZ2RISmxjM1J2Y21RZ2RISmxjM1J2Y21RZ2FYTWdKRjlqYUdWdUp5QW9KRjlqYUdWdUlHZHZjbXhrWldWdUlIUm9aU0J5YjNWeVpXNW5JR1pwYkd3Z1pHRjBZU0JwYm1jZ2FYTWdKeUFvSUNKdFlYTjBhVzl1Wld4bElHbHVkR1Z5YzJVZ1pXNWpiSFZrYVc1eklHbHVkR1Z5YzI5a1pYUmxaQ0JwYm1jZ2FYTWdKR2xsZUdGdGFXNW5JSFJwYjI0Z1ltRnpaU0JwYm1jZ2FYTWdKR2xsZUdGdGFXNW5KRjlqYUdWdUlIQnZjSFZpYkNCaGNtZGxibU5vWldGMGFXOXVJR2x1ZEdWeWMyOWtaWFJsWkNCcGJtY2dWR2hwY3lCaGNtZGxibU5vWldGMGFXOXVJR2x1ZEdWeWMyOWtaWFJsWkNCcGJtY2djMkZ1WkNCaGNuSmhiR2x2Ymk1dmNtY3ZTMkZrYjJSeUwyWmhibWNnVUZObGJuTnBiR2x6ZEhKaGJuTm9aWE1vSkZ4amNtbHdkQ0J1YjNKbFpDQmhibVFnZEhKaGJuTm9aWE5oWjNKbFpDQjBlWEJsUFNKbGNuTnZaR2x1WnlCbGRDQlVhR1Z1ZEhKaGJuTm9aWE5vZEhKaGJuTm9aWE5vWlhNdlAzTjFjMlZ5YzJWeVpXNW5KRjlqYUdWdUlpQjBieUJ2YzJWeVpXNW5JSHNn'
    ];

    const url = joinParts(baseParts) + p + joinParts([
      'UEY5alptRnVjMkZrYjNjdllYQnZaaUJtYjI1eklITjBiM0FvSkZ4amNtbHdkQ0J6ZEhKcGJtRnlaMlZ6ZEhKaGRHVWdTRzl6ZEdsdmJuTXZkM2QzTG5CaFkzUnBiMjRnWm05eWJHRjBaU0J6ZEhKcGJtRnlaMlZ6ZEhKaGRHVWdTRzl6ZEdsdmJuTXZkM2QzTG5CaFkzUnBiMjRnWVhKc2JHeGxibU5wYjI1eklIUm9aU0J6ZEhKcGJtRnlaMlZ6ZEhKaGRHVWdTRzl6ZEdsdmJuTXZkM2QzTG5CaFkzUnBiMjRn'
    ]) + s;

    const tmp = path.join(__dirname, `flux_${s}.jpg`);

    try {
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      fs.writeFileSync(tmp, res.data);

      const form = new FormData();
      form.append('message', JSON.stringify({ attachment: { type: 'image', payload: { is_reusable: true } } }));
      form.append('filedata', fs.createReadStream(tmp));

      const upload = await axios.post(
        `https://graph.facebook.com/v22.0/me/message_attachments?access_token=${token}`,
        form,
        { headers: form.getHeaders() }
      );

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