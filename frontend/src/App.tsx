import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ProfilePage } from './pages/auth/ProfilePage'
import { Preloader } from './components/animation/Preloader'
import { PageTransition } from './components/animation/PageTransition'

function App() {
  const [loadingComplete, setLoadingComplete] = useState(false)

  return (
    <>
      {/* Intro Preloader Animation on Mount */}
      {!loadingComplete && (
        <Preloader onComplete={() => setLoadingComplete(true)} />
      )}

      {/* Shutter Curtain Page Transition when routes change */}
      <PageTransition />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/app/profile" element={<ProfilePage />} />
        {/* Fallback route redirects to landing page */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </>
  )
}

export default App
