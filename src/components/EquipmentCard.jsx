import { Link } from "react-router-dom";
import { Camera, Tag, ShieldCheck } from "lucide-react";
import { fmt, ipfsUrl } from "../blockchain/contract";

export function EquipmentImage({ src, size = "card" }) {
  return (
    <div className={`thumb thumb-${size}`}>
      {src ? (
        <img
          src={ipfsUrl(src)}
          alt=""
          onError={(e) => (e.currentTarget.style.display = "none")}
        />
      ) : null}
      <Camera size={36} className="thumb-fallback" />
    </div>
  );
}

export default function EquipmentCard({ item }) {
  const free = item.rentalId === 0;
  return (
    <Link to={`/equipment/${item.id}`} className="card eq-card">
      <EquipmentImage src={item.imageURI} />
      <div className="card-body">
        <div className="row between">
          <span className="muted small">{item.category || "ทั่วไป"}</span>
          <span className={`badge ${free ? "b-green" : "b-gray"}`}>
            {free ? "ว่าง" : "ไม่ว่าง"}
          </span>
        </div>
        <h3>{item.name}</h3>
        <div className="price">
          <Tag size={16} /> {fmt(item.pricePerDay)} / วัน
        </div>
        <div className="muted small row">
          <ShieldCheck size={15} /> มัดจำ {fmt(item.deposit)}
        </div>
      </div>
    </Link>
  );
}
