import { useWallet } from "../context/WalletContext";
import { RentalCard } from "../components/RentalStatus";
import TransactionHistory from "../components/TransactionHistory";

export default function AdminDashboard() {
  const { rentals } = useWallet();
  const disputed = rentals.filter((r) => r.status === "Disputed");
  return (
    <div className="container section">
      <h1>แดชบอร์ดผู้ดูแลระบบ</h1>
      <div className="stats">
        <div className="card stat">
          <span className="muted">รายการเช่าทั้งหมด</span>
          <strong>{rentals.length}</strong>
        </div>
        <div className="card stat">
          <span className="muted">รอตัดสินข้อพิพาท</span>
          <strong>{disputed.length}</strong>
        </div>
      </div>
      <h2>ข้อพิพาทที่รอพิจารณา</h2>
      {disputed.length === 0 ? (
        <p className="muted">ไม่มีข้อพิพาทค้างอยู่</p>
      ) : (
        <div className="stack">
          {disputed.map((r) => (
            <RentalCard key={r.id} rental={r} />
          ))}
        </div>
      )}
      <h2>รายการเช่าทั้งหมด</h2>
      <div className="stack">
        {rentals.map((r) => (
          <RentalCard key={r.id} rental={r} />
        ))}
      </div>
      <TransactionHistory />
    </div>
  );
}
