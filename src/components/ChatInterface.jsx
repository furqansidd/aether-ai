import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ArrowUp, Loader2, Sparkles, BarChart3, Table2, TrendingUp, FileSpreadsheet } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import ReactMarkdown from 'react-markdown'

// Helper to get localStorage key for a given fileId
const chatStorageKey = (id) => `aether_chat_${id}`

export default function ChatInterface() {
  const { fileId } = useParams()
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(chatStorageKey(fileId))
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Clean display name: strip timestamp prefix and extension
  const displayName = decodeURIComponent(fileId || '')
    .replace(/^\d+_/, '')
    .replace(/\.(csv|xlsx)$/i, '')

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatStorageKey(fileId), JSON.stringify(messages))
    }
  }, [messages])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = async (text) => {
    const message = text || input
    if (!message.trim() || isLoading) return
    
    const userMsg = { role: 'user', content: message }
    const updatedHistory = [...messages, userMsg]
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      setMessages(prev => [...prev, aiMsg])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error analyzing your data. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const suggestedPrompts = [
    { icon: <Table2 size={16} />, text: 'Summarize this dataset', color: 'bg-[#ede9f6] text-[#5D4492]' },
    { icon: <BarChart3 size={16} />, text: 'Show me a bar chart of the top categories', color: 'bg-[#fef3c7] text-[#d97706]' },
    { icon: <TrendingUp size={16} />, text: 'What are the key trends?', color: 'bg-[#d1fae5] text-[#059669]' },
    { icon: <Sparkles size={16} />, text: 'Find any interesting patterns', color: 'bg-[#dbeafe] text-[#2563eb]' },
  ]

  const renderChart = (chartConfig) => {
    if (!chartConfig || !chartConfig.data || chartConfig.data.length === 0) return null
    
    const COLORS = ['#5D4492', '#d97706', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#f59e0b', '#06b6d4']
    const { type, data, xKey, yKey } = chartConfig

    if (type === 'bar') {
      return (
        <div className="h-64 w-full mt-4 bg-white rounded-xl p-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '13px'}} />
              <Bar dataKey={yKey} fill="#5D4492" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }
    
    if (type === 'line') {
      return (
        <div className="h-64 w-full mt-4 bg-white rounded-xl p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
              <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '13px'}} />
              <Line type="monotone" dataKey={yKey} stroke="#5D4492" strokeWidth={3} dot={{r: 4, strokeWidth: 2, fill: '#fff'}} activeDot={{r: 6, fill: '#5D4492'}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (type === 'pie') {
      return (
        <div className="h-64 w-full mt-4 bg-white rounded-xl p-3 flex justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={80} fill="#5D4492" label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)', fontSize: '13px'}} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )
    }

    return null
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto">

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-2">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
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
                    <p className="whitespace-pre-wrap leading-relaxed text-[15px]">{msg.content}</p>
                  ) : (
                    <div className="prose prose-sm max-w-none text-[15px] leading-relaxed
                      prose-headings:text-gray-900 prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                      prose-p:my-2 prose-p:text-gray-700
                      prose-strong:text-[#5D4492] prose-strong:font-semibold
                      prose-ul:my-2 prose-ul:pl-4 prose-li:my-0.5 prose-li:text-gray-700
                      prose-ol:my-2 prose-ol:pl-4
                      prose-code:bg-[#f0ecfc] prose-code:text-[#5D4492] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm prose-code:font-mono
                      prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-xl prose-pre:p-4
                      prose-table:border-collapse prose-th:bg-[#f5f5f7] prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-semibold prose-th:text-gray-600 prose-th:border prose-th:border-gray-200
                      prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-gray-100 prose-td:text-sm
                    ">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
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
      <div className="py-4">
        <div className="relative">
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
