/**
 * 数据同步服务
 *
 * 统一管理 localStorage ↔ 云端的数据同步。
 * 目前使用 Mock API，接入真实后端后替换 cloud 服务即可。
 */
import { useUserStore } from '../../store/userStore';
import { useRunStore } from '../../store/runStore';
import { useAchievementStore } from '../../store/achievementStore';
import { uploadActivities, downloadActivities, mergeActivities, setLastSyncTime, getLastSyncTime } from './activityService';
import { uploadProfile } from './userService';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface SyncResult {
  status: SyncStatus;
  message: string;
  uploaded: number;
  downloaded: number;
  merged: number;
  timestamp: string;
}

/** 执行全量同步 */
export async function fullSync(): Promise<SyncResult> {
  const startedAt = new Date().toISOString();
  let result: SyncResult = {
    status: 'syncing', message: '同步中...',
    uploaded: 0, downloaded: 0, merged: 0, timestamp: startedAt,
  };

  try {
    const account = useUserStore.getState().account;
    const records = useRunStore.getState().records;
    const userId = account.id;

    if (!userId) {
      return { ...result, status: 'error', message: '用户未初始化' };
    }

    // 1. 上传用户档案
    await uploadProfile(account);

    // 2. 上传跑步记录
    const uploadResult = await uploadActivities(userId, records);

    // 3. 下载云端记录
    const lastSync = getLastSyncTime();
    const cloudRecords = await downloadActivities(userId, lastSync || undefined);

    // 4. 合并记录
    const merged = mergeActivities(records, cloudRecords);
    const mergedCount = merged.length - records.length;

    // 5. 回写到 runStore（通过 localStorage）
    if (mergedCount > 0 || uploadResult.uploaded > 0) {
      localStorage.setItem('vr_china_run_v1', JSON.stringify({
        version: 3,
        records: merged,
      }));
      // 刷新 store
      useRunStore.getState().recalcStats();
    }

    // 6. 刷新成就
    useAchievementStore.getState().refresh();

    // 7. 记录同步时间
    setLastSyncTime(startedAt);

    result = {
      status: 'success',
      message: '同步完成',
      uploaded: uploadResult.uploaded,
      downloaded: cloudRecords.length,
      merged: mergedCount,
      timestamp: startedAt,
    };

  } catch (err) {
    result = {
      ...result,
      status: 'error',
      message: `同步失败: ${err instanceof Error ? err.message : '未知错误'}`,
    };
  }

  return result;
}

/** 检查是否需要同步（距离上次超过 1 小时） */
export function shouldSync(): boolean {
  const lastSync = getLastSyncTime();
  if (!lastSync) return true;
  const hoursSinceSync = (Date.now() - new Date(lastSync).getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= 1;
}
