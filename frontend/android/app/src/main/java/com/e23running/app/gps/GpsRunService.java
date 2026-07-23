package com.e23running.app.gps;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * GpsRunService — 户外跑步前台 Service
 *
 * 生命周期：
 * - startForeground → GPS定位 → 暂停/继续 → 结束 → stopForeground/stopSelf
 * - 与 GpsLocationEngine 共用同一个 listener
 * - 停止时先持久化数据，再移除 listener
 */
public class GpsRunService extends Service {

    private static final String TAG = "GpsRunService";
    private static final int NOTIFICATION_ID = 1001;
    private static final String CHANNEL_ID = "e23_run_channel";

    public static final String ACTION_START_RUN = "com.e23running.action.START_RUN";
    public static final String ACTION_PAUSE_RUN = "com.e23running.action.PAUSE_RUN";
    public static final String ACTION_RESUME_RUN = "com.e23running.action.RESUME_RUN";
    public static final String ACTION_STOP_RUN = "com.e23running.action.STOP_RUN";

    private GpsLocationEngine gpsEngine;
    private PowerManager.WakeLock wakeLock;
    private String currentActivityId;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.d(TAG, "onCreate");
        createNotificationChannel();
        gpsEngine = new GpsLocationEngine(this);
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            Log.w(TAG, "Null intent");
            return START_STICKY;
        }

        String action = intent.getAction();
        Log.d(TAG, "onStartCommand action=" + action);

        switch (action != null ? action : "") {
            case ACTION_START_RUN:
                currentActivityId = intent.getStringExtra("activityId");
                startForeground(NOTIFICATION_ID, buildNotification("户外跑进行中"));
                gpsEngine.setCallback(gpsCallback);
                gpsEngine.start();
                Log.d(TAG, "Run started. activityId=" + currentActivityId);
                break;

            case ACTION_PAUSE_RUN:
                updateNotification("户外跑已暂停");
                Log.d(TAG, "Run paused");
                break;

            case ACTION_RESUME_RUN:
                updateNotification("户外跑进行中");
                Log.d(TAG, "Run resumed");
                break;

            case ACTION_STOP_RUN:
                Log.d(TAG, "Stopping run... activityId=" + currentActivityId);
                gpsEngine.stop();
                releaseWakeLock();
                stopForeground(STOP_FOREGROUND_REMOVE);
                stopSelf();
                Log.d(TAG, "Run stopped. activityId=" + currentActivityId);
                break;

            default:
                Log.w(TAG, "Unknown action: " + action);
        }

        return START_STICKY;
    }

    private final GpsLocationEngine.EngineCallback gpsCallback = new GpsLocationEngine.EngineCallback() {
        @Override
        public void onLocationUpdate(Location location, int totalCallbacks) {
            Log.d(TAG, "GPS callback #" + totalCallbacks
                    + " lat=" + location.getLatitude()
                    + " lng=" + location.getLongitude()
                    + " acc=" + location.getAccuracy());
        }

        @Override
        public void onEngineStatus(String status, String detail) {
            Log.d(TAG, "Engine status: " + status + " detail=" + detail);
        }

        @Override
        public void onEngineError(String error) {
            Log.e(TAG, "Engine error: " + error);
        }
    };

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "户外跑状态",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("E23跑起来户外跑步通知");
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private Notification buildNotification(String text) {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("E23跑起来")
                .setContentText(text)
                .setSmallIcon(android.R.drawable.ic_menu_compass)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .build();
    }

    private void updateNotification(String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager != null) {
            manager.notify(NOTIFICATION_ID, buildNotification(text));
        }
    }

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "E23Run:WakeLock"
            );
            wakeLock.acquire(4 * 60 * 60 * 1000L); // 最多4小时
            Log.d(TAG, "WakeLock acquired");
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.d(TAG, "WakeLock released");
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.d(TAG, "onDestroy");
        gpsEngine.stop();
        releaseWakeLock();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
