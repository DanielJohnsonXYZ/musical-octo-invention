import { useState, useEffect, useRef, useCallback } from 'react'

// Generate a unique session ID
const generateSessionId = () => {
  return 'session_' + Math.random().toString(36).substring(2, 15)
}

function App() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showPinyin, setShowPinyin] = useState(true)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [sessionId] = useState(generateSessionId)
  const [error, setError] = useState(null)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const synthRef = useRef(window.speechSynthesis)

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'zh-CN' // Chinese Mandarin

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        setInputText(transcript)
        setIsRecording(false)
      }

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        setIsRecording(false)
        if (event.error === 'no-speech') {
          setError('No speech detected. Please try again.')
        }
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  // Start/stop recording
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
    } else {
      setError(null)
      recognitionRef.current?.start()
      setIsRecording(true)
    }
  }, [isRecording])

  // Extract Chinese text for speech
  const extractChineseText = (text) => {
    // Extract Chinese characters (including punctuation)
    const chineseRegex = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g
    const matches = text.match(chineseRegex)
    return matches ? matches.join('') : ''
  }

  // Speak text using TTS
  const speakText = useCallback((text) => {
    if (!synthRef.current) return

    // Cancel any ongoing speech
    synthRef.current.cancel()

    const chineseText = extractChineseText(text)
    if (!chineseText) return

    const utterance = new SpeechSynthesisUtterance(chineseText)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.85 // Slightly slower for learners
    utterance.pitch = 1

    // Try to find a Chinese voice
    const voices = synthRef.current.getVoices()
    const chineseVoice = voices.find(voice =>
      voice.lang.includes('zh') || voice.lang.includes('cmn')
    )
    if (chineseVoice) {
      utterance.voice = chineseVoice
    }

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    synthRef.current.speak(utterance)
  }, [])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel()
    setIsSpeaking(false)
  }, [])

  // Send message to API
  const sendMessage = async (text) => {
    if (!text.trim()) return

    setError(null)
    const userMessage = { role: 'user', content: text.trim() }
    setMessages(prev => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text.trim(), sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data = await response.json()
      const assistantMessage = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, assistantMessage])

      // Auto-speak the response
      if (autoSpeak) {
        speakText(data.message)
      }

    } catch (err) {
      console.error('Error:', err)
      setError('Failed to connect to tutor. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputText)
  }

  // Start new conversation
  const startNewConversation = async () => {
    stopSpeaking()
    setMessages([])
    setError(null)

    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
    } catch (err) {
      console.error('Failed to reset:', err)
    }

    // Get initial greeting
    sendMessage("Hi! I want to learn Chinese.")
  }

  // Format message content with pinyin visibility
  const formatMessage = (content) => {
    if (showPinyin) {
      return content
    }
    // Hide pinyin (text in parentheses that looks like pinyin)
    return content.replace(/\([^)]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ][^)]*\)/g, '')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-red-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg font-chinese">中</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-800">Chinese Tutor</h1>
              <p className="text-xs text-gray-500">Powered by Claude</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Pinyin Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">Pinyin</span>
              <button
                onClick={() => setShowPinyin(!showPinyin)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  showPinyin ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    showPinyin ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>

            {/* Auto-speak Toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">Auto-speak</span>
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoSpeak ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    autoSpeak ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </label>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {messages.length === 0 ? (
          // Welcome Screen
          <div className="text-center py-16">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-4xl font-chinese">你好</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Welcome to Chinese Tutor
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Practice speaking Chinese with your personal AI tutor.
              I'll adapt to your level and help you learn through natural conversation.
            </p>
            <button
              onClick={startNewConversation}
              className="px-8 py-3 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow"
            >
              Start Learning
            </button>

            <div className="mt-12 grid grid-cols-3 gap-4 max-w-lg mx-auto text-sm">
              <div className="p-4 bg-white/60 rounded-xl">
                <div className="text-2xl mb-2">🎤</div>
                <p className="text-gray-600">Speak or type in Chinese</p>
              </div>
              <div className="p-4 bg-white/60 rounded-xl">
                <div className="text-2xl mb-2">📝</div>
                <p className="text-gray-600">Get gentle corrections</p>
              </div>
              <div className="p-4 bg-white/60 rounded-xl">
                <div className="text-2xl mb-2">🔊</div>
                <p className="text-gray-600">Hear pronunciation</p>
              </div>
            </div>
          </div>
        ) : (
          // Messages
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white'
                      : 'bg-white shadow-md'
                  }`}
                >
                  <p className={`whitespace-pre-wrap font-chinese ${
                    message.role === 'assistant' ? 'text-gray-800' : ''
                  }`}>
                    {formatMessage(message.content)}
                  </p>

                  {/* Speaker button for assistant messages */}
                  {message.role === 'assistant' && (
                    <button
                      onClick={() => speakText(message.content)}
                      className="mt-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Listen to pronunciation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="bg-white shadow-md rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg animate-fade-in-up">
            {error}
          </div>
        )}
      </main>

      {/* Input Area */}
      {messages.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              {/* New conversation button */}
              <button
                type="button"
                onClick={startNewConversation}
                className="p-3 text-gray-400 hover:text-gray-600 transition-colors"
                title="Start new conversation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>

              {/* Text input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type in Chinese or English..."
                  className="w-full px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 font-chinese"
                  disabled={isLoading}
                />
              </div>

              {/* Voice button */}
              {recognitionRef.current && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  disabled={isLoading}
                  className={`p-3 rounded-full transition-all ${
                    isRecording
                      ? 'bg-red-500 text-white animate-pulse-ring'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isRecording ? 'Stop recording' : 'Start voice input'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}

              {/* Stop speaking button */}
              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="p-3 rounded-full bg-amber-500 text-white"
                  title="Stop speaking"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                </button>
              )}

              {/* Send button */}
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="p-3 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
