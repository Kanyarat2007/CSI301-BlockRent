import { NavLink, Link } from "react-router-dom";
import {
  Store,
  PlusCircle,
  Package,
  KeyRound,
  ShieldCheck,
  Boxes,
} from "lucide-react";
import { useWallet } from "../context/WalletContext";
import WalletConnect from "./WalletConnect";

const ROLE_LABEL = { admin: "Admin", user: "ผู้ใช้งาน" };

export default function Navbar() {
  const { role, ownsAny, rentsAny } = useWallet();
  // เมนูแสดงตามบทบาท: Admin / ผู้ใช้ (Owner-Renter ตามความสัมพันธ์กับรายการ) / ยังไม่เชื่อมต่อ
  const items = [{ to: "/", label: "ตลาดอุปกรณ์", icon: Store, show: true }];
  items.push(
    {
      to: "/create",
      label: "ลงประกาศอุปกรณ์",
      icon: PlusCircle,
      show: role === "user",
    },
    {
      to: "/owner",
      label: "แดชบอร์ดเจ้าของ",
      icon: Package,
      show: role === "user" && ownsAny,
    },
    {
      to: "/renter",
      label: "แดชบอร์ดผู้เช่า",
      icon: KeyRound,
      show: role === "user" && rentsAny,
    },
    {
      to: "/admin",
      label: "จัดการระบบ",
      icon: ShieldCheck,
      show: role === "admin",
    },
  );
  return (
    <header className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand">
          <Boxes size={26} /> BlockRent
        </Link>
        <nav className="nav-links">
          {items
            .filter((i) => i.show)
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  "nav-link" + (isActive ? " active" : "")
                }
              >
                <Icon size={18} /> {label}
              </NavLink>
            ))}
        </nav>
        <div className="nav-right">
          {role !== "guest" && (
            <span className={`badge role-${role}`}>{ROLE_LABEL[role]}</span>
          )}
          <WalletConnect />
        </div>
      </div>
    </header>
  );
}
