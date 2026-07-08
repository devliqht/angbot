-- AlterTable
ALTER TABLE `Agent` ADD COLUMN `parentAgentId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `Agent_parentAgentId_idx` ON `Agent`(`parentAgentId`);

-- AddForeignKey
ALTER TABLE `Agent` ADD CONSTRAINT `Agent_parentAgentId_fkey` FOREIGN KEY (`parentAgentId`) REFERENCES `Agent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
