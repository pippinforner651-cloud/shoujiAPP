package com.e23running.app.kimi.preview.run;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.e23running.app.kimi.preview.MainActivity;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * E23跑起来 · Android前台定位服务
 *
 * 锁屏/后台GPS稳定性关键设计：
 * 1. startForeground() 在任何GPS操作前调用
 * 2. HandlerThread 用于LocationManager回调，避免锁屏时主线程Looper休眠
 * 3. onTaskRemoved 防止用户划掉APP时停止Service
 * 4. onStartCommand返回START_STICKY并正确处理null intent（不立即stopSelf）
 * 5. 每次GPS点和状态变化都写入SQLite + 原生Logcat诊断日志
 * 6. 诊断日志可导出
 *
 * 生命周期：
 *   startForegroundService(intent) → onCreate → onStartCommand
 *   → 立即startForeground() → 处理action → LocationManager持续采集
 *   暂停 → stopGps()（保留Service）
 *   继续 → startGps()
 *   结束 → stopSelf()
 *   系统杀死 → START_STICKY重启 → 从SQLite恢复
 */
public class GpsRunService extends Service implements LocationListener {
    private static final String TAG = "E23GpsRun";
    private static final String CHANNEL_ID = "e23_gps_run_channel";
    private static final int NOTIFICATION_ID = 1001;

    // Location quality thresholds
    // 分阶段精度策略：首点允许≤100m，后续要求≤50m
    private static final float ACCURACY_FIRST_FIX_MAX = 100f;  // 首点最大允许精度
    private static final float ACCURACY_RUNNING_MAX = 50f;     // 后续点最大允许精度
    private static final float MIN_POINT_DISTANCE_M = 0.5f;    // 最小距离变化
    private static final float MAX_SUSPICIOUS_SPEED = 15f;     // 可疑速度 m/s

    // Distance computation mode
    private static final int DIST_MODE_FIRST_FIX = 0;  // 首点，不累计距离
    private static final int DIST_MODE_WARM_UP = 1;     // 精度一般，候选
    private static final int DIST_MODE_ACCURATE = 2;    // 精度良好，正式累计

    // Diagnostic logging identifiers
    public static final String DIAG_SERVICE_CREATE = "SERVICE_CREATE";
    public static final String DIAG_SERVICE_START = "SERVICE_START";
    public static final String DIAG_START_FOREGROUND_OK = "START_FOREGROUND_OK";
    public static final String DIAG_LOCATION_REQUEST_START = "LOCATION_REQUEST_START";
    public static final String DIAG_LOCATION_CALLBACK = "LOCATION_CALLBACK";
    public static final String DIAG_LOCATION_ACCEPTED = "LOCATION_ACCEPTED";
    public static final String DIAG_LOCATION_REJECTED = "LOCATION_REJECTED";
    public static final String DIAG_SQLITE_WRITE_OK = "SQLITE_WRITE_OK";
    public static final String DIAG_SQLITE_WRITE_FAILED = "SQLITE_WRITE_FAILED";
    public static final String DIAG_SCREEN_OFF = "SCREEN_OFF";
    public static final String DIAG_SCREEN_ON = "SCREEN_ON";
    public static final String DIAG_APP_BACKGROUND = "APP_BACKGROUND";
    public static final String DIAG_APP_FOREGROUND = "APP_FOREGROUND";
    public static final String DIAG_TASK_REMOVED = "TASK_REMOVED";
    public static final String DIAG_SERVICE_DESTROY = "SERVICE_DESTROY";
    public static final String DIAG_SERVICE_RESTART = "SERVICE_RESTART";
    public static final String DIAG_GPS_DISABLED = "GPS_DISABLED";
    public static final String DIAG_GPS_ENABLED = "GPS_ENABLED";
    public static final String DIAG_PERMISSION_STATE = "PERMISSION_STATE";
    public static final String DIAG_NOTIFICATION_STATE = "NOTIFICATION_STATE";
    public static final String DIAG_BATTERY_OPTIMIZATION_STATE = "BATTERY_OPTIMIZATION_STATE";
    public static final String DIAG_WAKELOCK_ACQUIRED = "WAKELOCK_ACQUIRED";
    public static final String DIAG_WAKELOCK_RELEASED = "WAKELOCK_RELEASED";
    public static final String DIAG_EXCEPTION = "EXCEPTION";

