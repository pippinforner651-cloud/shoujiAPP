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
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.e23running.app.kimi.preview.MainActivity;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * E23跑起来 · Android前台定位服务
 *
 * 生命周期：
 *   APP前台点击"开始跑步" → startForegroundService() → onCreate → onStartCommand
 *   → 注册LocationManager回调 → 持续采集GPS点 → 存储到SQLite
 *   暂停 → 标记暂停（不停止Service）
 *   结束 → stopSelf()
 *
 * 锁屏/后台后通过前台Service + 常驻通知保持GPS采集
 * 通知每分钟更新（距离+时间）
 */
public class GpsRunService extends Service implements LocationListener {
    private static final String TAG = "E23GpsRun";
    private static final String CHANNEL_ID = "e23_gps_run_channel";
    private static final int NOTIFICATION_ID = 1001;

    // Location quality thresholds
    private static final float ACCURACY_LIMIT_M = 40f;
    private static final float MAX_POINT_SPEED_MPS = 10f;  // 36 km/h - threshold for suspicious
    private static final float MIN_VALID_SPEED_MPS = 0.1f;  // below this, treat as stationary
    private static final float MIN_POINT_DISTANCE_M = 0.5f; // ignore points within 0.5m
    private static final float MAX_JUMP_DISTANCE_M = 100f;  // jump >100m flagged

    private static GpsRunService instance;
    private static RunStateListener stateListener;

    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;
    private RunDatabaseHelper dbHelper;

    // Run state (thread-safe via synchronized)
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

    // Quality counters
    private volatile int validPointCount;
    private volatile int rejectedPointCount;

    // Batch insert buffer
    private final List<RunState.TrackPoint> pointBuffer = new ArrayList<>();
    private static final int BUFFER_FLUSH_SIZE = 10;

