import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Lock, X, ExternalLink } from "lucide-react";
import { WalletProvider, useWallet } from "./context/WalletContext";
import { ETHERSCAN_TX } from "./blockchain/contract";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import EquipmentDetail from "./pages/EquipmentDetail";
import CreateEquipment from "./pages/CreateEquipment";
import OwnerDashboard from "./pages/OwnerDashboard";
import RenterDashboard from "./pages/RenterDashboard";
import RentalDetail from "./pages/RentalDetail";
import AdminDashboard from "./pages/AdminDashboard";

// จำกัดหน้าตาม Role: user = Owner/Renter, admin = ผู้ดูแลระบบ
function Guard({ roles, children }) {
  const { role, connect } = useWallet();
  if (roles.includes(role)) return children;
  return (
    <div className="container section empty">
      <Lock size={40} />
      <p>
        {role === "guest"
          ? "กรุณาเชื่อมต่อ MetaMask เพื่อใช้งานหน้านี้"
          : "บัญชีนี้ไม่มีสิทธิ์เข้าหน้านี้"}
      </p>
      {role === "guest" && (
        <button className="btn btn-primary" onClick={connect}>
          เชื่อมต่อ MetaMask
        </button>
      )}
    </div>
  );
}

function Toast() {
  const { toast, setToast } = useWallet();
  if (!toast) return null;
  return (
    <div className={`toast t-${toast.type}`} role="status">
      <span>
        {toast.text}
        {toast.hash && (
          <>
            {" "}
            <a
              href={ETHERSCAN_TX + toast.hash}
              target="_blank"
              rel="noreferrer"
            >
              ดู Transaction <ExternalLink size={13} />
            </a>
          </>
        )}
      </span>
      <button
        className="icon-only btn-ghost btn"
        onClick={() => setToast(null)}
      >
        <X size={16} />
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <WalletProvider>
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route
              path="/equipment/:id/edit"
              element={
                <Guard roles={["user"]}>
                  <CreateEquipment />
                </Guard>
              }
            />
            <Route
              path="/create"
              element={
                <Guard roles={["user"]}>
                  <CreateEquipment />
                </Guard>
              }
            />
            <Route
              path="/owner"
              element={
                <Guard roles={["user"]}>
                  <OwnerDashboard />
                </Guard>
              }
            />
            <Route
              path="/renter"
              element={
                <Guard roles={["user"]}>
                  <RenterDashboard />
                </Guard>
              }
            />
            <Route
              path="/rental/:id"
              element={
                <Guard roles={["user", "admin"]}>
                  <RentalDetail />
                </Guard>
              }
            />
            <Route
              path="/admin"
              element={
                <Guard roles={["admin"]}>
                  <AdminDashboard />
                </Guard>
              }
            />
          </Routes>
        </main>
        <Toast />
      </WalletProvider>
    </BrowserRouter>
  );
}
