import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ProfilePage } from './pages/auth/ProfilePage'
import { SuperAdminFoodCourtsPage } from './pages/superadmin/SuperAdminFoodCourtsPage'
import { FoodCourtProfilePage } from './pages/admin/FoodCourtProfilePage'
import { RoleGuard } from './components/auth/RoleGuard'
import { Preloader } from './components/animation/Preloader'
import { PageTransition } from './components/animation/PageTransition'

import { SuperAdminTenantsPage } from './pages/superadmin/SuperAdminTenantsPage'
import { AdminTenantsPage } from './pages/admin/AdminTenantsPage'
import { TenantProfilePage } from './pages/tenant/TenantProfilePage'
import { TenantMenusPage } from './pages/tenant/TenantMenusPage'
import { CustomerMenuPage } from './pages/customer/CustomerMenuPage'

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

        {/* Phase 2: Food Courts */}
        <Route
          path="/app/super-admin/food-courts"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <SuperAdminFoodCourtsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/app/admin/food-court"
          element={
            <RoleGuard allowedRoles={['admin-food-court', 'admin']}>
              <FoodCourtProfilePage />
            </RoleGuard>
          }
        />

        {/* Phase 3: Tenants */}
        <Route
          path="/app/admin/tenants"
          element={
            <RoleGuard allowedRoles={['admin-food-court', 'admin']}>
              <AdminTenantsPage />
            </RoleGuard>
          }
        />
        <Route
          path="/app/tenant/profile"
          element={
            <RoleGuard allowedRoles={['tenant']}>
              <TenantProfilePage />
            </RoleGuard>
          }
        />
        <Route
          path="/app/super-admin/tenants"
          element={
            <RoleGuard allowedRoles={['admin']}>
              <SuperAdminTenantsPage />
            </RoleGuard>
          }
        />

        {/* Phase 4: Menus & Categories */}
        <Route
          path="/app/tenant/menus"
          element={
            <RoleGuard allowedRoles={['tenant']}>
              <TenantMenusPage />
            </RoleGuard>
          }
        />
        <Route path="/s/:qrToken" element={<CustomerMenuPage />} />

        {/* Fallback route redirects to landing page */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </>
  )
}

export default App
