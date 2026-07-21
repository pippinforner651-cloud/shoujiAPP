// 对象存储接口预留（S3 兼容）：用于运动凭证图片等文件存储。
// 当前未配置存储凭据，所有方法如实返回 not_supported；配置 STORAGE_* 环境变量后接入 S3/MinIO/OSS。
export interface StorageDriver {
  putObject(key: string, data: Buffer, contentType: string): Promise<{ ok: boolean; url?: string; error?: string }>;
  getSignedUrl(key: string, expiresSec: number): Promise<{ ok: boolean; url?: string; error?: string }>;
  isConfigured(): boolean;
}

function notReady(): { ok: boolean; error: string } {
  return { ok: false, error: 'not_supported: 对象存储未配置（STORAGE_ENDPOINT/BUCKET/ACCESS_KEY 待申请）' };
}

export const storage: StorageDriver = {
  isConfigured() {
    return Boolean(process.env.STORAGE_ENDPOINT && process.env.STORAGE_BUCKET && process.env.STORAGE_ACCESS_KEY);
  },
  async putObject() {
    // 预留：S3 PutObject（aws-sdk v3 / minio sdk），凭据到位后实现
    return notReady();
  },
  async getSignedUrl() {
    // 预留：S3 预签名 URL，用于凭证图片限时访问
    return notReady();
  },
};
