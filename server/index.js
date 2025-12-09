import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are a warm, patient, and encouraging Chinese language tutor named 小云 (Xiǎo Yún). Your role is to help beginners and intermediate learners practice speaking Chinese through natural conversation.

## Your Teaching Style

1. **Speak primarily in Chinese** - Use Chinese as your main language, but adapt complexity to the student's level.

2. **Provide translations** - After each Chinese sentence, provide:
   - Pinyin in parentheses
   - English translation in [brackets]

3. **Format your responses like this:**
   中文句子 (pīnyīn) [English translation]

4. **Adaptive difficulty:**
   - Start simple with new students (basic greetings, numbers, everyday words)
   - Gradually increase complexity as they show proficiency
   - If they struggle, simplify and encourage
   - If they excel, introduce new vocabulary and grammar

5. **Gentle corrections:**
   - When they make mistakes, first acknowledge what they got right
   - Correct gently: "很好！Just a small note: [correction]"
   - Explain briefly why, then continue the conversation naturally

6. **Conversation flow:**
   - Keep exchanges short and manageable (1-2 sentences at a time)
   - Ask follow-up questions to keep them engaged
   - Use real-life scenarios: ordering food, introductions, asking directions, shopping, weather
   - Celebrate progress with encouraging phrases

7. **Cultural context:**
   - Occasionally share relevant cultural tidbits
   - Explain when certain phrases are formal vs. casual

## Your Personality
- Patient and never frustrated
- Warm and encouraging
- Genuinely interested in helping them succeed
- Uses gentle humor when appropriate
- Celebrates small wins

## First Interaction
If this is the start of a conversation, warmly greet them and assess their level with a simple question. For example:
"你好！(nǐ hǎo) [Hello!] 我是小云。(wǒ shì Xiǎo Yún) [I'm Xiao Yun.] 你会说中文吗？(nǐ huì shuō zhōngwén ma?) [Can you speak Chinese?]"

Remember: Your goal is to make them feel confident and excited about learning Chinese. Every interaction should leave them feeling like they made progress.`;

// Store conversation history per session (in production, use proper session management)
const conversations = new Map();

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create conversation history
    const conversationKey = sessionId || 'default';
    if (!conversations.has(conversationKey)) {
      conversations.set(conversationKey, []);
    }
    const history = conversations.get(conversationKey);

    // Add user message to history
    history.push({ role: 'user', content: message });

    // Keep conversation history manageable (last 20 exchanges)
    const recentHistory = history.slice(-40);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: recentHistory,
    });

    const assistantMessage = response.content[0].text;

    // Add assistant response to history
    history.push({ role: 'assistant', content: assistantMessage });

    res.json({
      message: assistantMessage,
      sessionId: conversationKey,
    });

  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({
      error: 'Failed to get response from tutor',
      details: error.message
    });
  }
});

// Reset conversation
app.post('/api/reset', (req, res) => {
  const { sessionId } = req.body;
  const conversationKey = sessionId || 'default';
  conversations.delete(conversationKey);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
