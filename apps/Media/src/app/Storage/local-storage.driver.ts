import { Injectable, Logger } from '@nestjs/common';
import { StorageStrategy, UploadResult } from './storage-strategy.interface';
import * as fs from 'fs-extra';
import * as path from 'path';

@Injectable()
export class LocalStorageDriver implements StorageStrategy {
  private readonly logger = new Logger(LocalStorageDriver.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor() {
    fs.ensureDirSync(this.uploadDir);
  }

  async upload(
    file: Buffer,
    filename: string,
    folder: string = 'general',
  ): Promise<UploadResult> {
    const targetFolder = path.join(this.uploadDir, folder);
    await fs.ensureDir(targetFolder);

    const filePath = path.join(targetFolder, filename);
    await fs.writeFile(filePath, file);

    const publicUrl = `/uploads/${folder}/${filename}`;

    return {
      url: publicUrl,
      filename,
      size: file.length,
      mimetype: 'image/webp',
    };
  }

  async delete(filepath: string): Promise<boolean> {
    try {
      const absolutePath = path.join(process.cwd(), filepath);
      if (await fs.pathExists(absolutePath)) {
        await fs.remove(absolutePath);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to delete local file: ${filepath}`, error);
      return false;
    }
  }
}
