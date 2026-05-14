import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Home, UploadCloud, MessageSquare, Plus, FileSpreadsheet, ChevronLeft, ChevronRight, Trash2, Clock, X } from 'lucide-react'
import { supabase, datasetsEvents } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar({ isOpen, setIsOpen }) {
  const [datasets, setDatasets] = useState([])
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredItem, setHoveredItem] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const userInitials = (user?.user_metadata?.full_name || user?.email || '?')
    .split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const fetchDatasets = async () => {
    if (!user) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch('/api/datasets', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      const data = await response.json()
      setDatasets(data.datasets || [])
    } catch (err) {
      console.error('Failed to fetch datasets:', err)
    }
  }

  useEffect(() => {
    fetchDatasets()
    // Listen for changes from other components (e.g. Dashboard deletes)
    const unsubscribe = datasetsEvents.subscribe(fetchDatasets)
    const interval = setInterval(fetchDatasets, 30000)
    return () => { clearInterval(interval); unsubscribe() }
  }, [])

  const handleDelete = async (e, name) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`)
    if (!confirmDelete) return

    console.log('Attempting to delete via backend:', name)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      // Call our backend API instead of Supabase directly
      const response = await fetch(`/api/datasets/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })
      
      const result = await response.json()
      console.log('Backend delete response:', result)

      if (!response.ok) {
        alert(`Failed to delete: ${result.detail || 'Server error'}`)
        return
      }
      
      // Update local state
      setDatasets(prev => prev.filter(d => d.name !== name))
      
      // Clear chat history from localStorage
      localStorage.removeItem(`aether_chat_${name}`)
      
      // Notify other components (Dashboard) to refresh
      datasetsEvents.emit()
      
      // If currently viewing this chat, navigate away
      const currentFileId = decodeURIComponent(location.pathname.split('/').pop())
      if (currentFileId === name) {
        navigate('/dashboard')
      }
    } catch (err) {
      console.error('Failed to delete:', err)
      alert('An unexpected error occurred while deleting.')
    }
  }

  // Group datasets by time period
  const groupDatasets = (items) => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const groups = { today: [], week: [], month: [], older: [] }
    items.forEach(item => {
      const date = new Date(item.created_at)
      if (date >= today) groups.today.push(item)
      else if (date >= weekAgo) groups.week.push(item)
      else if (date >= monthAgo) groups.month.push(item)
      else groups.older.push(item)
    })
    return groups
  }

  const groups = groupDatasets(datasets)

  // Clean display name: strip timestamp prefix and extension
  const getDisplayName = (name, displayName) => {
    // If backend provided display_name, use it. Otherwise parse from name.
    const baseName = displayName || name.split('/').pop()
    const withoutTimestamp = baseName.replace(/^\d+_/, '')
    const withoutExt = withoutTimestamp.replace(/\.(csv|xlsx)$/i, '')
    return withoutExt || baseName
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isActiveChat = (name) => {
    return location.pathname === `/chat/${encodeURIComponent(name)}`
  }

  const navLinkClasses = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
      isActive
        ? 'bg-[#ede9f6] text-[#5D4492] font-semibold'
        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
    }`

  const renderGroup = (label, items) => {
    if (items.length === 0) return null
    return (
      <div key={label} className="mb-3">
        {!collapsed && (
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">{label}</p>
        )}
        {items.map(item => (
          <div
            key={item.name}
            className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 text-sm mb-0.5 cursor-pointer ${
              isActiveChat(item.name)
                ? 'bg-[#ede9f6] text-[#5D4492] font-semibold'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
            onClick={() => navigate(`/chat/${encodeURIComponent(item.name)}`)}
            onMouseEnter={() => setHoveredItem(item.name)}
            onMouseLeave={() => setHoveredItem(null)}
          >
            <FileSpreadsheet size={15} className="flex-shrink-0 opacity-60" />
            {!collapsed && (
              <>
                <span className="truncate flex-1 text-[13px]">{getDisplayName(item.name, item.display_name)}</span>
                <button
                  onClick={(e) => handleDelete(e, item.name)}
                  className="relative z-30 flex-shrink-0 p-2 -mr-2 rounded-md hover:bg-red-50 hover:text-red-500 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <aside
      className={`
        bg-white border-r border-gray-100 flex flex-col h-full transition-all duration-300 ease-in-out
        fixed md:relative z-50 md:z-auto
        ${collapsed ? 'md:w-[68px]' : 'md:w-[260px]'} 
        ${isOpen ? 'translate-x-0 w-[260px]' : '-translate-x-full md:translate-x-0 w-0 md:w-auto'}
        overflow-hidden
      `}
    >
      {/* Header */}
      <div className={`p-4 ${collapsed ? 'px-3' : 'px-5'} flex items-center justify-between border-b border-gray-50`}>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-[#5D4492] tracking-tight">Aether AI</h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">INTELLIGENCE ACTIVE</p>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors hidden md:block"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          {/* Mobile close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors md:hidden"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* New Analysis Button */}
      <div className={`p-3 ${collapsed ? 'px-2' : 'px-4'}`}>
        <button
          onClick={() => navigate('/upload')}
          className={`w-full py-2.5 bg-[#5D4492] hover:bg-[#4a3675] text-white rounded-xl flex justify-center items-center gap-2 transition-all duration-200 font-medium text-sm shadow-sm hover:shadow-md ${
            collapsed ? 'px-2' : 'px-4'
          }`}
        >
          <Plus size={16} strokeWidth={2.5} />
          {!collapsed && <span>New Analysis</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className={`px-3 ${collapsed ? 'px-2' : ''} mb-1`}>
        <NavLink to="/dashboard" className={navLinkClasses}>
          <Home size={18} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        <NavLink to="/upload" className={navLinkClasses}>
          <UploadCloud size={18} />
          {!collapsed && <span>Data Sources</span>}
        </NavLink>
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-gray-100" />

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin">
        {datasets.length === 0 ? (
          !collapsed && (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageSquare size={24} className="text-gray-300 mb-2" />
              <p className="text-xs text-gray-400">No analyses yet.</p>
              <p className="text-[10px] text-gray-300">Upload a dataset to begin.</p>
            </div>
          )
        ) : (
          <>
            {!collapsed && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <Clock size={10} />
                Recent Analyses
              </p>
            )}
            {renderGroup('Today', groups.today)}
            {renderGroup('Previous 7 Days', groups.week)}
            {renderGroup('Previous 30 Days', groups.month)}
            {renderGroup('Older', groups.older)}
          </>
        )}
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-gray-50">
        {user && (
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : 'px-2'}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5D4492] to-[#8b6cc1] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {userInitials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-700 truncate">
                  {user.user_metadata?.full_name || 'User'}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}
