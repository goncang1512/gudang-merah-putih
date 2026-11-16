-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PETUGAS_GUDANG');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('AKTIF', 'NONAKTIF');

-- CreateEnum
CREATE TYPE "JenisTransaksi" AS ENUM ('STOK_AWAL', 'MASUK', 'KELUAR');

-- CreateEnum
CREATE TYPE "StatusTransaksi" AS ENUM ('AKTIF', 'DIBATALKAN');

-- CreateEnum
CREATE TYPE "JenisPengajuan" AS ENUM ('KOREKSI_JUMLAH', 'PEMBATALAN');

-- CreateEnum
CREATE TYPE "StatusPengajuan" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'AKTIF',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "purchasePrice" INTEGER NOT NULL,
    "sellingPrice" INTEGER NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'AKTIF',

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "type" "JenisTransaksi" NOT NULL,
    "date" DATE NOT NULL,
    "party" VARCHAR(100),
    "note" TEXT,
    "status" "StatusTransaksi" NOT NULL DEFAULT 'AKTIF',
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelReason" TEXT,
    "cancelledById" INTEGER,
    "cancelledAt" TIMESTAMP(3),
    "replacesId" INTEGER,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionDetail" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "TransactionDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "type" "JenisPengajuan" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "StatusPengajuan" NOT NULL DEFAULT 'MENUNGGU',
    "requestedById" INTEGER NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionDetail" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "CorrectionDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "detail" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Item_code_key" ON "Item"("code");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_number_key" ON "Transaction"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_replacesId_key" ON "Transaction"("replacesId");

-- CreateIndex
CREATE INDEX "Transaction_type_date_idx" ON "Transaction"("type", "date");

-- CreateIndex
CREATE INDEX "Transaction_createdById_idx" ON "Transaction"("createdById");

-- CreateIndex
CREATE INDEX "TransactionDetail_itemId_idx" ON "TransactionDetail"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionDetail_transactionId_itemId_key" ON "TransactionDetail"("transactionId", "itemId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_status_idx" ON "CorrectionRequest"("status");

-- CreateIndex
CREATE INDEX "CorrectionRequest_transactionId_idx" ON "CorrectionRequest"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "CorrectionDetail_requestId_itemId_key" ON "CorrectionDetail"("requestId", "itemId");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Item" ADD CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionDetail" ADD CONSTRAINT "TransactionDetail_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionDetail" ADD CONSTRAINT "TransactionDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionDetail" ADD CONSTRAINT "CorrectionDetail_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CorrectionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionDetail" ADD CONSTRAINT "CorrectionDetail_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================
-- Aturan integritas di level database (SAD §8.5, SRS §4.4)
-- ============================================================

-- Jumlah transaksi harus lebih dari 0 (KF-BM-03, KF-BK-04)
ALTER TABLE "TransactionDetail" ADD CONSTRAINT "TransactionDetail_qty_positive" CHECK ("qty" > 0);
ALTER TABLE "CorrectionDetail" ADD CONSTRAINT "CorrectionDetail_qty_positive" CHECK ("qty" > 0);

-- Harga tidak boleh minus, stok minimum >= 0 (Kamus Data Barang)
ALTER TABLE "Item" ADD CONSTRAINT "Item_prices_non_negative" CHECK ("purchasePrice" >= 0 AND "sellingPrice" >= 0 AND "minStock" >= 0);

-- Transaksi tidak pernah dihapus permanen (KF-KOR-01, KNF-13, ADR-005)
-- dan riwayat aktivitas tidak bisa diubah/dihapus (KF-LOG-03).
CREATE FUNCTION forbid_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% pada tabel % tidak diizinkan', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_no_delete BEFORE DELETE ON "Transaction" FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER transaction_detail_no_change BEFORE UPDATE OR DELETE ON "TransactionDetail" FOR EACH ROW EXECUTE FUNCTION forbid_change();
CREATE TRIGGER activity_log_no_change BEFORE UPDATE OR DELETE ON "ActivityLog" FOR EACH ROW EXECUTE FUNCTION forbid_change();
