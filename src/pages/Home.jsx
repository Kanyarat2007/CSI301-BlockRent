import { useState } from "react";
import { Search, Loader2, PackageOpen } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import EquipmentCard from "../components/EquipmentCard";

export default function Home() {
  const { equipments, loading } = useWallet();
  const [q, setQ] = useState("");
  const list = equipments.filter((e) =>
    (e.name + e.category + e.description)
      .toLowerCase()
      .includes(q.toLowerCase()),
  );
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>
            เช่าอุปกรณ์ได้อย่างมั่นใจ เงินมัดจำถูกเก็บไว้ใน Smart Contract
          </h1>
          <p>
            ชำระด้วย Test ETH บน Sepolia
            ระบบคืนเงินมัดจำให้อัตโนมัติเมื่อคืนอุปกรณ์เรียบร้อย
          </p>
          <div className="search">
            <Search size={20} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาอุปกรณ์ เช่น กล้อง, เลนส์, โดรน"
            />
          </div>
        </div>
      </section>
      <div className="container section">
        {loading ? (
          <p className="muted center">
            <Loader2 className="spin" size={20} /> กำลังโหลดข้อมูล…
          </p>
        ) : list.length === 0 ? (
          <div className="empty">
            <PackageOpen size={40} />
            <p>ยังไม่มีอุปกรณ์ที่ตรงกับการค้นหา</p>
          </div>
        ) : (
          <div className="grid-cards">
            {list.map((e) => (
              <EquipmentCard key={e.id} item={e} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
