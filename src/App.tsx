import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import Dashboard from "@/pages/dashboard/Dashboard";
import MemberList from "@/pages/consultant/MemberList";
import PackageManage from "@/pages/consultant/PackageManage";
import TransferApproval from "@/pages/consultant/TransferApproval";
import RefundManage from "@/pages/consultant/RefundManage";
import SchedulePage from "@/pages/coach/SchedulePage";
import Timetable from "@/pages/coach/Timetable";
import CoachStats from "@/pages/coach/CoachStats";
import BookingPage from "@/pages/member/BookingPage";
import MyPackages from "@/pages/member/MyPackages";
import Transactions from "@/pages/finance/Transactions";
import ClosingPage from "@/pages/finance/ClosingPage";
import Reconciliation from "@/pages/finance/Reconciliation";
import SimulatorPage from "@/pages/simulator/SimulatorPage";
import CourseLevels from "@/pages/admin/CourseLevels";
import Venues from "@/pages/admin/Venues";
import Stores from "@/pages/admin/Stores";
import AuditLog from "@/pages/admin/AuditLog";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/consultant/members" element={<MemberList />} />
          <Route path="/consultant/packages" element={<PackageManage />} />
          <Route path="/consultant/transfers" element={<TransferApproval />} />
          <Route path="/consultant/refunds" element={<RefundManage />} />
          <Route path="/coach/schedule" element={<SchedulePage />} />
          <Route path="/coach/timetable" element={<Timetable />} />
          <Route path="/coach/stats" element={<CoachStats />} />
          <Route path="/member/book" element={<BookingPage />} />
          <Route path="/member/packages" element={<MyPackages />} />
          <Route path="/finance/transactions" element={<Transactions />} />
          <Route path="/finance/closing" element={<ClosingPage />} />
          <Route path="/finance/reconciliation" element={<Reconciliation />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/admin/levels" element={<CourseLevels />} />
          <Route path="/admin/venues" element={<Venues />} />
          <Route path="/admin/stores" element={<Stores />} />
          <Route path="/admin/audit" element={<AuditLog />} />
        </Route>
      </Routes>
    </Router>
  );
}
