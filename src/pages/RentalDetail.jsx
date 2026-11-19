import { useParams } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import { RentalCard } from "../components/RentalStatus";
import TransactionHistory from "../components/TransactionHistory";

export default function RentalDetail() {
  const { id } = useParams();
  const { rentals } = useWallet();
  const r = rentals.find((x) => x.id === Number(id));
  return (
    <div className="container section narrow">
      {r ? (
        <RentalCard rental={r} detail />
      ) : (
        <p className="muted">ไม่พบรายการเช่า</p>
      )}
      <TransactionHistory rentalId={Number(id)} />
    </div>
  );
}
