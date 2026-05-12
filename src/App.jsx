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
import { Loader2 } from 'lucide-react'

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
  return (
    <div className="flex h-screen bg-[#f9f9fb] text-[#1f2937] font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar with profile icon */}
        <header className="flex items-center justify-end px-6 py-3 bg-[#f9f9fb] border-b border-gray-100/60">
          <UserMenu />
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// Wrapper that forces ChatInterface to remount when fileId changes
function ChatWrapper() {
  const { fileId } = useParams()
  return <ChatInterface key={fileId} />
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
              <Route path="/chat/:fileId" element={<ChatWrapper />} />
            </Route>
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App
