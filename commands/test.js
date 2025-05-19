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

function combineZeroField(rawResponse) {
  // rawResponse is an object with many keys "0" each with small text parts
  // Combine all "0" fields in order into one string
  // The rawResponse can be an object like { "0": "Here", "0": " are", ... } but JS objects can't have duplicate keys,
  // so assume rawResponse["0"] is an array or multiple entries inside rawResponse["0"]
  
  // So we expect rawResponse["0"] to be an array or a string with multiple parts.
  // If it is array-like, join; if string, return as is.
  
  if (Array.isArray(rawResponse["0"])) {
    return rawResponse["0"].join('');
  } else if (typeof rawResponse["0"] === 'string') {
    return rawResponse["0"];
  } else if (typeof rawResponse === 'object') {
    // Fallback: sometimes keys "0" appear multiple times — in some libs, the response might be an array of entries
    // but if we got an object with multiple "0" keys replaced, fallback:
    const keys = Object.keys(rawResponse).filter(k => k === "0");
    if (keys.length > 1) {
      return keys.map(k => rawResponse[k]).join('');
    }
  }
  return '';
}

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
      "Cookie": "GAESA=CooBMDBjYTM2OTVkMjBiNTE5MWY3NzFkZTk2MTZjNzU3NjFkZDMxNTA2MDUwNGViMzA0MzUzNGIxZDM2MzIwMmZiNDEzZjA0MGEwNWNhYjhiYjMzMTRjMWRkZGE2ZTMxMGVjYWExNTdkNmNiMjFkNWViMzc2YWYxODg5ZjQ0YWIwZWRmMWIwZjNjNGE1EIbvm5THMg; __Host-next-auth.csrf-token=54510ff606af01782c0d6c08c39a96fb421ca5e0bfe58ae323702e5b2daab8b9%7C67f259a94de43fc5157335500f498153ad55759cd7e8350e1c36a98073db160a; __Secure-next-auth.callback-url=https%3A%2F%2Fapp.chipp.ai; ph_phc_58R4nRj6BbHvFBIwUiMlHyD8X7B5xrup5HMX1EDFsFw_posthog=%7B%22distinct_id%22%3A%22mjaymjas%40gmail.com%22%2C%22%24sesid%22%3A%5B1737088291942%2C%2201947286-f553-74f6-8a85-c5ed3e3815c8%22%2C1737088234835%5D%2C%22%24epp%22%3Atrue%7D; __Secure-next-auth.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..dvZRGwF9T9nrJ8nX.Zezd6eR8u8MQhtSMghHVdbCHu3xFW4CXq3aHXLxw8QNC976iR3D797jF5u1Xm2RRv0TBy76El39mBltfXn2aa_7YShF-HztxeglSoBlxFBeI6OBCwDECWt_wMxqVaXeVnuWT60yVzH54cd3Xqq09kE3mTszWG9nGH5CXHYpghmUZtVfEhQKTgW139A86U42N2xR3VONMo_QO2kYpUZlCgKvubCsJv9KkATlz2tZwQeR1EHagYvlC8YQtI4zIUbaNcoDXxAmIpFR7J0GSQL3oi4akOk-pKhHFDa3KRLkw6e1WA7fvAgc7dXPaAbu7-ZfVVpcvP_uDi54UNCH-awQK4CVkR6Oqpx3nK-2kdd7DDxu3qRzmw0ItZCahU4Q.V4aAtYuxd2mCQZ_qLkKE2Q", // shortened for security
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

      // Combine all '0' fields into a single string
      let responseText = '';
      if (data) {
        if (Array.isArray(data["0"])) {
          responseText = data["0"].join('');
        } else if (typeof data["0"] === 'string') {
          responseText = data["0"];
        } else {
          // fallback if '0' is fragmented across keys - unlikely but safe
          responseText = Object.values(data)
            .filter(v => typeof v === 'string')
            .join('');
        }
      }

      const toolCalls = data?.choices?.[0]?.message?.toolInvocations || [];

      for (const toolCall of toolCalls) {
        if (toolCall.toolName === 'generateImage' && toolCall.state === 'result' && toolCall.result) {
          // Extract URL only
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
          // Here we rely on the combined "0" field as the full browseWeb text result:
          if (responseText) {
            await sendMessage(senderId, { text: responseText }, pageAccessToken);
            return;
          }
        }
      }

      if (!responseText) throw new Error('Empty response from AI.');

      conversationHistory[senderId].push({ role: 'assistant', content: responseText });

      const messageChunks = chunkMessage(responseText, 1900);
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