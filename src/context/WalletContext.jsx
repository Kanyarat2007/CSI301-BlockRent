import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BrowserProvider } from "ethers";
import {
  readContract,
  writeContract,
  SEPOLIA_CHAIN_ID,
  toEquipment,
  toRental,
  same,
} from "../blockchain/contract";

const Ctx = createContext(null);
export const useWallet = () => useContext(Ctx);

// จำกัดจำนวนงานที่อ่าน Contract พร้อมกัน เพื่อลดการกระแทก RPC
async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

function isRateLimitError(error) {
  const details = [
    error?.message,
    error?.shortMessage,
    error?.info?.error?.message,
    error?.error?.message,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    error?.status === 429 ||
    error?.code === -32005 ||
    error?.info?.error?.code === -32005 ||
    /429|too many requests|rate.?limit|quota exceeded/i.test(details)
  );
}

export function WalletProvider({ children }) {
  const [account, setAccount] = useState(null);
  const [signer, setSigner] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [equipments, setEquipments] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [pending, setPending] = useState(0n);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const accountRef = useRef(null);
  const refreshInFlightRef = useRef(null);
  const refreshAgainRef = useRef(false);
  const mountedRef = useRef(false);

  const notify = useCallback((type, text, hash) => {
    if (mountedRef.current) setToast({ type, text, hash });
  }, []);

  // โหลดข้อมูลแบบคิวเดียว หากมีการเรียกซ้อนจะรวมเป็นการโหลดซ้ำอีกหนึ่งรอบ
  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) {
      refreshAgainRef.current = true;
      return refreshInFlightRef.current;
    }

    const job = (async () => {
      if (mountedRef.current) setLoading(true);
      try {
        const [adminAddr, eqCount, rCount] = await Promise.all([
          readContract.admin(),
          readContract.equipmentCount(),
          readContract.rentalCount(),
        ]);

        const ids = (count) =>
          Array.from({ length: Number(count) }, (_, index) => index + 1);

        const eqs = await mapWithConcurrency(ids(eqCount), 3, async (id) => {
          const [equipment, activeRentalId] = await Promise.all([
            readContract.getEquipment(id),
            readContract.activeRentalOf(id),
          ]);
          return toEquipment(equipment, activeRentalId);
        });

        const rts = await mapWithConcurrency(ids(rCount), 3, async (id) => {
          return toRental(await readContract.getRental(id));
        });

        // ใช้ account ล่าสุด เผื่อผู้ใช้เปลี่ยน Wallet ระหว่างโหลด
        const currentAccount = accountRef.current;
        const pendingAmount = currentAccount
          ? await readContract.pendingWithdrawals(currentAccount)
          : 0n;

        if (mountedRef.current) {
          setAdmin(adminAddr);
          setEquipments(eqs);
          setRentals(rts.reverse());
          setPending(pendingAmount);
        }
      } catch (error) {
        console.error("Contract refresh error:", error);
        notify(
          "error",
          isRateLimitError(error)
            ? "Infura จำกัดจำนวน Request (429) กรุณารอสักครู่แล้วลองใหม่"
            : "อ่านข้อมูลจาก Contract ไม่สำเร็จ กรุณาตรวจสอบ Console และการตั้งค่า RPC / Contract",
        );
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    refreshInFlightRef.current = job;
    try {
      await job;
    } finally {
      refreshInFlightRef.current = null;
      if (refreshAgainRef.current && mountedRef.current) {
        refreshAgainRef.current = false;
        // รวมคำขอ refresh ที่เข้ามาระหว่างโหลดเป็นการโหลดรอบเดียว
        void refresh();
      }
    }
  }, [notify]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      notify("error", "ไม่พบ MetaMask กรุณาติดตั้งส่วนขยายก่อน");
      return;
    }
    try {
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      } catch {
        notify("error", "กรุณาสลับเครือข่ายเป็น Sepolia ใน MetaMask");
        return;
      }
      const currentSigner = await provider.getSigner();
      const address = await currentSigner.getAddress();
      accountRef.current = address;
      setSigner(currentSigner);
      setAccount(address);
      void refresh();
    } catch (error) {
      notify("error", error.shortMessage || error.message);
    }
  }, [notify, refresh]);

  const disconnect = useCallback(() => {
    accountRef.current = null;
    setAccount(null);
    setSigner(null);
    setPending(0n);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = (accounts) => {
      if (!accounts?.length) {
        disconnect();
        return;
      }
      // อ่านบัญชีที่เลือกอยู่โดยไม่ขออนุญาตเชื่อมต่อซ้ำ
      const provider = new BrowserProvider(window.ethereum);
      provider
        .getSigner()
        .then(async (currentSigner) => {
          const address = await currentSigner.getAddress();
          accountRef.current = address;
          setSigner(currentSigner);
          setAccount(address);
          void refresh();
        })
        .catch((error) => console.error("Wallet account change error:", error));
    };
    const onChainChanged = () => window.location.reload();
    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, [disconnect, refresh]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(timer);
  }, [toast]);

  const send = async (label, fn) => {
    if (!signer) {
      notify("error", "กรุณาเชื่อมต่อ MetaMask ก่อน");
      return false;
    }
    setBusy(true);
    try {
      const tx = await fn(writeContract(signer));
      notify("info", `${label}: กำลังรอยืนยันบน Blockchain…`, tx.hash);
      await tx.wait();
      notify("success", `${label} สำเร็จ`, tx.hash);
      await refresh();
      return true;
    } catch (error) {
      notify(
        "error",
        `${label} ไม่สำเร็จ: ${error.reason || error.shortMessage || error.message}`,
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = same(account, admin);
  const role = !account ? "guest" : isAdmin ? "admin" : "user";
  const ownsAny = useMemo(
    () => equipments.some((equipment) => same(equipment.owner, account)),
    [equipments, account],
  );
  const rentsAny = useMemo(
    () => rentals.some((rental) => same(rental.renter, account)),
    [rentals, account],
  );

  return (
    <Ctx.Provider
      value={{
        account,
        admin,
        role,
        isAdmin,
        ownsAny,
        rentsAny,
        equipments,
        rentals,
        pending,
        loading,
        busy,
        toast,
        setToast,
        connect,
        disconnect,
        refresh,
        send,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
