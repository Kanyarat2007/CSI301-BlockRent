import { formatEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { RentalCard } from "../components/RentalStatus";
import TransactionHistory from "../components/TransactionHistory";
import { same } from "../blockchain/contract";

export default function RenterDashboard() {
  const { account, rentals, pending } = useWallet();
  const mine = rentals.filter((r) => same(r.renter, account));
  return (
    <div className="container section">
      <h1>แดชบอร์ดผู้เช่า</h1>
      <div className="stats">
        <div className="card stat">
          <span className="muted">รายการเช่าทั้งหมด</span>
          <strong>{mine.length}</strong>
        </div>
        <div className="card stat">
          <span className="muted">กำลังเช่า</span>
          <strong>{mine.filter((r) => r.status === "Active").length}</strong>
        </div>
        <div className="card stat">
          <span className="muted">เงินที่ถอนได้</span>
          <strong>{formatEther(pending)} ETH</strong>
        </div>
      </div>
      <h2>รายการที่ฉันเช่า</h2>
      <div className="stack">
        {mine.map((r) => (
          <RentalCard key={r.id} rental={r} />
        ))}
      </div>
      <TransactionHistory account={account} />
    </div>
  );
}
