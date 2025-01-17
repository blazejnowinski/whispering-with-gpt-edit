
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

app.post('/api/gpt', async (req, res) => {
  try {
    const { text, prompt, apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

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
    console.error('GPT API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
