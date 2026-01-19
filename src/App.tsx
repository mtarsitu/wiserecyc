import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { ScaleProvider } from '@/contexts/ScaleContext'
import { Layout } from '@/components/layout'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { AcquisitionsPage } from '@/features/acquisitions/AcquisitionsPage'
import { SalesPage } from '@/features/sales/SalesPage'
import { ExpensesPage } from '@/features/expenses/ExpensesPage'
import { DismantlingPage } from '@/features/dismantling/DismantlingPage'
import { InventoryPage } from '@/features/inventory/InventoryPage'
import { SuppliersPage } from '@/features/suppliers/SuppliersPage'
import { ClientsPage } from '@/features/clients/ClientsPage'
import { ContractsPage } from '@/features/contracts/ContractsPage'
import { TransportersPage } from '@/features/transporters/TransportersPage'
import { MaterialsPage } from '@/features/materials/MaterialsPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { SuppliersReportPage } from '@/features/reports/SuppliersReportPage'
import { ExpensesReportPage } from '@/features/reports/ExpensesReportPage'
import { ContractsReportPage } from '@/features/reports/ContractsReportPage'
import { DEEEReportPage } from '@/features/reports/DEEEReportPage'
import { ProfitReportPage } from '@/features/reports/ProfitReportPage'
import { PricesReportPage } from '@/features/reports/PricesReportPage'
import { SalaryAdvancesReportPage } from '@/features/reports/SalaryAdvancesReportPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AdminPage } from '@/features/admin/AdminPage'
import { SetupPage } from '@/features/setup/SetupPage'
import { CashierPage } from '@/features/cashier/CashierPage'
import { EmployeesPage } from '@/features/employees/EmployeesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ScaleProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/achizitii" element={<AcquisitionsPage />} />
              <Route path="/vanzari" element={<SalesPage />} />
              <Route path="/cheltuieli" element={<ExpensesPage />} />
              <Route path="/casierie" element={<CashierPage />} />
              <Route path="/dezmembrari" element={<DismantlingPage />} />
              <Route path="/stocuri" element={<InventoryPage />} />
              <Route path="/furnizori" element={<SuppliersPage />} />
              <Route path="/clienti" element={<ClientsPage />} />
              <Route path="/contracte" element={<ContractsPage />} />
              <Route path="/transportatori" element={<TransportersPage />} />
              <Route path="/materiale" element={<MaterialsPage />} />
              <Route path="/salariati" element={<EmployeesPage />} />
              <Route path="/rapoarte" element={<ReportsPage />} />
              <Route path="/rapoarte/contracte" element={<ContractsReportPage />} />
              <Route path="/rapoarte/deee" element={<DEEEReportPage />} />
              <Route path="/rapoarte/furnizori" element={<SuppliersReportPage />} />
              <Route path="/rapoarte/profit" element={<ProfitReportPage />} />
              <Route path="/rapoarte/preturi" element={<PricesReportPage />} />
              <Route path="/rapoarte/stocuri" element={<InventoryPage />} />
              <Route path="/rapoarte/cheltuieli" element={<ExpensesReportPage />} />
              <Route path="/rapoarte/avansuri" element={<SalaryAdvancesReportPage />} />
              <Route path="/setari" element={<SettingsPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ScaleProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
