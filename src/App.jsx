import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Routes, Route, Outlet, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LandingPage from './components/LandingPage'
import AuthPage from './components/AuthPage'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import FileUpload from './components/FileUpload'
import ChatInterface from './components/ChatInterface'
import UserMenu from './components/UserMenu'
import { Loader2, Menu } from 'lucide-react'

const queryClient = new QueryClient()

// Protected route wrapper — redirects to /auth if not signed in
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#f9f9fb]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="text-[#5D4492] animate-spin" />
          <p className="text-sm text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/auth" replace />
  return children
}

// Redirect away from auth page if already signed in
function AuthRoute() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return <AuthPage />
}

function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[#f9f9fb] text-[#1f2937] font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between md:justify-end px-4 md:px-6 py-3 bg-[#f9f9fb] border-b border-gray-100/60 z-30">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-gray-500 hover:text-[#5D4492] md:hidden"
          >
            <Menu size={24} />
          </button>
          <UserMenu />
        </header>

        <main className="flex-1 overflow-hidden relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// Wrapper that forces ChatInterface to remount when fileId changes
function ChatWrapper() {
  const params = useParams()
  // React Router v6 splat is stored in the "*" property
  const fileId = params['*']
  return <ChatInterface key={fileId} fileId={fileId} />
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthRoute />} />
            <Route element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/upload" element={<FileUpload />} />
              <Route path="/chat/*" element={<ChatWrapper />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
