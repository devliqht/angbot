-- AlterTable
ALTER TABLE `Agent` MODIFY `model` VARCHAR(191) NOT NULL DEFAULT 'gemini-flash-latest';

-- AlterTable
ALTER TABLE `Chunk` MODIFY `embedModel` VARCHAR(191) NOT NULL DEFAULT 'gemini-embedding-2';
