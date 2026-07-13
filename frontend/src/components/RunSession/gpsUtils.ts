/**
 * GPS 工具函数
 */

/** 检查 GPS 权限状态 */
export async function checkGpsPermission(): Promise<PermissionState> {
  try {
    const perm = await navigator.permissions.query({ name: 'geolocation' });
    return perm.state;
  } catch {
    return 'prompt';
  }
}

/** 请求 GPS 权限 */
export async function requestGpsPermission(): Promise<boolean> {
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      });
    });
    return pos.coords.latitude !== undefined;
  } catch {
    return false;
  }
}
