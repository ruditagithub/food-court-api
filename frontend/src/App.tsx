import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { ProfilePage } from './pages/auth/ProfilePage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { SuperAdminFoodCourtsPage } from './pages/superadmin/SuperAdminFoodCourtsPage'
import { FoodCourtProfilePage } from './pages/admin/FoodCourtProfilePage'
import { RoleGuard } from './components/auth/RoleGuard'
import { Preloader } from './components/animation/Preloader'
import { PageTransition } from './components/animation/PageTransition'

import { SuperAdminTenantsPage } from './pages/superadmin/SuperAdminTenantsPage'
import { SuperAdminMenusPage } from './pages/superadmin/SuperAdminMenusPage'
import { AdminTenantsPage } from './pages/admin/AdminTenantsPage'
import { TenantProfilePage } from './pages/tenant/TenantProfilePage'
import { TenantMenusPage } from './pages/tenant/TenantMenusPage'
import { CustomerMenuPage } from './pages/customer/CustomerMenuPage'
import { AdminTablesPage } from './pages/admin/AdminTablesPage'
import { TableScanResolverPage } from './pages/customer/TableScanResolverPage'
import { CheckoutPage } from './pages/customer/CheckoutPage'
import { OrderTrackingPage } from './pages/customer/OrderTrackingPage'
import { KitchenDisplayPage } from './pages/tenant/KitchenDisplayPage'
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage'
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'

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

        {/* Unified Food Court Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/app/dashboard" element={<DashboardPage />} />

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
        <Route
          path="/app/super-admin/menus"
          element={
            <RoleGuard allowedRoles={['admin', 'admin-food-court']}>
              <SuperAdminMenusPage />
            </RoleGuard>
          }
        />

        {/* Phase 4: Menus & Categories */}
        <Route
          path="/app/categories"
          element={
            <RoleGuard allowedRoles={['admin', 'admin-food-court', 'tenant']}>
              <CategoriesPage />
            </RoleGuard>
          }
        />
        <Route
          path="/app/tenant/menus"
          element={
            <RoleGuard allowedRoles={['tenant', 'admin']}>
              <TenantMenusPage />
            </RoleGuard>
          }
        />
        <Route path="/s/:qrToken" element={<CustomerMenuPage />} />
        <Route path="/scan/:qrToken" element={<TableScanResolverPage />} />
        {/* Phase 5: Tables */}
        <Route
          path="/app/admin/tables"
          element={
            <RoleGuard allowedRoles={['admin-food-court', 'admin', 'tenant']}>
              <AdminTablesPage />
            </RoleGuard>
          }
        />
        {/* Phase 6: Orders */}
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/track/:orderNumber" element={<OrderTrackingPage />} />
        <Route
          path="/app/tenant/kds"
          element={
            <RoleGuard allowedRoles={['tenant']}>
              <KitchenDisplayPage />
            </RoleGuard>
          }
        />
        <Route
          path="/app/admin/orders"
          element={
            <RoleGuard allowedRoles={['admin-food-court', 'admin', 'tenant']}>
              <AdminOrdersPage />
            </RoleGuard>
          }
        />
        <Route
          path="/app/tenant/orders"
          element={
            <RoleGuard allowedRoles={['tenant']}>
              <AdminOrdersPage />
            </RoleGuard>
          }
        />
        {/* Phase 7: Payments */}
        <Route
          path="/app/admin/payments"
          element={
            <RoleGuard allowedRoles={['admin-food-court', 'admin']}>
              <AdminPaymentsPage />
            </RoleGuard>
          }
        />

        {/* Fallback route redirects to landing page */}
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </>
  )
}

export default App
