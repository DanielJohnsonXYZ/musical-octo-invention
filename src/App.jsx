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
  const [view, setView] = useState('home') // 'home', 'lesson', 'chat'
  const [showLessonComplete, setShowLessonComplete] = useState(false)

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
  const currentLevel = currentLessonData?.level
  const learnedVocabulary = getLearnedVocabulary(progress.completedLessons)

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
    if (view === 'chat' && !sessionStartRef.current) {
      sessionStartRef.current = Date.now()
    }

    return () => {
      if (sessionStartRef.current && view !== 'chat') {
        const minutes = Math.round((Date.now() - sessionStartRef.current) / 60000)
        if (minutes > 0) {
          updateSessionStats(minutes)
        }
        sessionStartRef.current = null
      }
    }
  }, [view, updateSessionStats])

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

  const sendMessage = async (text, currentMessages = messages) => {
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
        body: JSON.stringify({
          message: text.trim(),
          history: currentMessages,
          lesson: currentLesson,
          learnedVocabulary: learnedVocabulary,
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const data = await response.json()
      const assistantMessage = { role: 'assistant', content: data.message }
      setMessages(prev => [...prev, assistantMessage])

      // Check if tutor indicated lesson completion
      if (data.message.includes('mark it complete') || data.message.includes('太棒了')) {
        setShowLessonComplete(true)
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

  const startLesson = (lessonId) => {
    setCurrentLesson(lessonId)
    setMessages([])
    setView('chat')
    setShowLessonComplete(false)
    sendMessage("I'm ready to start this lesson. Please teach me!", [])
  }

  const handleCompleteLesson = () => {
    completeLesson(progress.currentLessonId)
    const next = getNextLesson(progress.currentLessonId)
    if (next) {
      setCurrentLesson(next.id)
    }
    setShowLessonComplete(false)
    setView('home')
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

  // Home view with lessons
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-red-100 sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg font-chinese">中</span>
              </div>
              <div>
                <h1 className="font-semibold text-gray-800">Chinese Tutor</h1>
                <p className="text-xs text-gray-500">Powered by Claude</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-6">
          {/* Progress Stats */}
          <div className="bg-white rounded-2xl shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Progress</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-red-500">{progress.completedLessons.length}</div>
                <div className="text-sm text-gray-500">Lessons Done</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-amber-500">{learnedVocabulary.length}</div>
                <div className="text-sm text-gray-500">Words Learned</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-500">{progress.streak}</div>
                <div className="text-sm text-gray-500">Day Streak</div>
              </div>
            </div>
          </div>

          {/* Current Lesson */}
          {currentLesson && (
            <div className="bg-gradient-to-r from-red-500 to-amber-500 rounded-2xl shadow-lg p-6 mb-6 text-white">
              <div className="text-sm opacity-80 mb-1">Continue Learning</div>
              <h2 className="text-xl font-semibold mb-2">
                {currentLesson.title} ({currentLesson.titleChinese})
              </h2>
              <p className="opacity-90 mb-4">{currentLesson.description}</p>
              <button
                onClick={() => startLesson(progress.currentLessonId)}
                className="bg-white text-red-500 px-6 py-2 rounded-full font-medium hover:shadow-lg transition-shadow"
              >
                Start Lesson
              </button>
            </div>
          )}

          {/* Curriculum */}
          <div className="space-y-6">
            {curriculum.levels.map((level) => (
              <div key={level.id} className="bg-white rounded-2xl shadow-md overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <h3 className="font-semibold text-gray-800">
                    Level {level.id}: {level.name}
                  </h3>
                  <p className="text-sm text-gray-500">{level.description}</p>
                </div>
                <div className="divide-y">
                  {level.lessons.map((lesson) => {
                    const isCompleted = progress.completedLessons.includes(lesson.id)
                    const isCurrent = progress.currentLessonId === lesson.id
                    const isLocked = !isCompleted && !isCurrent &&
                      level.lessons.findIndex(l => l.id === lesson.id) >
                      level.lessons.findIndex(l => l.id === progress.currentLessonId || progress.completedLessons.includes(l.id))

                    return (
                      <div
                        key={lesson.id}
                        className={`px-6 py-4 flex items-center justify-between ${
                          isLocked ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCompleted
                              ? 'bg-green-100 text-green-600'
                              : isCurrent
                                ? 'bg-red-100 text-red-600'
                                : 'bg-gray-100 text-gray-400'
                          }`}>
                            {isCompleted ? (
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            ) : (
                              <span className="text-sm font-medium">{lesson.id}</span>
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              {lesson.title}
                              <span className="text-gray-400 ml-2 font-chinese">{lesson.titleChinese}</span>
                            </div>
                            <div className="text-sm text-gray-500">{lesson.description}</div>
                          </div>
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => startLesson(lesson.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                              isCurrent
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {isCompleted ? 'Review' : isCurrent ? 'Start' : 'Start'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  // Chat view
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-red-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView('home')}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-gray-800">{currentLesson?.title}</h1>
              <p className="text-xs text-gray-500">{currentLesson?.titleChinese}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">Pinyin</span>
              <button
                onClick={() => setShowPinyin(!showPinyin)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  showPinyin ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  showPinyin ? 'translate-x-5' : ''
                }`} />
              </button>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600">Auto-speak</span>
              <button
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  autoSpeak ? 'bg-red-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  autoSpeak ? 'translate-x-5' : ''
                }`} />
              </button>
            </label>
          </div>
        </div>

        {/* Lesson vocabulary reference */}
        {currentLesson && (
          <div className="bg-amber-50 border-t border-amber-100 px-4 py-2 overflow-x-auto">
            <div className="max-w-3xl mx-auto flex gap-3 text-sm">
              {currentLesson.vocabulary.slice(0, 5).map((v, i) => (
                <span key={i} className="whitespace-nowrap text-amber-800">
                  <span className="font-chinese">{v.chinese}</span>
                  <span className="text-amber-600 ml-1">({v.pinyin})</span>
                </span>
              ))}
              {currentLesson.vocabulary.length > 5 && (
                <span className="text-amber-600">+{currentLesson.vocabulary.length - 5} more</span>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
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

        {error && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-lg shadow-lg">
            {error}
          </div>
        )}

        {/* Lesson Complete Modal */}
        {showLessonComplete && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center">
              <div className="text-5xl mb-4">🎉</div>
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Lesson Complete!</h2>
              <p className="text-gray-600 mb-6">
                Great job! You've learned {currentLesson?.vocabulary.length} new words.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLessonComplete(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50"
                >
                  Keep Practicing
                </button>
                <button
                  onClick={handleCompleteLesson}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-full hover:shadow-lg"
                >
                  Next Lesson
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
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
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}

            {isSpeaking && (
              <button
                type="button"
                onClick={stopSpeaking}
                className="p-3 rounded-full bg-amber-500 text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              </button>
            )}

            <button
              type="submit"
              disabled={!inputText.trim() || isLoading}
              className="p-3 rounded-full bg-gradient-to-r from-red-500 to-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default App
