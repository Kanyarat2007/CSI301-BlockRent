import { Wallet, LogOut, ArrowDownToLine } from "lucide-react";
import { formatEther } from "ethers";
import { useWallet } from "../context/WalletContext";
import { short } from "../blockchain/contract";

export default function WalletConnect() {
  const { account, connect, disconnect, pending, send, busy, role } =
    useWallet();
  if (!account)
    return (
      <button className="btn btn-primary" onClick={connect}>
        <Wallet size={18} /> เชื่อมต่อ MetaMask
      </button>
    );
  return (
    <div className="wallet">
      {role === "user" && pending > 0n && (
        <button
          className="btn btn-success"
          disabled={busy}
          onClick={() => send("ถอนเงิน", (c) => c.withdraw())}
        >
          <ArrowDownToLine size={18} /> ถอน {formatEther(pending)} ETH
        </button>
      )}
      <span className="chip">
        <Wallet size={16} /> {short(account)}
      </span>
      <button
        className="btn btn-ghost icon-only"
        title="ตัดการเชื่อมต่อ"
        onClick={disconnect}
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
