package com.e23running.app.kimi.preview.run;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;

/**
 * E23跑起来 · Capacitor原生GPS跑步插件
 *
 * 桥接React层与Android原生前台定位服务
 * 所有GPS采集、轨迹持久化、活动状态管理在原生层完成
 *
 * JS接口：
 *   startRun() → { clientActivityId, startTimeMs }
 *   pauseRun() → {}
 *   resumeRun() → {}
 *   stopRun() → { summary: RunSummary }
 *   getRunState() → { state, clientActivityId, startTimeMs, totalDistanceM, ... }
 *   getCurrentStats() → { distanceM, durationMs, pace, ... }
 *   recoverActiveRun() → { activeRun: bool, ... } or null
 *   subscribeLocation(callback) → 实时GPS点推送
 *   subscribeStatus(callback) → 服务状态变化推送
 *   listFinishedActivities() → [RunSummary, ...]
 *   loadActivityTrackPoints(activityId, limit, offset) → [TrackPoint, ...]
 */
@CapacitorPlugin(
    name = "GpsRun",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class GpsRunPlugin extends Plugin implements GpsRunService.RunStateListener {
    private static final String TAG = "E23GpsRunPlugin";

    private RunDatabaseHelper dbHelper;

    @Override
    public void load() {
        super.load();
        dbHelper = RunDatabaseHelper.getInstance(getContext());
        GpsRunService.setRunStateListener(this);
        Log.i(TAG, "GpsRunPlugin loaded");
    }

    // ===== 运行控制 =====

    @PluginMethod
    public void checkOutdoorReadiness(PluginCall call) {
        if (!hasFineLocationPermission()) {
            requestPermissionForAlias("location", call, "locationPermissionCallback");
            return;
        }
        if (needsNotificationPermission()) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }
        resolveOutdoorReadiness(call);
    }

    @PermissionCallback
    private void locationPermissionCallback(PluginCall call) {
        if (hasFineLocationPermission() && needsNotificationPermission()) {
            requestPermissionForAlias("notifications", call, "notificationPermissionCallback");
            return;
        }
        resolveOutdoorReadiness(call);
    }

    @PermissionCallback
    private void notificationPermissionCallback(PluginCall call) {
        resolveOutdoorReadiness(call);
    }

    @PluginMethod
    public void prepareOutdoorRun(PluginCall call) {
        if (!hasFineLocationPermission()) {
            call.reject("需要精确位置权限后才能开始户外跑");
            return;
        }
        LocationManager manager = (LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
        boolean gpsEnabled = manager != null && manager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        if (!gpsEnabled) {
            call.reject("请先打开手机GPS定位开关");
            return;
        }
        Intent intent = new Intent(getContext(), GpsRunService.class);
        intent.setAction("PREPARE_RUN");
        startForegroundServiceCompat(intent);
        JSObject ret = new JSObject();
        ret.put("preparing", true);
        ret.put("gpsEnabled", true);
        ret.put("activityCreated", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void cancelPreparation(PluginCall call) {
        GpsRunService service = GpsRunService.getInstance();
        if (service != null) service.cancelPreparation();
        call.resolve();
    }

    @PluginMethod
    public void startRun(PluginCall call) {
        try {
            GpsRunService service = GpsRunService.getInstance();
            if (service == null) {
                call.reject("定位服务尚未准备完成，请稍候重试");
                return;
            }
            String activityId = service.startOfficialRun();

            JSObject ret = new JSObject();
            ret.put("clientActivityId", activityId);
            ret.put("startTimeMs", service.getStartTimeMs());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "startRun failed", e);
            call.reject("Failed to start run: " + e.getMessage());
        }
    }

    @PluginMethod
    public void pauseRun(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), GpsRunService.class);
            intent.setAction("PAUSE_RUN");
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to pause: " + e.getMessage());
        }
    }

    @PluginMethod
    public void resumeRun(PluginCall call) {
        try {
            Intent intent = new Intent(getContext(), GpsRunService.class);
            intent.setAction("RESUME_RUN");
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to resume: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopRun(PluginCall call) {
        try {
            GpsRunService service = GpsRunService.getInstance();
            RunState.RunSummary summary = service != null ? service.stopRunAndReturnSummary() : null;
            call.resolve(summary != null ? summaryToJS(summary) : new JSObject());
        } catch (Exception e) {
            call.reject("Failed to stop: " + e.getMessage());
        }
    }

    @PluginMethod
    public void abandonRun(PluginCall call) {
        try {
            GpsRunService service = GpsRunService.getInstance();
            if (service != null) service.abandonRun();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to abandon: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppLocationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开应用定位设置: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openSystemLocationSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("无法打开系统定位设置: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getRunState(PluginCall call) {
        GpsRunService svc = GpsRunService.getInstance();
        if (svc == null) {
            JSObject ret = new JSObject();
            ret.put("state", RunState.STATE_IDLE);
            ret.put("clientActivityId", JSONObject.NULL);
            ret.put("startTimeMs", 0);
            ret.put("totalDistanceM", 0);
            ret.put("totalMovingDurationMs", 0);
            ret.put("totalPausedMs", 0);
            ret.put("validPointCount", 0);
            ret.put("rejectedPointCount", 0);
            ret.put("currentSplitIndex", 0);
            ret.put("splitDistanceM", 0);
            call.resolve(ret);
            return;
        }

        JSObject ret = buildStatsJSObject(svc);
        ret.put("clientActivityId", svc.getCurrentActivityId());
        ret.put("startTimeMs", svc.getStartTimeMs());
        ret.put("state", svc.getRunState());
        call.resolve(ret);
    }

    @PluginMethod
    public void getCurrentStats(PluginCall call) {
        GpsRunService svc = GpsRunService.getInstance();
        if (svc == null) {
            JSObject ret = new JSObject();
            ret.put("state", RunState.STATE_IDLE);
            ret.put("distanceM", 0);
            ret.put("durationMs", 0);
            call.resolve(ret);
            return;
        }
        call.resolve(buildStatsJSObject(svc));
    }

    @PluginMethod
    public void recoverActiveRun(PluginCall call) {
        String activeId = dbHelper.findActiveRun();
        if (activeId == null) {
            call.resolve(new JSObject()); // empty = no active run
            return;
        }

        // 发送recover intent到service
        Intent intent = new Intent(getContext(), GpsRunService.class);
        intent.setAction("RECOVER_RUN");
        intent.putExtra("activityId", activeId);
        startForegroundServiceCompat(intent);

        // 查询数据库摘要
        RunState.RunSummary summary = dbHelper.loadSummary(activeId);
        if (summary != null) {
            try {
                JSObject ret = summaryToJS(summary);
                ret.put("activeRun", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.resolve(new JSObject());
            }
        } else {
            call.resolve(new JSObject());
        }
    }

    @PluginMethod
    public void listFinishedActivities(PluginCall call) {
        int limit = call.getInt("limit", 50);
        int offset = call.getInt("offset", 0);
        List<RunState.RunSummary> list = dbHelper.listFinishedActivities(limit, offset);

        try {
            JSONArray arr = new JSONArray();
            for (RunState.RunSummary s : list) {
                arr.put(summaryToNativeJSON(s));
            }
            JSObject ret = new JSObject();
            ret.put("activities", arr.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to list activities: " + e.getMessage());
        }
    }

    @PluginMethod
    public void loadActivityTrackPoints(PluginCall call) {
        String activityId = call.getString("activityId");
        if (activityId == null) {
            call.reject("activityId is required");
            return;
        }
        int limit = call.getInt("limit", 5000);
        int offset = call.getInt("offset", 0);

        List<RunState.TrackPoint> points = dbHelper.loadTrackPoints(activityId, limit, offset);

        try {
            JSONArray arr = new JSONArray();
            for (RunState.TrackPoint p : points) {
                arr.put(p.toJson());
            }
            JSObject ret = new JSObject();
            ret.put("points", arr.toString());
            ret.put("total", points.size());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to load points: " + e.getMessage());
        }
    }

    @PluginMethod
    public void finishAndUpload(PluginCall call) {
        String activityId = call.getString("activityId");
        if (activityId == null) {
            call.reject("activityId is required");
            return;
        }
        dbHelper.saveSplitJson(activityId, new JSONArray());
        dbHelper.savePauseJson(activityId, new JSONArray());

        call.resolve();
    }

    // ===== JS回调（持续推送） =====

    @Override
    public void onLocationUpdate(RunState.TrackPoint point) {
        try {
            JSObject ret = new JSObject();
            ret.put("type", "location");
            ret.put("lat", point.latitude);
            ret.put("lon", point.longitude);
            ret.put("accuracy", point.accuracy);
            ret.put("altitude", point.altitude);
            ret.put("speed", point.speed);
            ret.put("bearing", point.bearing);
            ret.put("timestamp", point.timestampMs);
            ret.put("accepted", point.accepted);
            ret.put("rejectionReason", point.rejectionReason != null ? point.rejectionReason : "");
            ret.put("mock", point.mockLocation);
            ret.put("provider", point.provider != null ? point.provider : "");
            ret.put("calculatedSpeed", point.calculatedSpeed);
            ret.put("distanceDelta", point.distanceDelta);
            ret.put("riskFlag", point.riskFlag != null ? point.riskFlag : "");
            notifyListeners("locationUpdate", ret);
        } catch (Exception e) {
            Log.w(TAG, "Error notifying location", e);
        }
    }

    @Override
    public void onStatsUpdate(double distanceM, long durationMs, long movingDurationMs,
                               double currentPace, double avgPace, int splitIndex,
                               double splitDistanceM, int state, int gpsPoints, int rejectedPts) {
        try {
            JSObject ret = new JSObject();
            ret.put("type", "stats");
            ret.put("distanceM", distanceM);
            ret.put("durationMs", durationMs);
            ret.put("movingDurationMs", movingDurationMs);
            ret.put("currentPace", currentPace);
            ret.put("avgPace", avgPace);
            ret.put("splitIndex", splitIndex);
            ret.put("splitDistanceM", splitDistanceM);
            ret.put("state", state);
            ret.put("gpsPoints", gpsPoints);
            ret.put("rejectedPoints", rejectedPts);
            notifyListeners("statsUpdate", ret);
        } catch (Exception e) {
            Log.w(TAG, "Error notifying stats", e);
        }
    }

    @Override
    public void onServiceStateChange(int state, String message) {
        try {
            JSObject ret = new JSObject();
            ret.put("type", "serviceState");
            ret.put("state", state);
            ret.put("message", message);
            notifyListeners("serviceStateChange", ret);
        } catch (Exception e) {
            Log.w(TAG, "Error notifying state", e);
        }
    }

    @Override
    public void onRunFinished(RunState.RunSummary summary) {
        try {
            notifyListeners("runFinished", summaryToJS(summary));
        } catch (Exception e) {
            Log.w(TAG, "Error notifying run finished", e);
        }
    }

    @Override
    public void onActiveRunDetected(String activityId, long startTimeMs, double distanceM) {
        try {
            JSObject ret = new JSObject();
            ret.put("type", "activeRunDetected");
            ret.put("clientActivityId", activityId);
            ret.put("startTimeMs", startTimeMs);
            ret.put("totalDistanceM", distanceM);
            ret.put("activeRun", true);
            notifyListeners("activeRunDetected", ret);
        } catch (Exception e) {
            Log.w(TAG, "Error notifying active run", e);
        }
    }

    // ===== 诊断接口 =====

    @PluginMethod
    public void getDiagnostics(PluginCall call) {
        GpsRunService svc = GpsRunService.getInstance();
        JSObject ret = new JSObject();
        ret.put("phoneBrand", Build.BRAND);
        ret.put("phoneModel", Build.MODEL);
        ret.put("androidVersion", Build.VERSION.RELEASE);
        ret.put("sdkVersion", Build.VERSION.SDK_INT);
        ret.put("pluginLoaded", true);
        putReadiness(ret);

        if (svc != null) {
            ret.put("serviceRunning", true);
            ret.put("runState", svc.getRunState());
            ret.put("activityId", svc.getCurrentActivityId());
            ret.put("startTimeMs", svc.getStartTimeMs());
            ret.put("totalDistanceM", svc.getTotalDistanceM());
            ret.put("lastLocationCallbackMs", svc.getLastLocationCallbackMs());
            ret.put("lastSqliteWriteMs", svc.getLastSqliteWriteMs());
            ret.put("lastNotificationUpdateMs", svc.getLastNotificationUpdateMs());
            ret.put("lastAccuracy", svc.getLastAccuracy());
            ret.put("validPoints", svc.getValidPointCount());
            ret.put("rejectedPoints", svc.getRejectedPointCount());
            ret.put("screenOff", svc.isScreenOff());
            ret.put("appBackgrounded", svc.isAppBackgrounded());
            ret.put("lastError", svc.getLastError() != null ? svc.getLastError() : "");
            ret.put("firstFixReceived", svc.hasFirstFix());
            ret.put("distMode", svc.getDistMode());
            ret.put("locationRequestSucceeded", svc.isLocationRequestSucceeded());
            ret.put("gpsCallbackCount", svc.getGpsCallbackCount());
            ret.put("networkCallbackCount", svc.getNetworkCallbackCount());
            ret.put("passiveCallbackCount", svc.getPassiveCallbackCount());
            ret.put("firstCallbackProvider", svc.getFirstCallbackProvider());
            ret.put("lastCallbackProvider", svc.getLastCallbackProvider());
            ret.put("lastRejectReason", svc.getLastRejectReason());

            // 诊断事件计数
            GpsRunService.Diagnostician diag = svc.getDiagnostics();
            ret.put("diagCount", diag.getEvents().size());
            ret.put("locationCallbackCount", diag.getEventCountByType(GpsRunService.DIAG_LOCATION_CALLBACK));
            ret.put("locationAcceptedCount", diag.getEventCountByType(GpsRunService.DIAG_LOCATION_ACCEPTED));
            ret.put("locationRejectedCount", diag.getEventCountByType(GpsRunService.DIAG_LOCATION_REJECTED));
            ret.put("sqliteWriteOk", diag.getEventCountByType(GpsRunService.DIAG_SQLITE_WRITE_OK));
            ret.put("sqliteWriteFailed", diag.getEventCountByType(GpsRunService.DIAG_SQLITE_WRITE_FAILED));
        } else {
            ret.put("serviceRunning", false);
            ret.put("locationRequestSucceeded", false);
            ret.put("gpsCallbackCount", 0);
            ret.put("networkCallbackCount", 0);
            ret.put("passiveCallbackCount", 0);
            ret.put("firstCallbackProvider", "");
            ret.put("lastCallbackProvider", "");
            ret.put("lastRejectReason", "");
        }

        call.resolve(ret);
    }

    @PluginMethod
    public void exportDiagnosticLog(PluginCall call) {
        GpsRunService svc = GpsRunService.getInstance();
        if (svc != null) {
            String log = svc.getDiagnostics().exportToText();
            JSObject ret = new JSObject();
            ret.put("log", log);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("log", "=== E23 GPS Diagnostic Log ===\nService not running.\n");
            ret.put("phoneBrand", Build.BRAND);
            ret.put("phoneModel", Build.MODEL);
            ret.put("androidVersion", Build.VERSION.RELEASE);
            call.resolve(ret);
        }
    }

    // ===== GPS测试中心 - 三层原生诊断 =====

    @PluginMethod
    public void requestSingleFix(PluginCall call) {
        try {
            if (!hasFineLocationPermission()) {
                call.reject("精确定位未授权");
                return;
            }
            LocationManager manager = (LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
            if (manager == null) { call.reject("LocationManager不可用"); return; }
            if (!isSystemLocationEnabled(manager)) { call.reject("系统定位未开启"); return; }
            if (!manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) { call.reject("GPS_PROVIDER未开启"); return; }

            // 使用单次定位API (API 30+) 或回退方案
            long startMs = System.currentTimeMillis();
            java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);
            final LocationManager mgr = manager;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                java.util.concurrent.Executor executor = android.os.AsyncTask.THREAD_POOL_EXECUTOR;
                mgr.getCurrentLocation(LocationManager.GPS_PROVIDER, null, executor, loc -> {
                    long endMs = System.currentTimeMillis();
                    JSObject ret = buildSingleFixResult(loc, startMs, endMs);
                    ret.put("api", "getCurrentLocation");
                    if (loc == null) {
                        // Try network as fallback
                        try {
                            mgr.getCurrentLocation(LocationManager.NETWORK_PROVIDER, null, executor, netLoc -> {
                                JSObject r2 = buildSingleFixResult(netLoc, startMs, endMs);
                                r2.put("api", "getCurrentLocation_networkFallback");
                                r2.put("gpsFailed", true);
                                call.resolve(r2);
                            });
                        } catch (Exception e) {
                            ret.put("error", "GPS返回null且NETWORK也失败");
                            call.resolve(ret);
                        }
                    } else {
                        call.resolve(ret);
                    }
                    latch.countDown();
                });
            } else {
                // API 29以下使用requestSingleUpdate
                android.location.LocationListener listener = new android.location.LocationListener() {
                    @Override public void onLocationChanged(android.location.Location loc) {
                        long endMs = System.currentTimeMillis();
                        JSObject ret = buildSingleFixResult(loc, startMs, endMs);
                        ret.put("api", "requestSingleUpdate");
                        mgr.removeUpdates(this);
                        call.resolve(ret);
                        latch.countDown();
                    }
                    @Override public void onStatusChanged(String p, int s, android.os.Bundle e) {}
                    @Override public void onProviderEnabled(String p) {}
                    @Override public void onProviderDisabled(String p) { call.reject("GPS定位过程中被关闭"); latch.countDown(); }
                };
                mgr.requestSingleUpdate(LocationManager.GPS_PROVIDER, listener, null);
            }

            // 60秒超时
            new Thread(() -> {
                try { if (!latch.await(60, java.util.concurrent.TimeUnit.SECONDS)) { call.reject("单次定位超时(60s)"); } }
                catch (InterruptedException e) { call.reject("定位被中断"); }
            }).start();
        } catch (SecurityException e) { call.reject("定位权限异常: " + e.getMessage());
        } catch (Exception e) { call.reject("单次定位失败: " + e.getMessage()); }
    }

    @PluginMethod
    public void startDiagnosticTracking(PluginCall call) {
        try {
            if (!hasFineLocationPermission()) { call.reject("精确定位未授权"); return; }
            LocationManager manager = (LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
            if (manager == null || !manager.isProviderEnabled(LocationManager.GPS_PROVIDER)) { call.reject("GPS_PROVIDER不可用"); return; }

            long durationMs = call.getInt("durationMs", 60000);
            JSObject result = new JSObject();
            result.put("startTimeMs", System.currentTimeMillis());
            result.put("durationMs", durationMs);
            result.put("gpsCallbackCount", 0);
            result.put("lockScreenPointCount", 0);
            result.put("errors", new org.json.JSONArray());
            // 简短的持续定位会在前端记录，这里只返回初始状态
            call.resolve(result);
        } catch (Exception e) { call.reject("诊断追踪启动失败: " + e.getMessage()); }
    }

    @PluginMethod
    public void cancelDiagnosticTracking(PluginCall call) {
        call.resolve();
    }

    private JSObject buildSingleFixResult(android.location.Location loc, long startMs, long endMs) {
        JSObject ret = new JSObject();
        ret.put("startTimeMs", startMs);
        ret.put("endTimeMs", endMs);
        ret.put("durationMs", endMs - startMs);
        if (loc != null) {
            ret.put("success", true);
            ret.put("provider", loc.getProvider());
            ret.put("latitude", loc.getLatitude());
            ret.put("longitude", loc.getLongitude());
            ret.put("accuracy", loc.hasAccuracy() ? loc.getAccuracy() : -1);
            ret.put("altitude", loc.hasAltitude() ? loc.getAltitude() : 0);
            ret.put("speed", loc.hasSpeed() ? loc.getSpeed() : -1);
            ret.put("bearing", loc.hasBearing() ? loc.getBearing() : -1);
            ret.put("locationTimestampMs", loc.getTime());
            ret.put("mockLocation", loc.isFromMockProvider());
            ret.put("locationApi", "live");
        } else {
            ret.put("success", false);
            ret.put("provider", "null");
            ret.put("error", "定位结果为null");
        }
        return ret;
    }

    // ===== 辅助方法 =====

    private boolean hasFineLocationPermission() {
        return ContextCompat.checkSelfPermission(getContext(), Manifest.permission.ACCESS_FINE_LOCATION)
            == PackageManager.PERMISSION_GRANTED;
    }

    private boolean needsNotificationPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED;
    }

    private boolean isSystemLocationEnabled(LocationManager manager) {
        if (manager == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) return manager.isLocationEnabled();
        return manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
            || manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
    }

    private void putReadiness(JSObject result) {
        boolean fineGranted = hasFineLocationPermission();
        boolean coarseGranted = ContextCompat.checkSelfPermission(
            getContext(), Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        LocationManager manager = (LocationManager) getContext().getSystemService(android.content.Context.LOCATION_SERVICE);
        boolean gpsEnabled = manager != null && manager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        boolean networkEnabled = manager != null && manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        boolean systemLocationEnabled = isSystemLocationEnabled(manager);
        boolean notificationPermissionGranted = !needsNotificationPermission();
        boolean foregroundServicePermissionGranted = Build.VERSION.SDK_INT < Build.VERSION_CODES.P
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.FOREGROUND_SERVICE)
                == PackageManager.PERMISSION_GRANTED;
        String locationPermission = fineGranted ? "precise" : coarseGranted ? "approximate" : "denied";
        result.put("fineLocationGranted", fineGranted);
        result.put("coarseLocationGranted", coarseGranted);
        result.put("locationPermission", locationPermission);
        result.put("systemLocationEnabled", systemLocationEnabled);
        result.put("gpsEnabled", gpsEnabled);
        result.put("networkEnabled", networkEnabled);
        result.put("notificationPermissionGranted", notificationPermissionGranted);
        result.put("foregroundServicePermissionGranted", foregroundServicePermissionGranted);
        result.put("ready", fineGranted && systemLocationEnabled && gpsEnabled);
    }

    private void resolveOutdoorReadiness(PluginCall call) {
        JSObject result = new JSObject();
        putReadiness(result);
        call.resolve(result);
    }

    private void startForegroundServiceCompat(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(intent);
        } else {
            getContext().startService(intent);
        }
    }

    private JSObject buildStatsJSObject(GpsRunService svc) {
        JSObject ret = new JSObject();
        long now = System.currentTimeMillis();
        long elapsedSec = svc.getRunState() == RunState.STATE_RUNNING
            ? (now - svc.getStartTimeMs() - svc.getTotalPausedMs()) / 1000 : 0;
        double distKm = svc.getTotalDistanceM() / 1000;
        double avgPace = distKm > 0 && elapsedSec > 0 ? elapsedSec / distKm : 0;

        ret.put("distanceM", svc.getTotalDistanceM());
        ret.put("durationMs", elapsedSec * 1000);
        ret.put("movingDurationMs", svc.getTotalPausedMs());
        ret.put("avgPace", avgPace);
        ret.put("currentPace", 0);
        ret.put("splitIndex", svc.getCurrentSplitIndex());
        ret.put("splitDistanceM", svc.getSplitDistanceM());
        ret.put("gpsPoints", svc.getValidPointCount());
        ret.put("rejectedPoints", svc.getRejectedPointCount());
        ret.put("state", svc.getRunState());
        return ret;
    }

    private JSObject summaryToJS(RunState.RunSummary s) {
        JSObject ret = new JSObject();
        ret.put("clientActivityId", s.clientActivityId);
        ret.put("startTimeMs", s.startTimeMs);
        ret.put("endTimeMs", s.endTimeMs);
        ret.put("totalDistanceM", s.totalDistanceM);
        ret.put("totalPausedMs", s.totalPausedMs);
        ret.put("totalDurationMs", s.totalDurationMs);
        ret.put("movingDurationMs", s.movingDurationMs);
        ret.put("totalPoints", s.totalPoints);
        ret.put("rejectedPoints", s.rejectedPoints);
        ret.put("mockPoints", s.mockPoints);
        ret.put("highSpeedPoints", s.highSpeedPoints);
        ret.put("riskPoints", s.riskPoints);
        ret.put("serverUploadState", s.serverUploadState != null ? s.serverUploadState : "local");
        return ret;
    }

    private JSONObject summaryToNativeJSON(RunState.RunSummary s) throws Exception {
        JSONObject obj = new JSONObject();
        obj.put("clientActivityId", s.clientActivityId);
        obj.put("startTimeMs", s.startTimeMs);
        obj.put("endTimeMs", s.endTimeMs);
        obj.put("totalDistanceM", s.totalDistanceM);
        obj.put("totalPausedMs", s.totalPausedMs);
        obj.put("totalDurationMs", s.totalDurationMs);
        obj.put("movingDurationMs", s.movingDurationMs);
        obj.put("totalPoints", s.totalPoints);
        obj.put("rejectedPoints", s.rejectedPoints);
        obj.put("mockPoints", s.mockPoints);
        obj.put("highSpeedPoints", s.highSpeedPoints);
        obj.put("riskPoints", s.riskPoints);
        obj.put("serverUploadState", s.serverUploadState != null ? s.serverUploadState : "local");
        return obj;
    }
}
