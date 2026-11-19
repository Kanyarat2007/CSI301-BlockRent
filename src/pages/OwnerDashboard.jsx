import { Link } from "react-router-dom";
import { formatEther } from "ethers";
import { Pencil, Plus } from "lucide-react";
import { useWallet } from "../context/WalletContext";
import { RentalCard } from "../components/RentalStatus";
import EquipmentCard from "../components/EquipmentCard";
import TransactionHistory from "../components/TransactionHistory";
import { same } from "../blockchain/contract";

export default function OwnerDashboard() {
  const { account, equipments, rentals, pending } = useWallet();
  const mine = equipments.filter((e) => same(e.owner, account));
  const myRentals = rentals.filter((r) => same(r.owner, account));
  const waiting = myRentals.filter(
    (r) =>
      r.status === "ReturnRequested" ||
      (r.status === "Reserved" && !r.ownerConfirmedPickup),
  ).length;
  return (
    <div className="container section">
      <h1>แดชบอร์ดเจ้าของอุปกรณ์</h1>
      <div className="stats">
        <div className="card stat">
          <span className="muted">อุปกรณ์ของฉัน</span>
          <strong>{mine.length}</strong>
        </div>
        <div className="card stat">
          <span className="muted">รอดำเนินการ</span>
          <strong>{waiting}</strong>
        </div>
        <div className="card stat">
          <span className="muted">ถอนได้</span>
          <strong>{formatEther(pending)} ETH</strong>
        </div>
      </div>
      <h2>
        อุปกรณ์ของฉัน{" "}
        <Link className="btn btn-ghost" to="/create">
          <Plus size={18} /> ลงประกาศเพิ่ม
        </Link>
      </h2>
      <div className="grid-cards">
        {mine.map((e) => (
          <div key={e.id} className="stack">
            <EquipmentCard item={e} />
            <Link className="btn btn-ghost" to={`/equipment/${e.id}/edit`}>
              <Pencil size={16} /> แก้ไข
            </Link>
          </div>
        ))}
      </div>
      <h2>รายการที่มีผู้เช่า</h2>
      {myRentals.length === 0 ? (
        <p className="muted">ยังไม่มีผู้เช่าอุปกรณ์ของคุณ</p>
      ) : (
        <div className="stack">
          {myRentals.map((r) => (
            <RentalCard key={r.id} rental={r} />
          ))}
        </div>
      )}
      <TransactionHistory account={account} />
    </div>
  );
}
