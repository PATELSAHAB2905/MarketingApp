import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import TopNavbar from './components/layout/TopNavbar';
import AdminSidebar from './components/layout/AdminSidebar';
import MarketerBottomNav from './components/layout/MarketerBottomNav';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import MdoReport from './pages/admin/MdoReport';
import LiveTracking from './pages/admin/LiveTracking';
import DailyActivity from './pages/admin/DailyActivity';
import OrdersList from './pages/admin/OrdersList';
import CollectionsHandover from './pages/admin/CollectionsHandover';
import ReturnsAnalysis from './pages/admin/ReturnsAnalysis';
import ShopsMaster from './pages/admin/ShopsMaster';
import MarketsMaster from './pages/admin/MarketsMaster';
import MarketRoutesMaster from './pages/admin/MarketRoutesMaster';
import MarketsRoutes from './pages/admin/MarketsRoutes';
import MarketersMaster from './pages/admin/MarketersMaster';
import FollowUpsAdmin from './pages/admin/FollowUpsAdmin';
import FuelManagement from './pages/admin/FuelManagement';
import TargetManagement from './pages/admin/TargetManagement';
import PerformanceReports from './pages/admin/PerformanceReports';
import PartyStatement from './pages/admin/PartyStatement';
import AllTransactions from './pages/admin/AllTransactions';
import OldDataImport from './pages/admin/OldDataImport';
import DataImport from './pages/admin/DataImport';
import GoogleSheetsSetup from './pages/admin/GoogleSheetsSetup';
import GoogleSheetsExport from './pages/admin/GoogleSheetsExport';
import AuditLogs from './pages/admin/AuditLogs';
import SystemSettings from './pages/admin/SystemSettings';

// Marketer Pages
import MarketerDashboard from './pages/marketer/MarketerDashboard';

function MainLayout() {
  const { currentUser } = useAuth();
  const [adminTab, setAdminTab] = useState('dashboard');
  const [marketerTab, setMarketerTab] = useState('home');

  const isAdmin = currentUser?.role === 'ADMIN';

  const renderAdminContent = () => {
    switch (adminTab) {
      case 'dashboard':
        return <AdminDashboard onNavigate={(tab) => setAdminTab(tab)} />;
      case 'all-transactions':
        return <AllTransactions />;
      case 'old-data-import':
        return <OldDataImport onNavigate={(tab) => setAdminTab(tab)} />;
      case 'party-statement':
        return <PartyStatement />;
      case 'mdo':
        return <MdoReport />;
      case 'tracking':
        return <LiveTracking />;
      case 'daily':
        return <DailyActivity />;
      case 'orders':
        return <OrdersList />;
      case 'collections':
        return <CollectionsHandover />;
      case 'returns':
        return <ReturnsAnalysis />;
      case 'shops':
        return <ShopsMaster />;
      case 'markets':
        return <MarketsMaster />;
      case 'market-routes-master':
        return <MarketRoutesMaster />;
      case 'routes':
        return <MarketsRoutes />;
      case 'marketers':
        return <MarketersMaster />;
      case 'followups':
        return <FollowUpsAdmin />;
      case 'fuel':
        return <FuelManagement />;
      case 'targets':
        return <TargetManagement />;
      case 'reports':
        return <PerformanceReports />;
      case 'data-import':
        return <DataImport />;
      case 'sheets-setup':
        return <GoogleSheetsSetup />;
      case 'sheets':
        return <GoogleSheetsExport />;
      case 'audit':
        return <AuditLogs />;
      case 'settings':
        return <SystemSettings />;
      default:
        return <AdminDashboard onNavigate={(tab) => setAdminTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
      <TopNavbar />

      {isAdmin ? (
        <div className="flex-1 flex overflow-hidden">
          <AdminSidebar activeTab={adminTab} setActiveTab={setAdminTab} />
          <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
            {renderAdminContent()}
          </main>
        </div>
      ) : (
        <main className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
          <MarketerDashboard activeTab={marketerTab} setActiveTab={setMarketerTab} />
          <MarketerBottomNav activeTab={marketerTab} setActiveTab={setMarketerTab} />
        </main>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <MainLayout />
      </DataProvider>
    </AuthProvider>
  );
}
