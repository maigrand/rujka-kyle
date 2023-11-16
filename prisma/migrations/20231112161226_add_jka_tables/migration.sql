-- CreateTable
CREATE TABLE "RconServer" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "RconServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonitoringServer" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "index" INTEGER,

    CONSTRAINT "MonitoringServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RconServer_address_key" ON "RconServer"("address");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringServer_address_key" ON "MonitoringServer"("address");

-- CreateIndex
CREATE UNIQUE INDEX "MonitoringServer_guildId_channelId_messageId_key" ON "MonitoringServer"("guildId", "channelId", "messageId");
