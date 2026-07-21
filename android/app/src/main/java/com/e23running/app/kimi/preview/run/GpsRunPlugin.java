package com.e23running.app.kimi.preview.run;

import android.content.Intent;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.List;
import java.util.UUID;

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
@CapacitorPlugin(name = "GpsRun")
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
    public void startRun(PluginCall call) {
        try {
            String activityId = createNewActivity();
            Intent intent = new Intent(getContext(), GpsRunService.class);
            intent.setAction("START_RUN");
            intent.putExtra("activityId", activityId);
            intent.putExtra("startTimeMs", System.currentTimeMillis());

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }

            JSObject ret = new JSObject();
            ret.put("clientActivityId", activityId);
            ret.put("startTimeMs", System.currentTimeMillis());
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
            Intent intent = new Intent(getContext(), GpsRunService.class);
            intent.setAction("STOP_RUN");
            getContext().startService(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop: " + e.getMessage());
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
        getContext().startService(intent);

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

    // ===== 辅助方法 =====

    private String createNewActivity() {
        String id = "run_" + UUID.randomUUID().toString().replace("-", "")
                    + "_" + System.currentTimeMillis();
        return dbHelper.createActivity(System.currentTimeMillis());
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
        obj.put("serverUploadState", s.serverUploadState != null ? s.serverUploadState : "local");
        return obj;
    }
}
