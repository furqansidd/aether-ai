import React, { Component, useState, useRef, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowUp, Loader2, Sparkles, BarChart3, Table2, TrendingUp, FileSpreadsheet } from 'lucide-react'
import PlotComponent from 'react-plotly.js'

// Vite/CommonJS interop: ensure Plot is a valid React component
const Plot = typeof PlotComponent === 'object' && PlotComponent.default ? PlotComponent.default : PlotComponent

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { supabase, sessionEvents } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, errorInfo) {
    console.error("Chart rendering error:", error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error ? this.state.error.toString() : "Unknown error"
      return (
        <div className="h-80 w-full mt-4 bg-red-50 rounded-xl p-6 flex flex-col items-center justify-center text-red-500 border border-red-100">
          <BarChart3 size={32} className="mb-2 opacity-50" />
          <p className="text-sm font-medium">Could not render chart</p>
          <p className="text-xs opacity-80 mt-1 text-center">The AI provided an invalid chart format.</p>
          <p className="text-[10px] opacity-60 mt-2 font-mono text-center max-w-full overflow-hidden text-ellipsis">{errorMsg}</p>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ChatInterface({ fileId }) {
  const { user } = useAuth()

  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState([])      // single source of truth
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(true) // loading from Supabase
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Clean display name: strip folder prefix, timestamp prefix and extension
  const displayName = decodeURIComponent(fileId || '')
    .split('/').pop() // get only filename
    .replace(/^\d+_/, '')
    .replace(/\.(csv|xlsx)$/i, '')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // ── Load conversation from Supabase on mount ───────────────────────────────
  // This is the ONLY place messages are loaded from. localStorage is not used.
  // Because ChatWrapper uses key={fileId}, this effect reruns for every new file.
  useEffect(() => {
    if (!user || !fileId) {
      setHistoryLoading(false)
      return
    }

    let cancelled = false

    const loadHistory = async () => {
      setHistoryLoading(true)
      setMessages([]) // always start clean — prevents stale state from previous file

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('messages')
          .eq('user_id', user.id)
          .eq('file_id', fileId)
          .maybeSingle()

        if (!cancelled) {
          if (error) {
            console.error('Failed to load conversation:', error)
          } else if (data?.messages?.length > 0) {
            setMessages(data.messages)
          }
          // If no record → leave as [] (fresh chat)
        }
      } catch (err) {
        console.error('Unexpected error loading history:', err)
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }

    loadHistory()

    return () => { cancelled = true }
  }, [fileId, user])

  // ── Listen for logout event → immediately wipe local messages ──────────────
  useEffect(() => {
    const unsubscribe = sessionEvents.subscribe((event) => {
      if (event === 'signout') {
        setMessages([])
      }
    })
    return unsubscribe
  }, [])

  // ── Persist messages to Supabase whenever they change ─────────────────────
  // Uses upsert on (user_id, file_id) unique constraint so it's idempotent.
  const persistMessages = useCallback(async (updatedMessages) => {
    if (!user || !fileId || updatedMessages.length === 0) return
    try {
      await supabase
        .from('conversations')
        .upsert(
          {
            user_id: user.id,
            file_id: fileId,
            messages: updatedMessages,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,file_id' }
        )
    } catch (err) {
      console.error('Failed to persist conversation:', err)
    }
  }, [user, fileId])

  // ── Scroll to bottom when messages update ─────────────────────────────────
  useEffect(() => {
    if (!historyLoading) scrollToBottom()
  }, [messages, isLoading, historyLoading])

  useEffect(() => {
    if (!historyLoading) inputRef.current?.focus()
  }, [historyLoading])

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = async (text) => {
    const message = text || input
    if (!message.trim() || isLoading) return

    const userMsg = { role: 'user', content: message }
    const updatedHistory = [...messages, userMsg]

    setMessages(updatedHistory)
    setInput('')
    setIsLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          file_path: decodeURIComponent(fileId),
          message,
          history: updatedHistory
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to fetch from server')
      }

      const aiMsg = {
        role: 'assistant',
        content: data.response,
        chart: data.chart
      }

      const finalMessages = [...updatedHistory, aiMsg]
      setMessages(finalMessages)

      // Persist the full updated conversation to Supabase
      await persistMessages(finalMessages)

    } catch (error) {
      console.error(error)
      const errorMessage = error.message || 'Sorry, I encountered an error analyzing your data. Please try again.'
      const errMsg = { role: 'assistant', content: `Error: ${errorMessage}` }
      const finalMessages = [...updatedHistory, errMsg]
      setMessages(finalMessages)
      await persistMessages(finalMessages)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Suggested prompts ─────────────────────────────────────────────────────
  const suggestedPrompts = [
    { icon: <Table2 size={16} />, text: 'Summarize this dataset', color: 'bg-[#ede9f6] text-[#5D4492]' },
    { icon: <BarChart3 size={16} />, text: 'Show me a bar chart of the top categories', color: 'bg-[#fef3c7] text-[#d97706]' },
    { icon: <TrendingUp size={16} />, text: 'What are the key trends?', color: 'bg-[#d1fae5] text-[#059669]' },
    { icon: <Sparkles size={16} />, text: 'Find any interesting patterns', color: 'bg-[#dbeafe] text-[#2563eb]' },
  ]

  // ── Chart renderer ────────────────────────────────────────────────────────
  const renderChart = (chartConfig) => {
    if (!chartConfig || !chartConfig.data) return null
    
    // Ensure data is an array (Plotly requirement)
    let plotData = chartConfig.data
    if (!Array.isArray(plotData)) {
      if (typeof plotData === 'object' && plotData !== null) {
        plotData = [plotData] // Wrap single object in array
      } else {
        console.error("Invalid chart data format:", plotData)
        return null // Will trigger the error boundary if it throws, but we gracefully handle it
      }
    }

    const plotLayout = typeof chartConfig.layout === 'object' && chartConfig.layout !== null ? chartConfig.layout : {}

    // Support both the new Plotly JSON format and gracefully fallback if possible,
    // though the agent is instructed to use Plotly's structure natively.
    return (
      <ChartErrorBoundary>
        <div className="h-80 w-full mt-4 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <Plot
            data={plotData}
            layout={{
              ...plotLayout,
              autosize: true,
              margin: { t: 40, r: 20, l: 40, b: 40 },
              font: { family: 'Inter, sans-serif' },
              paper_bgcolor: 'transparent',
              plot_bgcolor: 'transparent'
            }}
            useResizeHandler={true}
            style={{ width: '100%', height: '100%' }}
            config={{ responsive: true, displayModeBar: true, displaylogo: false }}
          />
        </div>
      </ChartErrorBoundary>
    )
  }

  // ── Loading skeleton while fetching history ───────────────────────────────
  if (historyLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto items-center justify-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5D4492] to-[#8b6cc1] flex items-center justify-center">
          <Sparkles size={14} className="text-white" />
        </div>
        <p className="text-sm text-gray-400">Loading conversation...</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full max-w-4xl mx-auto overflow-hidden">

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6">
        {messages.length === 0 ? (
          /* ── Empty state: Gemini/ChatGPT-style welcome ── */
          <div className="flex flex-col items-center justify-center h-full -mt-8">
            {/* Logo + Greeting */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5D4492] to-[#8b6cc1] shadow-lg shadow-[#5D4492]/20 mb-5">
                <Sparkles size={26} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What can I help you discover?
              </h2>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <FileSpreadsheet size={14} />
                <span>Analyzing <span className="font-medium text-[#5D4492]">{displayName}</span></span>
              </div>
            </div>

            {/* Suggested Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl px-4 md:px-0">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(prompt.text)}
                  className="group flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 text-left hover:border-[#5D4492]/30 hover:shadow-md transition-all duration-200"
                >
                  <div className={`p-2 rounded-xl ${prompt.color} flex-shrink-0`}>
                    {prompt.icon}
                  </div>
                  <span className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors leading-tight">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* ── Chat Messages ── */
          <div className="py-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5D4492] to-[#8b6cc1] flex-shrink-0 flex items-center justify-center shadow-sm">
                    <Sparkles size={14} className="text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-[#5D4492] text-white rounded-2xl rounded-br-sm px-4 py-3'
                    : 'bg-transparent text-gray-800'
                }`}>
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed text-[14px] md:text-[15px]">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none text-[14px] md:text-[15px] leading-relaxed
                      prose-headings:text-gray-900 prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                      prose-p:my-2 prose-p:text-gray-700
                      prose-strong:text-[#5D4492] prose-strong:font-semibold
                      prose-ul:my-2 prose-ul:pl-4 prose-li:my-0.5 prose-li:text-gray-700
                      prose-ol:my-2 prose-ol:pl-4
                      prose-code:bg-[#f0ecfc] prose-code:text-[#5D4492] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono
                      prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:p-4
                      /* Table Styling Fixes */
                      prose-table:block prose-table:overflow-x-auto prose-table:w-full prose-table:border-collapse prose-table:my-6
                      prose-th:bg-[#f8f7ff] prose-th:px-4 prose-th:py-3 prose-th:text-left prose-th:text-[11px] prose-th:uppercase prose-th:tracking-wider prose-th:font-bold prose-th:text-[#5D4492] prose-th:border prose-th:border-[#e9e4f5]
                      prose-td:px-4 prose-td:py-3 prose-td:border prose-td:border-gray-100 prose-td:text-sm prose-td:text-gray-600
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                  {msg.chart && renderChart(msg.chart)}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5D4492] to-[#8b6cc1] flex-shrink-0 flex items-center justify-center shadow-sm">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="flex items-center gap-2 text-gray-400 py-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[#5D4492] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-[#5D4492] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[#5D4492] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-sm font-medium ml-1">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="py-4 px-4 md:px-6 border-t border-gray-50 bg-white/80 backdrop-blur-md">
        <div className="relative max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask anything about ${displayName}...`}
            className="w-full bg-white border border-gray-200 text-gray-800 rounded-2xl py-4 pl-5 pr-14 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#5D4492]/30 focus:border-[#5D4492]/40 transition-all text-[15px]"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square bg-[#5D4492] hover:bg-[#4a3675] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl flex justify-center items-center transition-all duration-200"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} />}
          </button>
        </div>
        <p className="text-[11px] text-gray-300 text-center mt-2">Aether AI can make mistakes. Verify important data.</p>
      </div>
    </div>
  )
}
