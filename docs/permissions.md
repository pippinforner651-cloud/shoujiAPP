# APP 权限说明

> 项目：全民环游中国虚拟跑步地图  
> 日期：2026-07-09

---

## Android 权限

```xml
<!-- AndroidManifest.xml -->

<!-- 定位权限（前台） -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- 定位权限（后台）- 跑步时需要在后台记录轨迹 -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- 网络权限 -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- 存储权限 - 保存分享图片 -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
    android:maxSdkVersion="28" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />

<!-- 前台服务 - 跑步时保持服务运行 -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
```

### 权限说明

| 权限 | 用途 | 必需 | 用户可拒绝 |
|------|------|------|-----------|
| `ACCESS_FINE_LOCATION` | GPS 高精度定位（跑步轨迹） | 跑步功能必需 | ✅ 可拒绝，跑步功能不可用 |
| `ACCESS_COARSE_LOCATION` | 基站/WiFi 定位 | 辅助定位 | ✅ |
| `ACCESS_BACKGROUND_LOCATION` | 后台定位（锁屏后继续记录） | 跑步功能建议 | ✅ |
| `INTERNET` | 网络请求 | 必需 | ❌ |
| `WRITE_EXTERNAL_STORAGE` | 保存分享图片 | 分享功能 | ✅ (Android 10+ 自动授予) |

---

## iOS 权限

```xml
<!-- Info.plist -->

<!-- 定位权限（前台） -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>记录你的跑步轨迹</string>

<!-- 定位权限（后台） -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>跑步时在后台持续记录位置</string>

<!-- 运动数据 -->
<key>NSMotionUsageDescription</key>
<string>识别跑步运动状态</string>

<!-- 相册 - 保存分享图片 -->
<key>NSPhotoLibraryAddUsageDescription</key>
<string>保存分享卡片到相册</string>
```

### 权限说明

| 权限 Key | 用途 | 必需 | 说明 |
|----------|------|------|------|
| `NSLocationWhenInUseUsageDescription` | 前台定位 | 跑步必需 | 开始跑步时请求 |
| `NSLocationAlwaysAndWhenInUseUsageDescription` | 后台定位 | 建议 | 锁屏后继续记录 |
| `NSMotionUsageDescription` | 运动传感器 | 可选 | 识别跑步状态 |
| `NSPhotoLibraryAddUsageDescription` | 保存图片 | 分享功能 | 分享卡片保存 |

---

## 权限请求时机

| 场景 | 权限 | 时机 |
|------|------|------|
| 首次打开跑步 Tab | 定位权限（前台） | 点击「开始跑步」时 |
| 跑步中锁屏 | 定位权限（后台） | 首次点击「开始跑步」时 |
| 分享跑步记录 | 存储权限 | 点击「分享」时 |
| APP 启动 | 网络权限 | 自动（系统级） |

### 用户拒绝处理

```typescript
// GPS 权限拒绝时的降级处理
if (gpsGranted === false) {
  // 显示引导页面
  // 提供「重新请求」按钮
  // 标记 GPS 不可用，后续使用模拟轨迹
}
```
