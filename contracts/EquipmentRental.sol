// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title EquipmentRental - ระบบเช่าอุปกรณ์และจัดการเงินมัดจำ (ต้นแบบสำหรับการเรียน/ทดสอบบน Sepolia)
contract EquipmentRental {
    enum RentalStatus { Reserved, Active, ReturnRequested, Completed, Disputed, Cancelled }

    struct Equipment {
        uint256 id;
        address owner;
        string name;
        string description;
        string category;
        string imageURI;      // URL หรือ ipfs://CID
        uint256 pricePerDay;  // wei
        uint256 deposit;      // wei
    }

    struct Rental {
        uint256 id;
        uint256 equipmentId;
        address owner;
        address renter;
        uint256 daysCount;
        uint256 rentAmount;
        uint256 depositAmount;
        uint256 startTime;
        RentalStatus status;
        bool ownerConfirmedPickup;
        bool renterConfirmedReceived;
    }

    struct Dispute {
        address openedBy;
        string evidenceHash;  // CID/URI ของหลักฐานบน IPFS
        bool resolved;
    }

    address public immutable admin;
    uint256 public equipmentCount;
    uint256 public rentalCount;

    mapping(uint256 => Equipment) private equipments;
    mapping(uint256 => Rental) private rentals;
    mapping(uint256 => Dispute) private disputes;
    mapping(uint256 => uint256) public activeRentalOf;      // equipmentId => rentalId (0 = ว่าง)
    mapping(address => uint256) public pendingWithdrawals;  // Pull Payment

    event EquipmentRegistered(uint256 indexed equipmentId, address owner, string name);
    event EquipmentUpdated(uint256 indexed equipmentId, address owner);
    event EquipmentRented(uint256 indexed rentalId, uint256 indexed equipmentId, address owner, address renter, uint256 daysCount, uint256 total);
    event PickupConfirmed(uint256 indexed rentalId, address owner);
    event ReceivedConfirmed(uint256 indexed rentalId, address renter);
    event ReturnRequested(uint256 indexed rentalId, address renter);
    event ReturnConfirmed(uint256 indexed rentalId, address owner, address renter);
    event DisputeOpened(uint256 indexed rentalId, address openedBy, string evidenceHash);
    event DisputeResolved(uint256 indexed rentalId, address owner, address renter, uint256 refundToRenter, uint256 compensationToOwner);
    event Withdrawn(address account, uint256 amount);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin");
        _;
    }

    constructor() {
        admin = msg.sender; // Wallet ที่ Deploy = Admin
    }

    // ---------- Function 1: Equipment Management ----------
    function registerEquipment(
        string calldata name,
        string calldata description,
        string calldata category,
        string calldata imageURI,
        uint256 pricePerDay,
        uint256 deposit
    ) external returns (uint256 id) {
        require(bytes(name).length > 0, "Name required");
        require(pricePerDay > 0, "Price must be > 0");
        require(deposit > 0, "Deposit must be > 0");
        id = ++equipmentCount;
        equipments[id] = Equipment(id, msg.sender, name, description, category, imageURI, pricePerDay, deposit);
        emit EquipmentRegistered(id, msg.sender, name);
    }

    function updateEquipment(
        uint256 id,
        string calldata name,
        string calldata description,
        string calldata category,
        string calldata imageURI,
        uint256 pricePerDay,
        uint256 deposit
    ) external {
        Equipment storage e = equipments[id];
        require(e.owner != address(0), "Equipment not found");
        require(e.owner == msg.sender, "Only equipment owner");
        require(bytes(name).length > 0, "Name required");
        require(pricePerDay > 0, "Price must be > 0");
        require(deposit > 0, "Deposit must be > 0");
        if (activeRentalOf[id] != 0) {
            require(pricePerDay == e.pricePerDay && deposit == e.deposit, "Cannot change price while rented");
        }
        e.name = name;
        e.description = description;
        e.category = category;
        e.imageURI = imageURI;
        e.pricePerDay = pricePerDay;
        e.deposit = deposit;
        emit EquipmentUpdated(id, msg.sender);
    }

    // ---------- Function 2: Rental & Payment ----------
    function rentEquipment(uint256 equipmentId, uint256 daysCount) external payable returns (uint256 rentalId) {
        Equipment storage e = equipments[equipmentId];
        require(e.owner != address(0), "Equipment not found");
        require(msg.sender != e.owner, "Owner cannot rent own equipment");
        require(daysCount > 0, "Days must be > 0");
        require(activeRentalOf[equipmentId] == 0, "Equipment not available");

        uint256 rentAmount = e.pricePerDay * daysCount;
        require(msg.value == rentAmount + e.deposit, "Incorrect ETH amount");

        rentalId = ++rentalCount;
        rentals[rentalId] = Rental(
            rentalId, equipmentId, e.owner, msg.sender, daysCount,
            rentAmount, e.deposit, 0, RentalStatus.Reserved, false, false
        );
        activeRentalOf[equipmentId] = rentalId;
        emit EquipmentRented(rentalId, equipmentId, e.owner, msg.sender, daysCount, msg.value);
    }

    // ---------- Function 3: Pickup Confirmation ----------
    function confirmPickup(uint256 rentalId) external {
        Rental storage r = _rental(rentalId);
        require(msg.sender == r.owner, "Only owner");
        require(r.status == RentalStatus.Reserved, "Not reserved");
        require(!r.ownerConfirmedPickup, "Already confirmed");
        r.ownerConfirmedPickup = true;
        emit PickupConfirmed(rentalId, msg.sender);
    }

    function confirmReceived(uint256 rentalId) external {
        Rental storage r = _rental(rentalId);
        require(msg.sender == r.renter, "Only renter");
        require(r.status == RentalStatus.Reserved, "Not reserved");
        require(r.ownerConfirmedPickup, "Owner has not confirmed pickup");
        require(!r.renterConfirmedReceived, "Already confirmed");
        r.renterConfirmedReceived = true;
        r.status = RentalStatus.Active;
        r.startTime = block.timestamp;
        emit ReceivedConfirmed(rentalId, msg.sender);
    }

    // ---------- Function 4: Return & Refund ----------
    function requestReturn(uint256 rentalId) external {
        Rental storage r = _rental(rentalId);
        require(msg.sender == r.renter, "Only renter");
        require(r.status == RentalStatus.Active, "Not active");
        r.status = RentalStatus.ReturnRequested;
        emit ReturnRequested(rentalId, msg.sender);
    }

    function confirmReturn(uint256 rentalId) external {
        Rental storage r = _rental(rentalId);
        require(msg.sender == r.owner, "Only owner");
        require(r.status == RentalStatus.ReturnRequested, "Return not requested");
        r.status = RentalStatus.Completed;
        activeRentalOf[r.equipmentId] = 0;
        pendingWithdrawals[r.owner] += r.rentAmount;
        pendingWithdrawals[r.renter] += r.depositAmount;
        emit ReturnConfirmed(rentalId, r.owner, r.renter);
    }

    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0; // effects ก่อน interaction
        (bool ok, ) = payable(msg.sender).call{value: amount}("");
        require(ok, "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ---------- Function 5: Dispute ----------
    function openDispute(uint256 rentalId, string calldata evidenceHash) external {
        Rental storage r = _rental(rentalId);
        require(msg.sender == r.owner || msg.sender == r.renter, "Not a party");
        require(
            r.status == RentalStatus.Reserved ||
            r.status == RentalStatus.Active ||
            r.status == RentalStatus.ReturnRequested,
            "Cannot dispute in this status"
        );
        require(bytes(evidenceHash).length > 0, "Evidence required");
        r.status = RentalStatus.Disputed;
        disputes[rentalId] = Dispute(msg.sender, evidenceHash, false);
        emit DisputeOpened(rentalId, msg.sender, evidenceHash);
    }

    function resolveDispute(uint256 rentalId, uint256 refundToRenter, uint256 compensationToOwner) external onlyAdmin {
        Rental storage r = _rental(rentalId);
        require(r.status == RentalStatus.Disputed, "Not disputed");
        require(refundToRenter + compensationToOwner == r.depositAmount, "Split must equal deposit");
        r.status = RentalStatus.Completed;
        disputes[rentalId].resolved = true;
        activeRentalOf[r.equipmentId] = 0;
        pendingWithdrawals[r.owner] += r.rentAmount + compensationToOwner;
        pendingWithdrawals[r.renter] += refundToRenter;
        emit DisputeResolved(rentalId, r.owner, r.renter, refundToRenter, compensationToOwner);
    }

    // ---------- Views ----------
    function getEquipment(uint256 id) external view returns (Equipment memory) {
        require(equipments[id].owner != address(0), "Equipment not found");
        return equipments[id];
    }

    function getRental(uint256 id) external view returns (Rental memory) {
        require(rentals[id].renter != address(0), "Rental not found");
        return rentals[id];
    }

    function getDispute(uint256 rentalId) external view returns (Dispute memory) {
        return disputes[rentalId];
    }

    function _rental(uint256 id) private view returns (Rental storage) {
        require(rentals[id].renter != address(0), "Rental not found");
        return rentals[id];
    }
}
