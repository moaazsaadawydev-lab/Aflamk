export interface UploadResult {
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}

export interface StorageStrategy {
  upload(
    file: Buffer,
    filename: string,
    folder?: string,
  ): Promise<UploadResult>;

  delete(filepath: string): Promise<boolean>;
}
