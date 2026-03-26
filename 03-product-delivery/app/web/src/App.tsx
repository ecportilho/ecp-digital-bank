import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { MobileNav } from './components/layout/MobileNav'
import { LoginPage } from './routes/login'
import { RegisterPage } from './routes/register'
import { DashboardPage } from './routes/dashboard'
import { ExtratoPage } from './routes/extrato'
import { PixEnviarPage } from './routes/pix/enviar'
import { PixReceberPage } from './routes/pix/receber'
import { PixChavesPage } from './routes/pix/chaves'
import { CartoesPage } from './routes/cartoes'
import { PagamentosPage } from './routes/pagamentos'
import { PerfilPage } from './routes/perfil'
import { ChatPage } from './routes/chat'
import { ChatWidget } from './components/chat/ChatWidget'

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex h-screen bg-background text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <MobileNav />
      <ChatWidget />
    </div>
  )
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {children}
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          <PublicLayout>
            <LoginPage />
          </PublicLayout>
        } />
        <Route path="/register" element={
          <PublicLayout>
            <RegisterPage />
          </PublicLayout>
        } />

        {/* Protected routes */}
        <Route path="/" element={
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        } />
        <Route path="/extrato" element={
          <ProtectedLayout>
            <ExtratoPage />
          </ProtectedLayout>
        } />
        <Route path="/pix/enviar" element={
          <ProtectedLayout>
            <PixEnviarPage />
          </ProtectedLayout>
        } />
        <Route path="/pix/receber" element={
          <ProtectedLayout>
            <PixReceberPage />
          </ProtectedLayout>
        } />
        <Route path="/pix/chaves" element={
          <ProtectedLayout>
            <PixChavesPage />
          </ProtectedLayout>
        } />
        <Route path="/cartoes" element={
          <ProtectedLayout>
            <CartoesPage />
          </ProtectedLayout>
        } />
        <Route path="/pagamentos" element={
          <ProtectedLayout>
            <PagamentosPage />
          </ProtectedLayout>
        } />
        <Route path="/perfil" element={
          <ProtectedLayout>
            <PerfilPage />
          </ProtectedLayout>
        } />
        <Route path="/chat" element={
          <ProtectedLayout>
            <ChatPage />
          </ProtectedLayout>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
