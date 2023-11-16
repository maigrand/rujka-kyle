-- CreateTable
CREATE TABLE "IpScanIp" (
    "id" SERIAL NOT NULL,
    "ip" TEXT NOT NULL,

    CONSTRAINT "IpScanIp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpScanName" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "IpScanName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_IpScanIpToIpScanName" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "IpScanIp_ip_key" ON "IpScanIp"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "IpScanName_name_key" ON "IpScanName"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_IpScanIpToIpScanName_AB_unique" ON "_IpScanIpToIpScanName"("A", "B");

-- CreateIndex
CREATE INDEX "_IpScanIpToIpScanName_B_index" ON "_IpScanIpToIpScanName"("B");

-- AddForeignKey
ALTER TABLE "_IpScanIpToIpScanName" ADD CONSTRAINT "_IpScanIpToIpScanName_A_fkey" FOREIGN KEY ("A") REFERENCES "IpScanIp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_IpScanIpToIpScanName" ADD CONSTRAINT "_IpScanIpToIpScanName_B_fkey" FOREIGN KEY ("B") REFERENCES "IpScanName"("id") ON DELETE CASCADE ON UPDATE CASCADE;