    private static GpsRunService instance;
    private static RunStateListener stateListener;

    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private RunDatabaseHelper dbHelper;

    // 后台HandlerThread用于LocationManager回调（锁屏时主线程可能休眠）
    private HandlerThread locationThread;
    private Handler locationHandler;

    // 实时诊断数据
    private final Diagnostician diag = new Diagnostician();

    // Run state (thread-safe)
    private volatile String currentActivityId;
    private volatile int runState = RunState.STATE_IDLE;
    private volatile long startTimeMs;
    private volatile long lastPauseStartMs;
    private volatile long totalPausedMs;
    private volatile long totalMovingDurationMs;
    private volatile double totalDistanceM;
    private volatile int currentSplitIndex;
    private volatile double splitDistanceM;
    private volatile long lastPointTimestamp;
    private volatile double lastLat;
    private volatile double lastLon;
    private volatile boolean hasLastPoint;

    // 首点状态机
    private volatile boolean firstFixReceived;
    private volatile int distMode = DIST_MODE_FIRST_FIX;

    private volatile int validPointCount;
    private volatile int rejectedPointCount;

    // Screen/App state
    private volatile boolean screenOff;
    private volatile boolean appBackgrounded;

    // 最后一次位置事件时间
    private volatile long lastLocationCallbackMs;
    private volatile long lastSqliteWriteMs;
    private volatile long lastNotificationUpdateMs;
    private volatile float lastAccuracy;
    private volatile String lastError;

    private final List<RunState.SplitInfo> splitList = new ArrayList<>();
    private final List<RunState.PausePeriod> pauseList = new ArrayList<>();

    public interface RunStateListener {
        void onLocationUpdate(RunState.TrackPoint point);
        void onStatsUpdate(double distanceM, long durationMs, long movingDurationMs,
                           double currentPace, double avgPace, int splitIndex,
                           double splitDistanceM, int state, int gpsPoints, int rejectedPts);
        void onServiceStateChange(int state, String message);
        void onRunFinished(RunState.RunSummary summary);
        void onActiveRunDetected(String activityId, long startTimeMs, double distanceM);
    }

    public static void setRunStateListener(RunStateListener listener) {
        GpsRunService.stateListener = listener;
    }

    public static GpsRunService getInstance() {
        return instance;
    }

