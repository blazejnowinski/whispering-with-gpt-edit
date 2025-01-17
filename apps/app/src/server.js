
const express = require('express');
const multer = require('multer');
const { OpenAI } = require('openai');
const app = express();

app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/gpt', async (req, res) => {
  try {
    const { text, prompt, apiKey } = req.body;
    
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: text }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    res.json({ content: response.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, '0.0.0.0', () => {
  console.log('Server running on port 3000');
});
