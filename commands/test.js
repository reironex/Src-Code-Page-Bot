const axios = require('axios');
const { sendMessage } = require('../handles/sendMessage');

module.exports = {
  name: 'chipp',
  description: 'Talk with Chipp AI',
  usage: 'chipp [text]',
  author: 'OpenAI + You',
  execute: async (m, args, client) => {
    if (!args.length) return sendMessage(client, m, 'Please provide a message.');
    const prompt = args.join(' ');

    try {
      const response = await axios.post(
        'https://app.chipp.ai/api/chat',
        {
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            authority: 'app.chipp.ai',
            accept: '*/*',
            'accept-language': 'en-US,en;q=0.9',
            authorization: 'Bearer sk-ant-75f1db6a-c8d7-4d0e-8191-3592fc233248',
            'content-type': 'application/json',
            cookie: '__cf_bm=J6Qg1qWKe3cXk1FV3J0AZ8soV0HX0Il6AUw6hT3o5qc-1716008217-1.0.1.1-rlMT9Z7ph6KYr1RJuiybB.PaTx_dMde94RRO5_cXALeP1LPSNVHcAHThvznbrDc7Tt_8Z1_2eA1Ju9J9O9g',
            origin: 'https://app.chipp.ai',
            referer: 'https://app.chipp.ai/',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36'
          }
        }
      );

      const data = response.data;

      if (!data || !data.choices || !data.choices.length) {
        return sendMessage(client, m, 'No response from Chipp AI.');
      }

      const choice = data.choices[0];

      if (choice.tool_calls && choice.tool_calls.length > 0) {
        const tool = choice.tool_calls[0];
        const { toolName, result } = tool;

        switch (toolName) {
          case 'generateImage':
            return sendMessage(client, m, result.imageUrl || 'No image returned.');
          case 'browseWeb':
            return sendMessage(client, m, result.answerBox?.answer || 'No result found from web.');
          case 'analyzeImage':
            return sendMessage(client, m, result || 'No description available.');
          default:
            return sendMessage(client, m, `Tool "${toolName}" is not supported.`);
        }
      } else if (choice.message?.content) {
        return sendMessage(client, m, choice.message.content);
      } else {
        return sendMessage(client, m, 'Received empty response from Chipp AI.');
      }

    } catch (err) {
      console.error('[Chipp AI Error]', err.message);
      return sendMessage(client, m, 'An error occurred while contacting Chipp AI.');
    }
  }
};