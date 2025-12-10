import { useState, useEffect, useRef, useCallback } from 'react'
import { curriculum, getLesson, getNextLesson, getLearnedVocabulary } from './curriculum'
import { useProgress } from './useProgress'

function App() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showPinyin, setShowPinyin] = useState(true)
  const [autoSpeak, setAutoSpeak] = useState(true)
  const [error, setError] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)

  const {
    progress,
    isLoaded,
    completeLesson,
    setCurrentLesson,
    updateSessionStats,
  } = useProgress()

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)
  const sessionStartRef = useRef(null)

  // Get current lesson data
  const currentLessonData = getLesson(progress.currentLessonId)
  const currentLesson = currentLessonData?.lesson
  const learnedVocabulary = getLearnedVocabulary(progress.completedLessons)

  // Load messages from localStorage
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('chinese-tutor-messages')
      if (savedMessages) {
        const parsed = JSON.parse(savedMessages)
        setMessages(parsed)
        if (parsed.length > 0) setHasStarted(true)
      }
    } catch (err) {
      console.error('Failed to load messages:', err)
    }
  }, [])

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        // Keep last 100 messages to prevent storage issues
        const toSave = messages.slice(-100)
        localStorage.setItem('chinese-tutor-messages', JSON.stringify(toSave))
      } catch (err) {
        console.error('Failed to save messages:', err)
      }
    }
  }, [messages])

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
      recognitionRef.current.lang = 'zh-CN'

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

  // Track session time
  useEffect(() => {
    if (hasStarted && !sessionStartRef.current) {
      sessionStartRef.current = Date.now()
    }

    return () => {
      if (sessionStartRef.current) {
        const minutes = Math.round((Date.now() - sessionStartRef.current) / 60000)
        if (minutes > 0) {
          updateSessionStats(minutes)
        }
      }
    }
  }, [hasStarted, updateSessionStats])

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

  const extractChineseText = (text) => {
    const chineseRegex = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]+/g
    const matches = text.match(chineseRegex)
    return matches ? matches.join('') : ''
  }

  const speakText = useCallback(async (text) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    const chineseText = extractChineseText(text)
    if (!chineseText) return

    setIsSpeaking(true)

    try {
      const response = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: chineseText }),
      })

      if (!response.ok) throw new Error('TTS failed')

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      audio.onerror = () => {
        setIsSpeaking(false)
        URL.revokeObjectURL(audioUrl)
        audioRef.current = null
      }

      await audio.play()
    } catch (err) {
      console.error('TTS error:', err)
      setIsSpeaking(false)
    }
  }, [])

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsSpeaking(false)
  }, [])

  // Detect lesson navigation commands
  const detectLessonCommand = (text) => {
    const lower = text.toLowerCase()

    // Next lesson
    if (lower.includes('next lesson') || lower.includes('continue') || lower.includes('move on')) {
      const next = getNextLesson(progress.currentLessonId)
      if (next) {
        completeLesson(progress.currentLessonId)
        setCurrentLesson(next.id)
        return { action: 'next', lesson: next }
      }
    }

    // Complete current lesson
    if (lower.includes('complete') || lower.includes('finished') || lower.includes('done with this lesson')) {
      completeLesson(progress.currentLessonId)
      const next = getNextLesson(progress.currentLessonId)
      if (next) {
        setCurrentLesson(next.id)
        return { action: 'completed', lesson: next }
      }
    }

    // Topic requests
    const topicMap = {
      'greeting': '1.1', 'hello': '1.1', 'hi': '1.1',
      'introduction': '1.2', 'name': '1.2', 'introduce': '1.2',
      'number': '1.3', 'count': '1.3',
      'yes': '1.4', 'no': '1.4', 'question': '1.4',
      'family': '2.1', 'mother': '2.1', 'father': '2.1',
      'food': '2.2', 'eat': '2.2', 'drink': '2.2', 'restaurant': '2.2',
      'time': '2.3', 'clock': '2.3', 'day': '2.3',
      'direction': '2.4', 'where': '2.4', 'place': '2.4',
      'shopping': '3.1', 'buy': '3.1', 'money': '3.1', 'price': '3.1',
      'weather': '3.2', 'hot': '3.2', 'cold': '3.2', 'rain': '3.2',
      'hobby': '3.3', 'hobbies': '3.3', 'like': '3.3', 'music': '3.3',
      'plan': '3.4', 'meeting': '3.4', 'together': '3.4',
    }

    for (const [keyword, lessonId] of Object.entries(topicMap)) {
      if (lower.includes(keyword) && (lower.includes('teach') || lower.includes('learn') || lower.includes('practice') || lower.includes('about'))) {
        setCurrentLesson(lessonId)
        return { action: 'topic', lesson: getLesson(lessonId)?.lesson }
      }
    }

    return null
  }

  const sendMessage = async (text, currentMessages = messages) => {
    if (!text.trim()) return

    setError(null)
    setHasStarted(true)
    const userMessage = { role: 'user', content: text.trim() }
    const newMessages = [...currentMessages, userMessage]
    setMessages(newMessages)
    setInputText('')
    setIsLoading(true)

    // Check for lesson navigation commands
    const command = detectLessonCommand(text)

    // Get updated lesson after potential command
    const lessonToUse = command?.lesson || currentLesson

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: currentMessages.slice(-30), // Last 15 exchanges
          lesson: lessonToUse,
          learnedVocabulary: learnedVocabulary,
          command: command, // Pass command info to API
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      const assistantMessage = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, assistantMessage])

      // Check if tutor indicated lesson completion
      if (data.message.includes('完成') || data.message.includes('Excellent') || data.message.includes('next lesson')) {
        // Mark as complete if tutor says so
        if (data.message.toLowerCase().includes('complete') || data.message.includes('太棒了')) {
          completeLesson(progress.currentLessonId)
        }
      }

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

  const handleSubmit = (e) => {
    e.preventDefault()
    sendMessage(inputText)
  }

  const startConversation = () => {
    setHasStarted(true)
    sendMessage("Hi! I'm ready to learn Chinese. What should we start with?", [])
  }

  const jumpToLesson = (lessonId) => {
    setCurrentLesson(lessonId)
    setSidebarOpen(false)
    const lesson = getLesson(lessonId)?.lesson
    sendMessage(`I'd like to learn about ${lesson?.title || 'this topic'}. Please teach me!`)
  }

  const clearHistory = () => {
    setMessages([])
    localStorage.removeItem('chinese-tutor-messages')
    setHasStarted(false)
  }

  const formatMessage = (content) => {
    if (showPinyin) return content
    return content.replace(/\([^)]*[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ][^)]*\)/g, '')
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-72 bg-white shadow-xl transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Your Progress</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Stats */}
          <div className="p-4 bg-gradient-to-r from-red-500 to-amber-500 text-white">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-2xl font-bold">{progress.completedLessons.length}</div>
                <div className="text-xs opacity-80">Lessons</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{learnedVocabulary.length}</div>
                <div className="text-xs opacity-80">Words</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{progress.streak}</div>
                <div className="text-xs opacity-80">Streak</div>
              </div>
            </div>
          </div>

          {/* Lessons */}
          <div className="flex-1 overflow-y-auto p-4">
            {curriculum.levels.map((level) => (
              <div key={level.id} className="mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Level {level.id}: {level.name}
                </div>
                <div className="space-y-1">
                  {level.lessons.map((lesson) => {
                    const isCompleted = progress.completedLessons.includes(lesson.id)
                    const isCurrent = progress.currentLessonId === lesson.id

                    return (
                      <button
                        key={lesson.id}
                        onClick={() => jumpToLesson(lesson.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                          isCurrent
                            ? 'bg-red-100 text-red-700'
                            : isCompleted
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <span className={`w-4 h-4 rounded-full border-2 ${isCurrent ? 'border-red-500' : 'border-gray-300'}`} />
                        )}
                        <span className="flex-1">{lesson.title}</span>
                        <span className="text-xs text-gray-400 font-chinese">{lesson.titleChinese}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Clear History */}
          <div className="p-4 border-t">
            <button
              onClick={clearHistory}
              className="w-full px-4 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear Conversation
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-red-100 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
                  <span className="text-white font-bold text-sm font-chinese">中</span>
                </div>
                <div>
                  <h1 className="font-semibold text-gray-800 text-sm">Chinese Tutor</h1>
                  {currentLesson && (
                    <p className="text-xs text-gray-500">{currentLesson.title}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-xs text-gray-500">Pinyin</span>
                <button
                  onClick={() => setShowPinyin(!showPinyin)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    showPinyin ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    showPinyin ? 'translate-x-4' : ''
                  }`} />
                </button>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <span className="text-xs text-gray-500">Sound</span>
                <button
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    autoSpeak ? 'bg-red-500' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    autoSpeak ? 'translate-x-4' : ''
                  }`} />
                </button>
              </label>
            </div>
          </div>

          {/* Current lesson vocab hint */}
          {currentLesson && hasStarted && (
            <div className="bg-amber-50/80 border-t border-amber-100 px-4 py-1.5 overflow-x-auto">
              <div className="max-w-3xl mx-auto flex gap-3 text-xs">
                <span className="text-amber-600 whitespace-nowrap">Current vocab:</span>
                {currentLesson.vocabulary.slice(0, 4).map((v, i) => (
                  <span key={i} className="whitespace-nowrap text-amber-800">
                    <span className="font-chinese">{v.chinese}</span>
                    <span className="text-amber-500 ml-1">({v.english})</span>
                  </span>
                ))}
                {currentLesson.vocabulary.length > 4 && (
                  <span className="text-amber-500">+{currentLesson.vocabulary.length - 4}</span>
                )}
              </div>
            </div>
          )}
        </header>

        {/* Chat Area */}
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 pb-24">
          {!hasStarted ? (
            // Welcome Screen
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="w-20 h-20 mb-6 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center shadow-lg">
                <span className="text-white text-3xl font-chinese">你好</span>
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                Welcome to Chinese Tutor
              </h2>
              <p className="text-gray-600 mb-6 max-w-md">
                Learn Chinese through natural conversation. I'll guide you through lessons,
                teach vocabulary, and practice with you.
              </p>
              <button
                onClick={startConversation}
                className="px-8 py-3 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-shadow"
              >
                Start Learning
              </button>

              <div className="mt-8 text-sm text-gray-500">
                <p>You can also say things like:</p>
                <div className="flex flex-wrap gap-2 mt-2 justify-center">
                  {['Teach me greetings', 'Learn about food', 'Practice numbers'].map((cmd) => (
                    <span key={cmd} className="px-3 py-1 bg-white rounded-full text-gray-600 shadow-sm">
                      "{cmd}"
                    </span>
                  ))}
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
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-red-500 to-amber-500 text-white'
                      : 'bg-white shadow-md'
                  }`}>
                    <p className={`whitespace-pre-wrap font-chinese ${
                      message.role === 'assistant' ? 'text-gray-800' : ''
                    }`}>
                      {formatMessage(message.content)}
                    </p>

                    {message.role === 'assistant' && (
                      <button
                        onClick={() => speakText(message.content)}
                        className="mt-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start animate-fade-in-up">
                  <div className="bg-white shadow-md rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg text-sm">
              {error}
            </div>
          )}
        </main>

        {/* Input Area */}
        {hasStarted && (
          <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200">
            <div className="max-w-3xl mx-auto px-4 py-3">
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Type in Chinese or English... Try 'next lesson' or 'teach me about food'"
                    className="w-full px-4 py-2.5 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500 font-chinese text-sm"
                    disabled={isLoading}
                  />
                </div>

                {recognitionRef.current && (
                  <button
                    type="button"
                    onClick={toggleRecording}
                    disabled={isLoading}
                    className={`p-2.5 rounded-full transition-all ${
                      isRecording
                        ? 'bg-red-500 text-white animate-pulse-ring'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                )}

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={stopSpeaking}
                    className="p-2.5 rounded-full bg-amber-500 text-white"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-2.5 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