    /** 获取诊断数据快照 */
    public Diagnostician getDiagnostics() { return diag; }
    public long getLastLocationCallbackMs() { return lastLocationCallbackMs; }
    public long getLastSqliteWriteMs() { return lastSqliteWriteMs; }
    public long getLastNotificationUpdateMs() { return lastNotificationUpdateMs; }
    public float getLastAccuracy() { return lastAccuracy; }
    public String getLastError() { return lastError; }
    public boolean isScreenOff() { return screenOff; }
    public boolean isAppBackgrounded() { return appBackgrounded; }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        dbHelper = RunDatabaseHelper.getInstance(this);
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);

        // 创建通知通道
        createNotificationChannel();

        // 创建HandlerThread用于独立的位置回调线程
        locationThread = new HandlerThread("E23GpsLocationThread");
        locationThread.start();
        locationHandler = new Handler(locationThread.getLooper());

        // 初始化WakeLock
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "E23GpsRun:Wakelock");
            wakeLock.setReferenceCounted(false);
        }

        // 记录诊断
        diagEvent(DIAG_SERVICE_CREATE, "Service created");
        Log.i(TAG, "GpsRunService created on thread: " + Thread.currentThread().getName());
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "onStartCommand: intent=" + (intent != null ? intent.getAction() : "null")
            + " flags=" + flags + " startId=" + startId);

        // ★ 关键修复1：在任何操作之前立即调用startForeground()
        // 确保Service处于前台状态，否则Android 14+可能暂停定位
        startForegroundWithNotification();
        diagEvent(DIAG_START_FOREGROUND_OK, "startForeground() called");

        // ★ 关键修复2：null intent处理 - 不立即stopSelf
        // START_STICKY重启时intent为null，这是系统正常的重启行为
        if (intent == null) {
            diagEvent(DIAG_SERVICE_RESTART, "System restarted service (null intent)");
            Log.i(TAG, "System restart: recovering existing run state");
            // 尝试恢复
            String activeId = dbHelper.findActiveRun();
            if (activeId != null) {
                recoverRun(activeId);
            }
            return START_STICKY;
        }

        String action = intent.getAction();
        diagEvent(DIAG_SERVICE_START, "Action: " + action);

        if ("START_RUN".equals(action)) {
            String activityId = intent.getStringExtra("activityId");
            long startTs = intent.getLongExtra("startTimeMs", System.currentTimeMillis());
            startRun(activityId, startTs);
        } else if ("PAUSE_RUN".equals(action)) {
            pauseRun();
        } else if ("RESUME_RUN".equals(action)) {
            resumeRun();
        } else if ("STOP_RUN".equals(action)) {
            stopRun();
        } else if ("RECOVER_RUN".equals(action)) {
            String recoverId = intent.getStringExtra("activityId");
            recoverRun(recoverId);
        }

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // ★ 关键修复3：用户划掉APP时，重新startForeground防止Service被杀死
        diagEvent(DIAG_TASK_REMOVED, "App removed from recent tasks");
        Log.w(TAG, "onTaskRemoved: restarting foreground notification");
        // 重新发布前台通知，通知系统此Service仍需运行
        startForegroundWithNotification();
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onDestroy() {
        diagEvent(DIAG_SERVICE_DESTROY, "Service destroyed");
        Log.i(TAG, "GpsRunService destroyed");
        stopGps();
        releaseWakeLock();

        // 停止HandlerThread
        if (locationThread != null) {
            locationThread.quitSafely();
        }

        updateNotification("跑步已结束", "0.00 km", "00:00");
        // 延迟移除通知，让用户看到结束信息
        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.cancel(NOTIFICATION_ID);
        }, 3000);

        instance = null;
        super.onDestroy();
    }

    // ===== 前台通知管理 =====

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID, "E23跑步记录", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("E23跑起来正在记录你的跑步活动");
        channel.setShowBadge(false);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private void startForegroundWithNotification() {
        Notification notification = buildNotification("E23跑起来正在记录", "0.00 km", "00:00");
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "startForeground failed", e);
            lastError = "startForeground failed: " + e.getMessage();
            diagEvent(DIAG_EXCEPTION, "startForeground: " + e.getMessage());
        }
    }

    private Notification buildNotification(String title, String distance, String duration) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(distance + " · " + duration)
            .setSmallIcon(android.R.drawable.ic_menu_compass)
            .setOngoing(true)
            .setContentIntent(pendingIntent)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();
    }

    public void updateNotification(String title, String distance, String duration) {
        try {
            Notification notification = buildNotification(title, distance, duration);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.notify(NOTIFICATION_ID, notification);
            lastNotificationUpdateMs = System.currentTimeMillis();
        } catch (Exception e) {
            Log.w(TAG, "updateNotification failed", e);
            lastError = "Notification update failed: " + e.getMessage();
        }
    }

    // ===== GPS管理 (使用HandlerThread确保锁屏回调) =====

    private void startGps() {
        try {
            diagEvent(DIAG_LOCATION_REQUEST_START,
                "Requesting GPS updates on handler thread");
            // 使用HandlerThread的Looper，避免锁屏时主线程Looper不处理回调
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000, 1f, this, locationHandler.getLooper()
            );
            // 网络定位作为备用
            try {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    3000, 3f, this, locationHandler.getLooper()
                );
            } catch (Exception e) {
                Log.w(TAG, "Network provider not available", e);
            }
            // PASSIVE_PROVIDER确保只要有其他app的定位结果我们也能收到
            try {
                locationManager.requestLocationUpdates(
                    LocationManager.PASSIVE_PROVIDER,
                    5000, 5f, this, locationHandler.getLooper()
                );
            } catch (Exception e) {
                Log.w(TAG, "Passive provider not available", e);
            }
            Log.i(TAG, "GPS started on handler thread");
        } catch (SecurityException e) {
            Log.e(TAG, "No location permission", e);
            diagEvent(DIAG_PERMISSION_STATE, "No location permission: " + e.getMessage());
            lastError = "定位权限未开启";
            notifyState("定位权限未开启，请在系统设置中允许定位");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start GPS", e);
            diagEvent(DIAG_EXCEPTION, "startGps: " + e.getMessage());
            lastError = "GPS启动失败: " + e.getMessage();
            notifyState("GPS启动失败: " + e.getMessage());
        }
    }

    private void stopGps() {
        try {
            locationManager.removeUpdates(this);
            Log.i(TAG, "GPS stopped");
            diagEvent(DIAG_GPS_DISABLED, "Location updates removed");
        } catch (Exception e) {
            Log.w(TAG, "Error stopping GPS", e);
        }
    }

    private void acquireWakeLock() {
        try {
            if (wakeLock != null && !wakeLock.isHeld()) {
                wakeLock.acquire(4 * 60 * 60 * 1000L); // 4 hour max
                diagEvent(DIAG_WAKELOCK_ACQUIRED, "WakeLock acquired (4h max)");
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock acquire failed", e);
        }
    }

    private void releaseWakeLock() {
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                diagEvent(DIAG_WAKELOCK_RELEASED, "WakeLock released");
            }
        } catch (Exception e) {
            Log.w(TAG, "WakeLock release failed", e);
        }
    }

    // ===== LocationListener (运行在HandlerThread上) =====

    @Override
    public void onLocationChanged(Location location) {
        lastLocationCallbackMs = System.currentTimeMillis();
        diagEvent(DIAG_LOCATION_CALLBACK,
            "provider=" + location.getProvider()
            + " lat=" + location.getLatitude()
            + " lng=" + location.getLongitude()
            + " acc=" + (location.hasAccuracy() ? location.getAccuracy() : "N/A")
            + " screenOff=" + screenOff);

        if (runState != RunState.STATE_RUNNING) return;

        long now = System.currentTimeMillis();
        lastAccuracy = location.hasAccuracy() ? location.getAccuracy() : 999f;

        RunState.TrackPoint point = new RunState.TrackPoint();
        point.latitude = location.getLatitude();
        point.longitude = location.getLongitude();
        point.accuracy = lastAccuracy;
        point.altitude = location.hasAltitude() ? location.getAltitude() : 0;
        point.speed = location.hasSpeed() ? location.getSpeed() : 0f;
        point.bearing = location.hasBearing() ? location.getBearing() : 0f;
        point.timestampMs = location.getTime();
        point.mockLocation = location.isFromMockProvider();
        point.createdAtMs = now;

        // 质量过滤
        String rejection = validatePoint(point, now);
        if (rejection != null) {
            point.accepted = false;
            point.rejectionReason = rejection;
            rejectedPointCount++;
            diagEvent(DIAG_LOCATION_REJECTED, rejection);
        } else {
            point.accepted = true;
            validPointCount++;
            diagEvent(DIAG_LOCATION_ACCEPTED,
                "distDelta=" + (hasLastPoint ? haversineM(lastLat, lastLon, point.latitude, point.longitude) : 0)
                + " totalDist=" + totalDistanceM);

            double delta = 0;
            if (hasLastPoint) {
                delta = haversineM(lastLat, lastLon, point.latitude, point.longitude);
                totalDistanceM += delta;
                splitDistanceM += delta;
            }
            lastLat = point.latitude;
            lastLon = point.longitude;
            hasLastPoint = true;
            lastPointTimestamp = now;

            totalMovingDurationMs += 1000;
            checkSplit(now);
        }

        // ★ 每个点独立写入SQLite
        try {
            long rowId = dbHelper.insertTrackPoint(currentActivityId, point);
            if (rowId > 0) {
                lastSqliteWriteMs = System.currentTimeMillis();
                diagEvent(DIAG_SQLITE_WRITE_OK, "rowId=" + rowId);
            } else {
                diagEvent(DIAG_SQLITE_WRITE_FAILED, "insert returned " + rowId);
            }
        } catch (Exception e) {
            Log.e(TAG, "SQLite write failed", e);
            diagEvent(DIAG_SQLITE_WRITE_FAILED, e.getMessage());
            lastError = "SQLite write: " + e.getMessage();
        }

        // 更新活动状态
        try {
            dbHelper.updateActivityState(
                currentActivityId, runState, 0,
                totalDistanceM, totalPausedMs, totalMovingDurationMs,
                runState == RunState.STATE_RUNNING ? now - startTimeMs - totalPausedMs : 0,
                currentSplitIndex, splitDistanceM, lastPauseStartMs);
        } catch (Exception e) {
            Log.w(TAG, "Activity state update failed", e);
        }

        // 更新通知（锁屏时通知更新会显示在锁屏界面上）
        String distStr = String.format(Locale.CHINA, "%.2f km", totalDistanceM / 1000);
        long elapsedSec = (now - startTimeMs - totalPausedMs) / 1000;
        String durStr = String.format(Locale.CHINA, "%02d:%02d", elapsedSec / 60, elapsedSec % 60);
        updateNotification("E23跑起来正在记录", distStr, durStr);

        // 回调解JS层
        notifyJS(point, now);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
        Log.d(TAG, "GPS status: " + provider + " -> " + status);
        if (status == 0) { // OUT_OF_SERVICE
            diagEvent(DIAG_GPS_DISABLED, provider + " is out of service");
        }
    }

    @Override
    public void onProviderEnabled(String provider) {
        Log.i(TAG, "Provider enabled: " + provider);
        diagEvent(DIAG_GPS_ENABLED, provider + " enabled");
    }

    @Override
    public void onProviderDisabled(String provider) {
        Log.w(TAG, "Provider disabled: " + provider);
        diagEvent(DIAG_GPS_DISABLED, provider + " disabled");
        notifyState("GPS信号丢失，请检查定位开关");
    }

    // ===== 质量过滤（分阶段精度策略） =====

    private String validatePoint(RunState.TrackPoint point, long now) {
        // 首点：允许≤100m精度，仅记录位置不累计距离
        if (!firstFixReceived) {
            if (point.accuracy <= ACCURACY_FIRST_FIX_MAX) {
                firstFixReceived = true;
                distMode = (point.accuracy <= ACCURACY_RUNNING_MAX) ? DIST_MODE_ACCURATE : DIST_MODE_WARM_UP;
                lastLat = point.latitude;
                lastLon = point.longitude;
                hasLastPoint = true;
                lastPointTimestamp = now;
                // 首点接受但不累计距离
                return null; // accepted - no rejection
            }
            return "first_fix_accuracy:" + point.accuracy + "(>" + ACCURACY_FIRST_FIX_MAX + ")";
        }

        // 已有首点后的精度过滤
        float accuracyLimit = ACCURACY_RUNNING_MAX;
        if (point.accuracy > accuracyLimit) {
            return "accuracy_too_low:" + point.accuracy;
        }
        // 时间倒退
        if (lastPointTimestamp > 0 && point.timestampMs < lastPointTimestamp) {
            return "time_regression";
        }
        // 重复点（0.5m内不记录）
        if (hasLastPoint) {
            double d = haversineM(lastLat, lastLon, point.latitude, point.longitude);
            if (d < MIN_POINT_DISTANCE_M) {
                return "duplicate_point:" + String.format(Locale.US, "%.1f", d) + "m";
            }
        }
        // 模拟定位
        if (point.mockLocation) {
            return "mock_location";
        }
        return null; // valid
    }

    // ===== 分段管理 =====

    private void checkSplit(long now) {
        if (splitDistanceM >= 1000) {
            RunState.SplitInfo split = new RunState.SplitInfo();
            split.splitIndex = currentSplitIndex;
            split.distanceM = splitDistanceM;
            split.durationS = (now - (currentSplitIndex == 0 ? startTimeMs : splitList.get(splitList.size()-1).endTimeMs)) / 1000.0;
            split.paceSecPerKm = splitDistanceM > 0 ? split.durationS / (splitDistanceM / 1000) : 0;
            split.startTimeMs = currentSplitIndex == 0 ? startTimeMs : splitList.get(splitList.size()-1).endTimeMs;
            split.endTimeMs = now;
            splitList.add(split);
            currentSplitIndex++;
            splitDistanceM = 0;
            try {
                org.json.JSONArray arr = new org.json.JSONArray();
                for (RunState.SplitInfo s : splitList) arr.put(s.toJson());
                dbHelper.saveSplitJson(currentActivityId, arr);
            } catch (Exception e) {
                Log.w(TAG, "Failed to save split JSON", e);
            }
        }
    }

    // ===== Haversine =====

    private double haversineM(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    // ===== 运行控制 =====

    private synchronized void startRun(String activityId, long startTs) {
        currentActivityId = activityId;
        runState = RunState.STATE_RUNNING;
        startTimeMs = startTs;
        totalDistanceM = 0;
        totalPausedMs = 0;
        totalMovingDurationMs = 0;
        hasLastPoint = false;
        validPointCount = 0;
        rejectedPointCount = 0;
        currentSplitIndex = 0;
        splitDistanceM = 0;
        lastPauseStartMs = 0;
        lastPointTimestamp = 0;
        lastLocationCallbackMs = 0;
        lastSqliteWriteMs = 0;
        screenOff = false;
        appBackgrounded = false;
        splitList.clear();
        pauseList.clear();

        acquireWakeLock();
        startGps();

        Log.i(TAG, "Run started: " + activityId);
        diagEvent(DIAG_SERVICE_START, "Run started: " + activityId);
        notifyState("跑步进行中");
        notifyJSStats();
    }

    private synchronized void pauseRun() {
        if (runState != RunState.STATE_RUNNING) return;
        runState = RunState.STATE_PAUSED;
        lastPauseStartMs = System.currentTimeMillis();

        RunState.PausePeriod period = new RunState.PausePeriod();
        period.startMs = lastPauseStartMs;
        period.endMs = 0;
        pauseList.add(period);

        stopGps();
        releaseWakeLock();
        updateNotification("E23已暂停",
            String.format(Locale.CHINA, "%.2f km", totalDistanceM / 1000), "已暂停");
        Log.i(TAG, "Run paused");
        notifyState("已暂停");
        notifyJSStats();
        try {
            org.json.JSONArray arr = new org.json.JSONArray();
            for (RunState.PausePeriod p : pauseList) arr.put(p.toJson());
            dbHelper.savePauseJson(currentActivityId, arr);
        } catch (Exception e) {
            Log.w(TAG, "Failed to save pause JSON", e);
        }
    }

    private synchronized void resumeRun() {
        if (runState != RunState.STATE_PAUSED) return;
        long now = System.currentTimeMillis();
        long pausedDuration = now - lastPauseStartMs;
        totalPausedMs += pausedDuration;
        if (!pauseList.isEmpty()) {
            RunState.PausePeriod last = pauseList.get(pauseList.size() - 1);
            last.endMs = now;
        }
        runState = RunState.STATE_RUNNING;
        acquireWakeLock();
        startGps();
        Log.i(TAG, "Run resumed, paused " + pausedDuration + "ms");
        notifyState("跑步继续");
        notifyJSStats();
    }

    private synchronized void stopRun() {
        if (currentActivityId == null) return;
        long now = System.currentTimeMillis();

        if (runState == RunState.STATE_PAUSED && !pauseList.isEmpty()) {
            RunState.PausePeriod last = pauseList.get(pauseList.size() - 1);
            if (last.endMs == 0) {
                totalPausedMs += now - lastPauseStartMs;
                last.endMs = now;
            }
        }

        stopGps();
        releaseWakeLock();

        // 完成最后一段split
        if (splitDistanceM > 0) {
            RunState.SplitInfo split = new RunState.SplitInfo();
            split.splitIndex = currentSplitIndex;
            split.distanceM = splitDistanceM;
            split.durationS = (now - splitStartTimeMs()) / 1000.0;
            split.paceSecPerKm = splitDistanceM > 0 ? split.durationS / (splitDistanceM / 1000) : 0;
            split.startTimeMs = splitStartTimeMs();
            split.endTimeMs = now;
            splitList.add(split);
        }

        long totalDuration = now - startTimeMs;
        dbHelper.updateActivityState(currentActivityId, RunState.STATE_IDLE, now,
            totalDistanceM, totalPausedMs, totalMovingDurationMs, totalDuration,
            splitList.size() > 0 ? splitList.size() - 1 : 0, splitDistanceM, 0);

        try {
            org.json.JSONArray arr = new org.json.JSONArray();
            for (RunState.SplitInfo s : splitList) arr.put(s.toJson());
            dbHelper.saveSplitJson(currentActivityId, arr);
        } catch (Exception e) { Log.w(TAG, "Save split JSON", e); }

        try {
            org.json.JSONArray arr = new org.json.JSONArray();
            for (RunState.PausePeriod p : pauseList) arr.put(p.toJson());
            dbHelper.savePauseJson(currentActivityId, arr);
        } catch (Exception e) { Log.w(TAG, "Save pause JSON", e); }

        dbHelper.finishActivity(currentActivityId, now);
        RunState.RunSummary summary = dbHelper.loadSummary(currentActivityId);

        if (stateListener != null) stateListener.onRunFinished(summary);

        String distStr = String.format(Locale.CHINA, "%.2f km", totalDistanceM / 1000);
        updateNotification("跑步已结束", distStr,
            String.format(Locale.CHINA, "%02d:%02d", totalDuration / 60000, (totalDuration / 1000) % 60));

        Log.i(TAG, "Run finished: " + currentActivityId + " distance=" + totalDistanceM + "m");
        currentActivityId = null;
        runState = RunState.STATE_IDLE;
        stopSelf();
    }

    private long splitStartTimeMs() {
        if (splitList.isEmpty()) return startTimeMs;
        return splitList.get(splitList.size() - 1).endTimeMs;
    }

    private void recoverRun(String activityId) {
        RunState rs = dbHelper.loadRunState(activityId);
        if (rs == null) {
            Log.w(TAG, "Recover: no state for " + activityId);
            return;
        }
        currentActivityId = rs.clientActivityId;
        runState = rs.state;
        startTimeMs = rs.startTimeMs;
        totalDistanceM = rs.totalDistanceM;
        totalPausedMs = rs.totalPausedMs;
        totalMovingDurationMs = rs.movingDurationMs;
        currentSplitIndex = rs.currentSplitIndex;
        splitDistanceM = rs.splitDistanceM;
        splitList.clear();
        splitList.addAll(rs.splitInfos);
        pauseList.clear();
        pauseList.addAll(rs.pausePeriods);

        if (runState == RunState.STATE_RUNNING) {
            runState = RunState.STATE_PAUSED; // 恢复为暂停，等待用户手动resume
        }

        Log.i(TAG, "Recovered run: " + activityId + " dist=" + totalDistanceM + "m");
        diagEvent(DIAG_SERVICE_RESTART, "Recovered run: " + activityId);

        if (stateListener != null) {
            stateListener.onActiveRunDetected(activityId, startTimeMs, totalDistanceM);
        }
    }

    // ===== JS回调 =====

    private void notifyState(String message) {
        if (stateListener != null)
            stateListener.onServiceStateChange(runState, message);
    }

    private void notifyJS(RunState.TrackPoint point, long now) {
        if (stateListener != null) {
            stateListener.onLocationUpdate(point);
            notifyJSStats();
        }
    }

    private void notifyJSStats() {
        if (stateListener == null) return;
        long now = System.currentTimeMillis();
        long elapsedSec = runState == RunState.STATE_RUNNING
            ? (now - startTimeMs - totalPausedMs) / 1000 : 0;
        double avgPace = 0;
        if (totalDistanceM > 0 && elapsedSec > 0)
            avgPace = elapsedSec / (totalDistanceM / 1000.0);
        stateListener.onStatsUpdate(totalDistanceM, elapsedSec * 1000, totalMovingDurationMs,
            0, avgPace, currentSplitIndex, splitDistanceM,
            runState, validPointCount, rejectedPointCount);
    }

    // ===== 诊断日志系统 =====

    private void diagEvent(String event, String detail) {
        diag.record(event, detail);
    }

    /**
     * 诊断日志记录器
     * 同时写入Android Logcat和APP内部数据库
     */
    public class Diagnostician {
        private static final int MAX_EVENTS = 500;
        private final List<DiagEntry> events = new ArrayList<>();

        public synchronized void record(String event, String detail) {
            long now = System.currentTimeMillis();
            DiagEntry entry = new DiagEntry(event, detail, now);
            events.add(entry);
            if (events.size() > MAX_EVENTS) {
                events.remove(0);
            }
            // 写入Logcat
            Log.d(TAG, "DIAG [" + event + "] " + detail);
        }

        public synchronized List<DiagEntry> getEvents() {
            return new ArrayList<>(events);
        }

        public synchronized List<DiagEntry> getEventsByType(String eventType) {
            List<DiagEntry> result = new ArrayList<>();
            for (DiagEntry e : events) {
                if (e.event.equals(eventType)) result.add(e);
            }
            return result;
        }

        public synchronized String exportToText() {
            StringBuilder sb = new StringBuilder();
            sb.append("=== E23 GPS Diagnostic Log ===\n");
            sb.append("Time: ").append(java.text.DateFormat.getDateTimeInstance()
                .format(new java.util.Date())).append("\n");
            sb.append("Screen off: ").append(screenOff).append("\n");
            sb.append("App backgrounded: ").append(appBackgrounded).append("\n");
            sb.append("Run state: ").append(runState).append("\n");
            sb.append("Activity ID: ").append(currentActivityId).append("\n");
            sb.append("Last location: ").append(lastLocationCallbackMs > 0
                ? java.text.DateFormat.getDateTimeInstance().format(new java.util.Date(lastLocationCallbackMs))
                : "never").append("\n");
            sb.append("Last SQLite write: ").append(lastSqliteWriteMs > 0
                ? java.text.DateFormat.getDateTimeInstance().format(new java.util.Date(lastSqliteWriteMs))
                : "never").append("\n");
            sb.append("Total distance: ").append(totalDistanceM).append("m\n");
            sb.append("Valid points: ").append(validPointCount).append("\n");
            sb.append("Rejected points: ").append(rejectedPointCount).append("\n");
            sb.append("Last error: ").append(lastError).append("\n\n");
            sb.append("Recent events (newest first):\n");
            for (int i = events.size() - 1; i >= Math.max(0, events.size() - 100); i--) {
                DiagEntry e = events.get(i);
                sb.append("[").append(java.text.DateFormat.getTimeInstance()
                    .format(new java.util.Date(e.timestamp)))
                    .append("] ").append(e.event).append(": ").append(e.detail).append("\n");
            }
            return sb.toString();
        }

        public synchronized int getEventCountByType(String eventType) {
            int count = 0;
            for (DiagEntry e : events) {
                if (e.event.equals(eventType)) count++;
            }
            return count;
        }

        public class DiagEntry {
            public final String event;
            public final String detail;
            public final long timestamp;
            DiagEntry(String event, String detail, long timestamp) {
                this.event = event;
                this.detail = detail;
                this.timestamp = timestamp;
            }
        }
    }

    // ===== 对外接口 =====

    public int getRunState() { return runState; }
    public String getCurrentActivityId() { return currentActivityId; }
    public double getTotalDistanceM() { return totalDistanceM; }
    public long getStartTimeMs() { return startTimeMs; }
    public long getTotalPausedMs() { return totalPausedMs; }
    public int getValidPointCount() { return validPointCount; }
    public int getRejectedPointCount() { return rejectedPointCount; }
    public int getCurrentSplitIndex() { return currentSplitIndex; }
    public double getSplitDistanceM() { return splitDistanceM; }
    public boolean hasFirstFix() { return firstFixReceived; }
    public int getDistMode() { return distMode; }
}