    // Split tracking
    private volatile long splitStartTimeMs;
    private volatile double splitStartDistanceM;
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

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        dbHelper = RunDatabaseHelper.getInstance(this);
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);

        createNotificationChannel();

        // Acquire partial wake lock (keeps CPU running but not screen)
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "E23GpsRun:Wakelock");
            wakeLock.setReferenceCounted(false);
        }

        Log.i(TAG, "GpsRunService created");
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            Log.w(TAG, "Null intent, stopping");
            stopSelf();
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        Log.i(TAG, "onStartCommand: action=" + action);

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

        // 启动前台通知
        startForegroundWithNotification();

        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "GpsRunService destroyed");
        stopGps();
        releaseWakeLock();
        updateNotification("跑步已结束", "0.00 km", "00:00");
        instance = null;
        super.onDestroy();
    }

    // ===== 前台通知管理 =====

    private void createNotificationChannel() {
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "E23跑步记录",
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription("E23跑起来正在记录你的跑步活动");
        channel.setShowBadge(false);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    private void startForegroundWithNotification() {
        Notification notification = buildNotification("E23跑起来正在记录", "0.00 km", "00:00");
        int type = 0;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14+ needs foregroundServiceType
            type = ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            type = ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private Notification buildNotification(String title, String distance, String duration) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
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
        Notification notification = buildNotification(title, distance, duration);
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIFICATION_ID, notification);
    }

    // ===== GPS管理 =====

    private void startGps() {
        try {
            // 请求GPS定位，最小更新间隔1秒，最小位移1米
            locationManager.requestLocationUpdates(
                LocationManager.GPS_PROVIDER,
                1000,   // 1秒
                1f,     // 1米
                this    // LocationListener
            );
            // 同时请求网络定位作为备用（精度更高时优先）
            try {
                locationManager.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    3000, 3f, this
                );
            } catch (Exception e) {
                Log.w(TAG, "Network provider not available", e);
            }
            Log.i(TAG, "GPS started");
        } catch (SecurityException e) {
            Log.e(TAG, "No location permission", e);
            notifyState("定位权限未开启，请在系统设置中允许定位");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start GPS", e);
            notifyState("GPS启动失败: " + e.getMessage());
        }
    }

    private void stopGps() {
        try {
            locationManager.removeUpdates(this);
            Log.i(TAG, "GPS stopped");
        } catch (Exception e) {
            Log.w(TAG, "Error stopping GPS", e);
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.i(TAG, "WakeLock released");
        }
    }

    // ===== LocationListener =====

    @Override
    public void onLocationChanged(Location location) {
        if (runState != RunState.STATE_RUNNING) return;

        long now = System.currentTimeMillis();
        RunState.TrackPoint point = new RunState.TrackPoint();
        point.latitude = location.getLatitude();
        point.longitude = location.getLongitude();
        point.accuracy = location.hasAccuracy() ? location.getAccuracy() : 999f;
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
        } else {
            point.accepted = true;
            validPointCount++;

            // 计算距离增量
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

            // 更新移动时长
            totalMovingDurationMs += 1000; // approximate: each valid point = 1s moving

            // 每公里分段检测
            checkSplit(now);
        }

        // 落盘
        dbHelper.insertTrackPoint(currentActivityId, point);

        // 批量缓冲（用于JS回调）
        synchronized (pointBuffer) {
            pointBuffer.add(point);
            if (pointBuffer.size() >= BUFFER_FLUSH_SIZE) {
                flushBuffer();
            }
        }

        // 更新活动状态
        dbHelper.updateActivityState(
            currentActivityId, runState, 0,
            totalDistanceM, totalPausedMs,
            totalMovingDurationMs,
            runState == RunState.STATE_RUNNING ? now - startTimeMs - totalPausedMs : 0,
            currentSplitIndex, splitDistanceM,
            lastPauseStartMs
        );

        // 更新通知
        String distStr = String.format(Locale.CHINA, "%.2f km", totalDistanceM / 1000);
        long elapsedSec = (now - startTimeMs - totalPausedMs) / 1000;
        String durStr = String.format(Locale.CHINA, "%02d:%02d", elapsedSec / 60, elapsedSec % 60);
        updateNotification("E23跑起来正在记录", distStr, durStr);

        // 回调JS层
        notifyJS(point, now);
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {
        Log.d(TAG, "GPS status changed: " + provider + " -> " + status);
    }

    @Override
    public void onProviderEnabled(String provider) {
        Log.d(TAG, "Provider enabled: " + provider);
    }

    @Override
    public void onProviderDisabled(String provider) {
        Log.d(TAG, "Provider disabled: " + provider);
        notifyState("GPS信号丢失，请检查定位开关");
    }

    // ===== 质量过滤 =====

    private String validatePoint(RunState.TrackPoint point, long now) {
        // 精度过滤
        if (point.accuracy > ACCURACY_LIMIT_M) {
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
                return "duplicate_point:within_" + String.format(Locale.US, "%.1f", d) + "m";
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
            split.durationS = (now - splitStartTimeMs) / 1000.0;
            split.paceSecPerKm = splitDistanceM > 0 ? split.durationS / (splitDistanceM / 1000) : 0;
            split.startTimeMs = splitStartTimeMs;
            split.endTimeMs = now;
            splitList.add(split);

            currentSplitIndex++;
            splitDistanceM = 0;
            splitStartTimeMs = now;

            // 持久化分段JSON
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
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * R * Math.asin(Math.sqrt(a));
    }

    // ===== 运行控制 =====

    private synchronized void startRun(String activityId, long startTs) {
        currentActivityId = activityId;
        runState = RunState.STATE_RUNNING;
        startTimeMs = startTs;
        splitStartTimeMs = startTs;
        splitStartDistanceM = 0;
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
        splitList.clear();
        pauseList.clear();
        pointBuffer.clear();

        // Acquire wake lock
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(4 * 60 * 60 * 1000L); // 4 hour max
        }

        startGps();
        Log.i(TAG, "Run started: " + activityId);
        notifyState("跑步进行中");
        notifyJSStats();
    }

    private synchronized void pauseRun() {
        if (runState != RunState.STATE_RUNNING) return;

        runState = RunState.STATE_PAUSED;
        lastPauseStartMs = System.currentTimeMillis();

        // 写入暂停周期
        RunState.PausePeriod period = new RunState.PausePeriod();
        period.startMs = lastPauseStartMs;
        period.endMs = 0;
        pauseList.add(period);

        stopGps();
        releaseWakeLock();
        updateNotification("E23已暂停", String.format(Locale.CHINA, "%.2f km", totalDistanceM / 1000), "已暂停");
        Log.i(TAG, "Run paused at distance: " + totalDistanceM + "m");
        notifyState("已暂停");
        notifyJSStats();

        // 保存暂停JSON
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

        // 完成暂停周期
        if (!pauseList.isEmpty()) {
            RunState.PausePeriod last = pauseList.get(pauseList.size() - 1);
            last.endMs = now;
        }

        runState = RunState.STATE_RUNNING;

        // 重新获取wake lock
        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(4 * 60 * 60 * 1000L);
        }

        startGps();
        Log.i(TAG, "Run resumed, paused for " + pausedDuration + "ms");
        notifyState("跑步继续");
        notifyJSStats();
    }

    private synchronized void stopRun() {
        if (currentActivityId == null) return;

        long now = System.currentTimeMillis();

        // 如果是从暂停状态结束，需要先完成暂停周期
        if (runState == RunState.STATE_PAUSED && !pauseList.isEmpty()) {
            RunState.PausePeriod last = pauseList.get(pauseList.size() - 1);
            if (last.endMs == 0) {
                long pausedDuration = now - lastPauseStartMs;
                totalPausedMs += pausedDuration;
                last.endMs = now;
            }
        }

        stopGps();
        releaseWakeLock();

        // 完成最后一段不足1km的split
        if (splitDistanceM > 0) {
            RunState.SplitInfo split = new RunState.SplitInfo();
            split.splitIndex = currentSplitIndex;
            split.distanceM = splitDistanceM;
            split.durationS = (now - splitStartTimeMs) / 1000.0;
            split.paceSecPerKm = splitDistanceM > 0 ? split.durationS / (splitDistanceM / 1000) : 0;
            split.startTimeMs = splitStartTimeMs;
            split.endTimeMs = now;
            splitList.add(split);
        }

        // 刷新缓冲
        flushBuffer();

        // 最终更新活动状态
        long totalDuration = now - startTimeMs;
        dbHelper.updateActivityState(
            currentActivityId, RunState.STATE_IDLE, now,
            totalDistanceM, totalPausedMs,
            totalMovingDurationMs, totalDuration,
            splitList.size() > 0 ? splitList.size() - 1 : 0, splitDistanceM, 0
        );

        // 保存分段
        try {
            org.json.JSONArray arr = new org.json.JSONArray();
            for (RunState.SplitInfo s : splitList) arr.put(s.toJson());
            dbHelper.saveSplitJson(currentActivityId, arr);
        } catch (Exception e) {
            Log.w(TAG, "Failed to save final split JSON", e);
        }

        // 保存暂停
        try {
            org.json.JSONArray arr = new org.json.JSONArray();
            for (RunState.PausePeriod p : pauseList) arr.put(p.toJson());
            dbHelper.savePauseJson(currentActivityId, arr);
        } catch (Exception e) {
            Log.w(TAG, "Failed to save final pause JSON", e);
        }

        // 标记完成
        dbHelper.finishActivity(currentActivityId, now);

        // 获取摘要
        RunState.RunSummary summary = dbHelper.loadSummary(currentActivityId);

        // 通知JS层
        if (stateListener != null) {
            stateListener.onRunFinished(summary);
        }

        String distStr = String.format(Locale.CHINA, "%.2f km", totalDistanceM / 1000);
        updateNotification("跑步已结束", distStr,
            String.format(Locale.CHINA, "%02d:%02d", totalDuration / 60000, (totalDuration / 1000) % 60));

        Log.i(TAG, "Run finished: " + currentActivityId + " distance=" + totalDistanceM + "m");

        // 重置状态
        currentActivityId = null;
        runState = RunState.STATE_IDLE;

        stopSelf();
    }

    private void recoverRun(String activityId) {
        RunState rs = dbHelper.loadRunState(activityId);
        if (rs == null) return;

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

        // 如果之前是running状态，恢复为paused（等待用户手动resume）
        if (runState == RunState.STATE_RUNNING) {
            runState = RunState.STATE_PAUSED;
        }

        Log.i(TAG, "Recovered run: " + activityId + " state=" + runState + " dist=" + totalDistanceM + "m");

        if (stateListener != null) {
            stateListener.onActiveRunDetected(activityId, startTimeMs, totalDistanceM);
        }
    }

    // ===== JS回调 =====

    private void flushBuffer() {
        synchronized (pointBuffer) {
            if (!pointBuffer.isEmpty() && currentActivityId != null) {
                dbHelper.insertTrackPoints(currentActivityId, new ArrayList<>(pointBuffer));
                pointBuffer.clear();
            }
        }
    }

    private void notifyState(String message) {
        if (stateListener != null) {
            stateListener.onServiceStateChange(runState, message);
        }
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
        long elapsedSec = runState == RunState.STATE_RUNNING ? (now - startTimeMs - totalPausedMs) / 1000 : 0;

        // Current pace: last 20s window
        double currentPace = 0;
        if (runState == RunState.STATE_RUNNING && hasLastPoint) {
            // Use speed from last valid point
            currentPace = 0; // will be computed from last 20s
        }

        // Average pace
        double avgPace = 0;
        if (totalDistanceM > 0 && elapsedSec > 0) {
            avgPace = elapsedSec / (totalDistanceM / 1000.0);
        }

        double distanceKm = totalDistanceM / 1000;
        stateListener.onStatsUpdate(
            totalDistanceM, elapsedSec * 1000, totalMovingDurationMs,
            currentPace, avgPace,
            currentSplitIndex, splitDistanceM,
            runState, validPointCount, rejectedPointCount
        );
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
    public List<RunState.SplitInfo> getSplitList() { return splitList; }
}
