const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

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
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
      "Accept": "*/*",
      "Origin": "https://app.chipp.ai",
      "Referer": "https://app.chipp.ai/applications/35489/build",
      "Cookie": "GAESA=CooBMDBj...; __Secure-next-auth.session-token=eyJhbGciOiJka...", // hardcoded cookie here
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

      const { data } = await axios.post("https://app.chipp.ai/api/chat", payload, { headers });

      // Join all '0' fields that might be split in the response into one string
      const zeroParts = Object.values(data)
        .filter((v, i) => i !== data.length - 1 && typeof v === 'string' && v.length > 0)
        .filter((_, i, arr) => arr[i] !== undefined);
      
      // or more directly, gather all keys '0' (since multiple keys named "0"? unlikely but as you showed)
      // safer to do:
      const zeroKeys = Object.keys(data).filter(k => k === "0");
      const zeroJoined = zeroKeys.length
        ? zeroKeys.map(k => data[k]).join('')
        : (typeof data["0"] === 'string' ? data["0"] : '');

      // But from your example, the '0' fields appear multiple times with multiple string values in one object.
      // So the data is probably like {0:"Here", 0:" are", 0:" some", ...} which JS objects can't have multiple keys same name.
      // So you likely get data["0"] as an array of strings, join it.

      // Adjust for your exact case:
      let joinedText;
      if (Array.isArray(data["0"])) {
        joinedText = data["0"].join('');
      } else if (typeof data["0"] === 'string') {
        joinedText = data["0"];
      } else {
        // fallback: concatenate all string values in keys '0' (if any)
        joinedText = Object.values(data).filter(v => typeof v === 'string').join('');
      }

      // Handle tool results
      const toolCalls = data?.choices?.[0]?.message?.toolInvocations || [];

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'generateImage' && toolCall.state === 'result' && toolCall.result) {
          // Send only the URL from the result string
          const urlMatch = toolCall.result.match(/https?:\/\/\S+/);
          if (urlMatch) {
            await sendMessage(senderId, { text: urlMatch[0] }, pageAccessToken);
            return;
          }
        }

        if (toolCall.toolName === 'analyzeImage' && toolCall.state === 'result' && toolCall.result) {
          await sendMessage(senderId, { text: toolCall.result }, pageAccessToken);
          return;
        }

        if (toolCall.toolName === 'browseWeb' && toolCall.state === 'result') {
          // Use joined '0' text for browseWeb results
          if (joinedText) {
            await sendMessage(senderId, { text: joinedText }, pageAccessToken);
            return;
          }
        }
      }

      if (!joinedText) {
        throw new Error('Empty response from the AI.');
      }

      conversationHistory[senderId].push({ role: 'assistant', content: joinedText });

      const messageChunks = chunkMessage(joinedText, 1900);
      for (const chunk of messageChunks) {
        await sendMessage(senderId, { text: chunk }, pageAccessToken);
      }

    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.error("Bad Request: Ignored.");
      } else {
        console.error("Error:", err);
      }
    }
  },
};