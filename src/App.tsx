import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ensureDefaults } from './db/defaults'
import { applyRecurring } from './lib/recurring'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Spaces from './pages/Spaces'
import SpaceDetail from './pages/SpaceDetail'
import Shopping from './pages/Shopping'
import Wardrobe from './pages/Wardrobe'
import Budgets from './pages/Budgets'
import Recurring from './pages/Recurring'
import SettingsPage from './pages/Settings'

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    ensureDefaults()
      .then(applyRecurring)
      .finally(() => setReady(true))
  }, [])
  if (!ready) return null
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="espaces" element={<Spaces />} />
          <Route path="espaces/:id" element={<SpaceDetail />} />
          <Route path="courses" element={<Shopping />} />
          <Route path="garde-robe" element={<Wardrobe />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="abonnements" element={<Recurring />} />
          <Route path="reglages" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
