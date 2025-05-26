const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { sendMessage } = require('../handles/sendMessage');
const FormData = require('form-data');

const getImageUrl = async (event, token) => {
  const mid = event?.message?.reply_to?.mid || event?.message?.mid;
  if (!mid) return null;

  try {
    const { data } = await axios.get(`https://graph.facebook.com/v22.0/${mid}/attachments`, {
      params: { access_token: token }
    });

    const imageUrl = data?.data?.[0]?.image_data?.url || data?.data?.[0]?.file_url || null;
    return imageUrl;
  } catch (err) {
    console.error("Image URL fetch error:", err?.response?.data || err.message);
    return null;
  }
};

const conversationHistory = {};

module.exports = {
  name: 'test',
  description: 'Interact with Mocha AI using text queries and image analysis',
  usage: 'ask a question, or send a reply question to an image.',
  author: 'Coffee',

  async execute(senderId, args, pageAccessToken, event) {
    const prompt = args.join(' ').trim() || 'Hello';
    const chatSessionId = "fc053908-a0f3-4a9c-ad4a-008105dcc360";

    const headers = {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36",
      "sec-ch-ua-platform": '"Android"',
      "sec-ch-ua": '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
      "sec-ch-ua-mobile": '?1',
      "accept": "*/*",
      "sec-gpc": "1",
      "accept-language": "en-US,en;q=0.9",
      "origin": "https://newapplication-70381.chipp.ai",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      "referer": "https://newapplication-70381.chipp.ai/w/chat/",
      "accept-encoding": "gzip, deflate, br, zstd",
      "cookie": "userId_70381=729a0bf6-bf9f-4ded-a861-9fbb75b839f5"
    };

    try {
      if (!conversationHistory[senderId]) {
        conversationHistory[senderId] = [];
      }

      conversationHistory[senderId].push({ role: 'user', content: prompt });

      const chunkMessage = (message, maxLength) => {
        const chunks = [];
        for (let i = 0; i < message.length; i += maxLength) {
          chunks.push(message.slice(i, i + maxLength));
        }
        return chunks;
      };

      const imageUrl = await getImageUrl(event, pageAccessToken);

      let payload;

      if (imageUrl) {
        const combinedPrompt = `${prompt}\nImage URL: ${imageUrl}`;
        payload = {
          messages: [...conversationHistory[senderId], { role: 'user', content: combinedPrompt }],
          chatSessionId,
          toolInvocations: [
            {
              toolName: 'analyzeImage',
              args: {
                userQuery: prompt,
                imageUrls: [imageUrl],
              }
            }
          ]
        };
      } else {
        payload = {
          messages: [...conversationHistory[senderId]],
          chatSessionId,
        };
      }

      const { data } = await axios.post("https://newapplication-70381.chipp.ai/api/chat", payload, { headers });

      const responseText = data.choices?.[0]?.message?.content || '';
      const toolCalls = data.choices?.[0]?.message?.toolInvocations || [];

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'generateImage' && toolCall.state === 'result' && toolCall.result) {
          const urlMatch = toolCall.result.match(/https?:\/\/\S+/);
          const url = urlMatch ? urlMatch[0] : null;

          if (url) {
            const tmpFilePath = path.join(__dirname, `temp_${Date.now()}.jpg`);
            const writer = fs.createWriteStream(tmpFilePath);
            const imageRes = await axios.get(url, { responseType: 'stream' });
            imageRes.data.pipe(writer);

            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });

            // Upload to Facebook
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

            fs.unlinkSync(tmpFilePath);
            return;
          }
        }

        if (toolCall.toolName === 'analyzeImage' && toolCall.state === 'result' && toolCall.result) {
          await sendMessage(senderId, { text: `Image analysis result: ${toolCall.result}` }, pageAccessToken);
          return;
        }

        if (toolCall.toolName === 'browseWeb' && toolCall.state === 'result' && toolCall.result) {
          let answerText = '';
          if (toolCall.result.answerBox?.answer) {
            answerText = toolCall.result.answerBox.answer;
          } else if (Array.isArray(toolCall.result.organic)) {
            answerText = toolCall.result.organic.map(o => o.snippet).filter(Boolean).join('\n\n');
          }
          const finalReply = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${responseText}\n\nBrowse result:\n${answerText}\n・──── >ᴗ< ────・`;
          await sendMessage(senderId, { text: finalReply }, pageAccessToken);
          return;
        }
      }

      if (!responseText) throw new Error('Empty response from the AI.');

      conversationHistory[senderId].push({ role: 'assistant', content: responseText });
      const formattedResponse = `💬 | 𝙼𝚘𝚌𝚑𝚊 𝙰𝚒\n・───────────・\n${responseText}\n・──── >ᴗ< ────・`;
      const messageChunks = chunkMessage(formattedResponse, 1900);
      for (const chunk of messageChunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }
    } catch (err) {
      console.error('ImageGen Error:', err.response?.data || err.message || err);
      return sendMessage(senderId, { text: '❎ | Failed to generate image. Please try again later.' }, pageAccessToken);
    }
  }
};
