import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileSpreadsheet, UploadCloud, TrendingUp, Database, ArrowRight, Trash2, BarChart3, Sparkles } from 'lucide-react'
import { supabase, datasetsEvents } from '../lib/supabase'

export default function Dashboard() {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const fetchDatasets = async () => {
    try {
      const res = await fetch('/api/datasets')
      const data = await res.json()
      setDatasets(data.datasets || [])
    } catch (err) {
      console.error('Failed to fetch datasets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
    // Listen for changes from other components (e.g. Sidebar deletes)
    const unsubscribe = datasetsEvents.subscribe(fetchDatasets)
    return () => unsubscribe()
  }, [])

  const handleDelete = async (name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`)
    if (!confirmDelete) return

    try {
      const response = await fetch(`/api/datasets/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()

      if (!response.ok) {
        alert(`Failed to delete: ${result.detail || 'Server error'}`)
        return
      }

      setDatasets(prev => prev.filter(d => d.name !== name))
      localStorage.removeItem(`aether_chat_${name}`)
      // Notify other components (Sidebar) to refresh
      datasetsEvents.emit()
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('An unexpected error occurred.')
    }
  }

  const getDisplayName = (name) => {
    const withoutTimestamp = name.replace(/^\d+_/, '')
    const withoutExt = withoutTimestamp.replace(/\.(csv|xlsx)$/i, '')
    return withoutExt || name
  }

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '—'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="flex-1 overflow-y-auto h-full p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-[#5D4492]" />
            <p className="text-sm font-medium text-[#5D4492]">Aether Intelligence</p>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">{getGreeting()} 👋</h2>
          <p className="text-gray-500">Here's an overview of your data workspace.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-[#ede9f6] p-2.5 rounded-xl">
                <Database size={20} className="text-[#5D4492]" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{datasets.length}</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Datasets</p>
            <p className="text-xs text-gray-400 mt-0.5">Uploaded to Aether</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-[#fef3c7] p-2.5 rounded-xl">
                <BarChart3 size={20} className="text-[#d97706]" />
              </div>
              <span className="text-2xl font-bold text-gray-900">{datasets.length}</span>
            </div>
            <p className="text-sm font-medium text-gray-600">Analyses Available</p>
            <p className="text-xs text-gray-400 mt-0.5">Ready for conversation</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-[#d1fae5] p-2.5 rounded-xl">
                <TrendingUp size={20} className="text-[#059669]" />
              </div>
              <span className="text-2xl font-bold text-gray-900">
                {formatFileSize(datasets.reduce((sum, d) => sum + (d.size || 0), 0))}
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Data Size</p>
            <p className="text-xs text-gray-400 mt-0.5">Across all files</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <button
            onClick={() => navigate('/upload')}
            className="group bg-gradient-to-br from-[#5D4492] to-[#422c7a] text-white rounded-2xl p-6 text-left hover:shadow-lg transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative z-10">
              <div className="bg-white/20 p-3 rounded-xl w-fit mb-4">
                <UploadCloud size={24} />
              </div>
              <h3 className="text-lg font-bold mb-1">Upload New Dataset</h3>
              <p className="text-sm text-white/70 mb-4">Drag & drop CSV or Excel files to begin analysis.</p>
              <div className="flex items-center gap-1 text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                <span>Get started</span>
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>

          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="bg-[#f5f5f7] p-3 rounded-xl w-fit mb-4">
                <Sparkles size={24} className="text-[#5D4492]" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">AI-Powered Insights</h3>
              <p className="text-sm text-gray-500">Ask questions in natural language and get instant charts, stats, and data breakdowns.</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="bg-[#ede9f6] text-[#5D4492] px-3 py-1 rounded-full text-xs font-medium">Natural Language</span>
              <span className="bg-[#fef3c7] text-[#d97706] px-3 py-1 rounded-full text-xs font-medium">Auto Charts</span>
              <span className="bg-[#d1fae5] text-[#059669] px-3 py-1 rounded-full text-xs font-medium">LangChain</span>
            </div>
          </div>
        </div>

        {/* Recent Datasets Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Your Datasets</h3>
              <p className="text-xs text-gray-400 mt-0.5">Click any dataset to start analyzing</p>
            </div>
            <button
              onClick={() => navigate('/upload')}
              className="text-sm text-[#5D4492] hover:text-[#4a3675] font-medium flex items-center gap-1 transition-colors"
            >
              <Plus size={14} />
              <span>Add new</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block w-6 h-6 border-2 border-[#5D4492] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm text-gray-400">Loading datasets...</p>
            </div>
          ) : datasets.length === 0 ? (
            <div className="p-12 text-center">
              <FileSpreadsheet size={40} className="text-gray-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-500 mb-1">No datasets yet</p>
              <p className="text-xs text-gray-400 mb-4">Upload your first CSV or Excel file to get started.</p>
              <button
                onClick={() => navigate('/upload')}
                className="bg-[#5D4492] hover:bg-[#4a3675] text-white text-sm px-5 py-2 rounded-xl font-medium transition-colors"
              >
                Upload Dataset
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {datasets.map((dataset) => (
                <div
                  key={dataset.name}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/70 cursor-pointer transition-colors group"
                  onClick={() => navigate(`/chat/${encodeURIComponent(dataset.name)}`)}
                >
                  <div className="bg-[#ede9f6] p-2.5 rounded-xl flex-shrink-0">
                    <FileSpreadsheet size={18} className="text-[#5D4492]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{getDisplayName(dataset.name)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(dataset.created_at)} • {formatTime(dataset.created_at)} • {formatFileSize(dataset.size)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(dataset.name)
                      }}
                      className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete dataset"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ArrowRight size={16} className="text-gray-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Plus({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
