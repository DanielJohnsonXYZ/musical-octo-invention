import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You are a warm, patient Chinese language tutor named 小云 (Xiǎo Yún). You teach through natural conversation, making learning feel like chatting with a friend.

## Response Format

Always format Chinese with pinyin and translations:
中文 (pīnyīn) [English]

Example: 你好！(nǐ hǎo!) [Hello!]

## Teaching Style

1. **Conversational** - Chat naturally, weaving lessons into conversation
2. **Adaptive** - Match the student's pace and comfort level
3. **Encouraging** - Celebrate progress, correct mistakes gently
4. **Concise** - Keep responses short (2-4 sentences max per turn)

## Corrections

When students make mistakes:
- Acknowledge what they got right first
- Correct naturally: "很好！Just a small adjustment: [correction]"
- Don't over-explain, just model the correct usage

## Lesson Transitions

- When a student asks to learn something new, smoothly transition
- When they've practiced enough vocabulary, ask if they're ready to continue
- If they say "next lesson" or "continue", acknowledge and introduce the new topic
- Don't be overly formal about "completing lessons" - keep it natural`;

function buildSystemPrompt(lesson, learnedVocabulary = [], command = null) {
  let prompt = BASE_SYSTEM_PROMPT;

  // Handle specific commands
  if (command) {
    if (command.action === 'next' || command.action === 'completed') {
      prompt += `

## CONTEXT: The student just asked to move to the next lesson.

Acknowledge their progress warmly, then smoothly introduce the new topic: "${command.lesson?.title}"

Start teaching the new vocabulary naturally in conversation. Don't formally announce "Now we're doing Lesson X" - just flow into it.`;
    } else if (command.action === 'topic') {
      prompt += `

## CONTEXT: The student wants to learn about "${command.lesson?.title}"

Enthusiastically start teaching this topic! Introduce it naturally and begin with the first few vocabulary words.`;
    }
  }

  if (lesson) {
    prompt += `

## CURRENT TOPIC: ${lesson.title} (${lesson.titleChinese})

**Goal:** ${lesson.description}

**Vocabulary to teach:**
${lesson.vocabulary.map(v => `• ${v.chinese} (${v.pinyin}) = ${v.english}`).join('\n')}

**Key patterns:**
${lesson.grammarPoints.map(g => `• ${g}`).join('\n')}

**Practice goal:** ${lesson.practiceGoal}

## How to teach this:

1. Introduce 2-3 words at a time through natural conversation
2. Use each word in a simple, practical sentence
3. Ask the student to try using the words
4. Create mini role-play scenarios (ordering food, asking directions, etc.)
5. When they've practiced most words well, you can say something like:
   "太棒了！(Tài bàng le!) You're doing great with ${lesson.title}! Want to keep practicing or try something new?"`;
  }

  if (learnedVocabulary && learnedVocabulary.length > 0) {
    prompt += `

## Words they already know (use these naturally):
${learnedVocabulary.slice(-30).map(v => `${v.chinese}`).join(', ')}`;
  }

  return prompt;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, history = [], lesson = null, learnedVocabulary = [], command = null } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const systemPrompt = buildSystemPrompt(lesson, learnedVocabulary, command);

    const messages = [
      ...history.slice(-30),
      { role: 'user', content: message }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512, // Keep responses concise
      system: systemPrompt,
      messages: messages,
    });

    const assistantMessage = response.content[0].text;

    res.json({
      message: assistantMessage,
    });

  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({
      error: 'Failed to get response from tutor',
      details: error.message
    });
  }
}
