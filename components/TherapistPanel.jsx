'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';

export default function TherapistChat() {
  const MODEL_NAME = 'gemini-1.5-flash';
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  const STORAGE_KEY = 'therapistChatHistory';
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const motivationalQuotes = [
    "You are stronger than you think.",
    "This too shall pass.",
    "Be patient with yourself. Healing takes time.",
    "Your feelings are valid.",
    "Progress, not perfection.",
  ];

  const breathingExercise = `Let's try a short breathing exercise:
- Inhale slowly through your nose for 4 seconds.
- Hold your breath for 4 seconds.
- Exhale gently through your mouth for 4 seconds.
Repeat this for a minute. Let your mind settle.`;

  const gratitudePrompt = `Take a moment to reflect on something you're grateful for today.
It could be a small moment, a person, or even your own resilience.`;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setMessages(JSON.parse(stored));
      } catch (_) {}
    } else {
      setMessages([
        {
          role: 'assistant',
          content: "Hello, I'm your virtual therapist. How are you feeling today?",
        },
      ]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    setLoading(true);
    const newMessages = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    const formattedHistory = newMessages.slice(0, -1).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }],
    }));

    try {
      const chat = model.startChat({
        history: formattedHistory,
        systemInstruction: {
          role: 'system',
          parts: [
            {
              text:
                "You are a highly educated and compassionate mental health therapist. Speak in a calm, empathetic, and supportive tone. Ask open-ended questions, validate emotions, and guide the user to reflect on their thoughts and feelings. Occasionally include helpful practices like breathing exercises, gratitude journaling, or motivational affirmations when appropriate.",
            },
          ],
        },
      });

      const result = await chat.sendMessage(text);
      const reply = (await result.response.text()).trim();

      // Append supportive content occasionally
      const extras = [];
      if (Math.random() < 0.3) extras.push(`💬 *Quote:* "${motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]}"`);
      if (text.toLowerCase().includes('anxious') || text.toLowerCase().includes('panic')) extras.push(`🧘 *Breathing Exercise:* ${breathingExercise}`);
      if (text.toLowerCase().includes('empty') || text.toLowerCase().includes('unmotivated')) extras.push(`📓 *Gratitude Prompt:* ${gratitudePrompt}`);

      const fullReply = [reply, ...extras].join('\n\n');

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: fullReply },
      ]);
    } catch (err) {
      console.error('Gemini error', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm sorry, I had trouble processing that. Would you like to try sharing that again?",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = e.currentTarget.prompt.value.trim();
    if (!input) return;
    e.currentTarget.reset();
    sendMessage(input);
  };

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xl">
        <h1 className="text-2xl font-bold text-center mb-4 text-blue-700">
          Therapist Chat
        </h1>
        <div className="h-96 overflow-y-auto mb-4 space-y-4 p-3 bg-gray-50 rounded">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg ${
                m.role === 'user'
                  ? 'bg-blue-100 ml-auto text-right max-w-xs'
                  : 'bg-green-100 mr-auto text-left max-w-xs'
              }`}
            >
              <p className="text-sm whitespace-pre-line">{m.content}</p>
            </div>
          ))}
          <div ref={endRef} />
          {loading && <p className="text-gray-500 italic">Typing...</p>}
        </div>
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            name="prompt"
            type="text"
            placeholder="Type your message..."
            className="flex-grow p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
