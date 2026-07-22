package com.e23running.app.kimi.preview.run;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.content.ContentValues;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * GPS轨迹点与活动状态持久化
 * 使用Android原生SQLite，确保崩溃/重启后数据不丢失
 * 每个GPS点尽快落盘，坏点不影响其他点
 */
public class RunDatabaseHelper extends SQLiteOpenHelper {
    private static final String DB_NAME = "e23_run.db";
    private static final int DB_VERSION = 2;

    private static final String TABLE_ACTIVITY = "run_activity";
    private static final String TABLE_POINTS = "track_points";

    // 活动表
    private static final String CREATE_ACTIVITY =
        "CREATE TABLE " + TABLE_ACTIVITY + " (" +
        "client_activity_id TEXT PRIMARY KEY," +
        "state INTEGER NOT NULL DEFAULT 0," +
        "start_time_ms INTEGER NOT NULL," +
        "end_time_ms INTEGER NOT NULL DEFAULT 0," +
        "total_distance_m REAL NOT NULL DEFAULT 0," +
        "total_paused_ms INTEGER NOT NULL DEFAULT 0," +
        "total_duration_ms INTEGER NOT NULL DEFAULT 0," +
        "moving_duration_ms INTEGER NOT NULL DEFAULT 0," +
        "current_split_index INTEGER NOT NULL DEFAULT 0," +
        "split_distance_m REAL NOT NULL DEFAULT 0," +
        "last_pause_start_ms INTEGER NOT NULL DEFAULT 0," +
        "split_json TEXT," +
        "pause_json TEXT," +
        "server_upload_state TEXT NOT NULL DEFAULT 'local'," +
        "created_at_ms INTEGER NOT NULL" +
        ")";

    // 轨迹点表
    private static final String CREATE_POINTS =
        "CREATE TABLE " + TABLE_POINTS + " (" +
        "_id INTEGER PRIMARY KEY AUTOINCREMENT," +
        "client_activity_id TEXT NOT NULL," +
        "latitude REAL NOT NULL," +
        "longitude REAL NOT NULL," +
        "accuracy REAL NOT NULL DEFAULT 999," +
        "altitude REAL NOT NULL DEFAULT 0," +
        "speed REAL NOT NULL DEFAULT 0," +
        "bearing REAL NOT NULL DEFAULT 0," +
        "device_timestamp_ms INTEGER NOT NULL," +
        "accepted INTEGER NOT NULL DEFAULT 1," +
        "rejection_reason TEXT," +
        "mock_location INTEGER NOT NULL DEFAULT 0," +
        "provider TEXT NOT NULL DEFAULT ''," +
        "calculated_speed REAL NOT NULL DEFAULT 0," +
        "distance_delta REAL NOT NULL DEFAULT 0," +
        "risk_flag TEXT," +
        "created_at_ms INTEGER NOT NULL," +
        "FOREIGN KEY (client_activity_id) REFERENCES " + TABLE_ACTIVITY + "(client_activity_id)" +
        ")";

    private static RunDatabaseHelper instance;

    public static synchronized RunDatabaseHelper getInstance(Context context) {
        if (instance == null) {
            instance = new RunDatabaseHelper(context.getApplicationContext());
        }
        return instance;
    }

    private RunDatabaseHelper(Context context) {
        super(context, DB_NAME, null, DB_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL(CREATE_ACTIVITY);
        db.execSQL(CREATE_POINTS);
        db.execSQL("CREATE INDEX idx_points_activity ON " + TABLE_POINTS + "(client_activity_id)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            db.execSQL("ALTER TABLE " + TABLE_POINTS + " ADD COLUMN provider TEXT NOT NULL DEFAULT ''");
            db.execSQL("ALTER TABLE " + TABLE_POINTS + " ADD COLUMN calculated_speed REAL NOT NULL DEFAULT 0");
            db.execSQL("ALTER TABLE " + TABLE_POINTS + " ADD COLUMN distance_delta REAL NOT NULL DEFAULT 0");
            db.execSQL("ALTER TABLE " + TABLE_POINTS + " ADD COLUMN risk_flag TEXT");
        }
    }

    // ===== 活动管理 =====

    /** 创建新活动 */
    public String createActivity(long startTimeMs) {
        SQLiteDatabase db = getWritableDatabase();
        String id = "run_" + UUID.randomUUID().toString().replace("-", "") +
                    "_" + System.currentTimeMillis();
        ContentValues cv = new ContentValues();
        cv.put("client_activity_id", id);
        cv.put("state", RunState.STATE_RUNNING);
        cv.put("start_time_ms", startTimeMs);
        cv.put("created_at_ms", System.currentTimeMillis());
        db.insertOrThrow(TABLE_ACTIVITY, null, cv);
        return id;
    }

    /** 更新活动状态（不涉及轨迹点的轻量更新） */
    public void updateActivityState(String activityId, int state, long endTimeMs,
                                     double totalDistanceM, long totalPausedMs,
                                     long movingDurationMs, long totalDurationMs,
                                     int currentSplitIndex, double splitDistanceM,
                                     long lastPauseStartMs) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("state", state);
        cv.put("end_time_ms", endTimeMs);
        cv.put("total_distance_m", totalDistanceM);
        cv.put("total_paused_ms", totalPausedMs);
        cv.put("moving_duration_ms", movingDurationMs);
        cv.put("total_duration_ms", totalDurationMs);
        cv.put("current_split_index", currentSplitIndex);
        cv.put("split_distance_m", splitDistanceM);
        cv.put("last_pause_start_ms", lastPauseStartMs);
        db.update(TABLE_ACTIVITY, cv, "client_activity_id = ?", new String[]{activityId});
    }

    /** 保存分段时间JSON */
    public void saveSplitJson(String activityId, JSONArray splitJson) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("split_json", splitJson.toString());
        db.update(TABLE_ACTIVITY, cv, "client_activity_id = ?", new String[]{activityId});
    }

    /** 保存暂停周期JSON */
    public void savePauseJson(String activityId, JSONArray pauseJson) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("pause_json", pauseJson.toString());
        db.update(TABLE_ACTIVITY, cv, "client_activity_id = ?", new String[]{activityId});
    }

    /** 标记活动已完成 */
    public void finishActivity(String activityId, long endTimeMs) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("state", RunState.STATE_IDLE);
        cv.put("end_time_ms", endTimeMs);
        db.update(TABLE_ACTIVITY, cv, "client_activity_id = ?", new String[]{activityId});
    }

    /** Preserve an unfinished record for audit without exposing it as a finished run. */
    public void abandonActivity(String activityId, long endTimeMs) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("state", RunState.STATE_ABANDONED);
        cv.put("end_time_ms", endTimeMs);
        db.update(TABLE_ACTIVITY, cv, "client_activity_id = ?", new String[]{activityId});
    }

    // ===== 轨迹点管理 =====

    /** 插入GPS轨迹点（每个点独立写入，坏点不影响其他点） */
    public long insertTrackPoint(String activityId, RunState.TrackPoint point) {
        SQLiteDatabase db = getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("client_activity_id", activityId);
        cv.put("latitude", point.latitude);
        cv.put("longitude", point.longitude);
        cv.put("accuracy", point.accuracy);
        cv.put("altitude", point.altitude);
        cv.put("speed", point.speed);
        cv.put("bearing", point.bearing);
        cv.put("device_timestamp_ms", point.timestampMs);
        cv.put("accepted", point.accepted ? 1 : 0);
        cv.put("rejection_reason", point.rejectionReason);
        cv.put("mock_location", point.mockLocation ? 1 : 0);
        cv.put("provider", point.provider != null ? point.provider : "");
        cv.put("calculated_speed", point.calculatedSpeed);
        cv.put("distance_delta", point.distanceDelta);
        cv.put("risk_flag", point.riskFlag);
        cv.put("created_at_ms", System.currentTimeMillis());
        return db.insert(TABLE_POINTS, null, cv);
    }

    /** 批量插入轨迹点（事务方式，更快） */
    public void insertTrackPoints(String activityId, List<RunState.TrackPoint> points) {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            for (RunState.TrackPoint p : points) {
                ContentValues cv = new ContentValues();
                cv.put("client_activity_id", activityId);
                cv.put("latitude", p.latitude);
                cv.put("longitude", p.longitude);
                cv.put("accuracy", p.accuracy);
                cv.put("altitude", p.altitude);
                cv.put("speed", p.speed);
                cv.put("bearing", p.bearing);
                cv.put("device_timestamp_ms", p.timestampMs);
                cv.put("accepted", p.accepted ? 1 : 0);
                cv.put("rejection_reason", p.rejectionReason);
                cv.put("mock_location", p.mockLocation ? 1 : 0);
                cv.put("provider", p.provider != null ? p.provider : "");
                cv.put("calculated_speed", p.calculatedSpeed);
                cv.put("distance_delta", p.distanceDelta);
                cv.put("risk_flag", p.riskFlag);
                cv.put("created_at_ms", System.currentTimeMillis());
                db.insert(TABLE_POINTS, null, cv);
            }
            db.setTransactionSuccessful();
        } finally {
            db.endTransaction();
        }
    }

    // ===== 查询 =====

    /** 检测是否有未结束的活动 */
    public String findActiveRun() {
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT client_activity_id FROM " + TABLE_ACTIVITY +
            " WHERE state IN (?, ?) AND end_time_ms = 0 LIMIT 1",
            new String[]{String.valueOf(RunState.STATE_RUNNING), String.valueOf(RunState.STATE_PAUSED)});
        try {
            if (c.moveToFirst()) return c.getString(0);
            return null;
        } finally {
            c.close();
        }
    }

    /** 读取完整活动状态（含轨迹点数） */
    public RunState loadRunState(String activityId) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery("SELECT * FROM " + TABLE_ACTIVITY +
            " WHERE client_activity_id = ?", new String[]{activityId});
        try {
            if (!c.moveToFirst()) return null;
            RunState rs = new RunState();
            rs.clientActivityId = c.getString(c.getColumnIndexOrThrow("client_activity_id"));
            rs.state = c.getInt(c.getColumnIndexOrThrow("state"));
            rs.startTimeMs = c.getLong(c.getColumnIndexOrThrow("start_time_ms"));
            rs.endTimeMs = c.getLong(c.getColumnIndexOrThrow("end_time_ms"));
            rs.totalDistanceM = c.getDouble(c.getColumnIndexOrThrow("total_distance_m"));
            rs.totalPausedMs = c.getLong(c.getColumnIndexOrThrow("total_paused_ms"));
            rs.totalDurationMs = c.getLong(c.getColumnIndexOrThrow("total_duration_ms"));
            rs.movingDurationMs = c.getLong(c.getColumnIndexOrThrow("moving_duration_ms"));
            rs.currentSplitIndex = c.getInt(c.getColumnIndexOrThrow("current_split_index"));
            rs.splitDistanceM = c.getDouble(c.getColumnIndexOrThrow("split_distance_m"));
            rs.lastPauseStartMs = c.getLong(c.getColumnIndexOrThrow("last_pause_start_ms"));

            // 加载分段时间
            String splitStr = c.getString(c.getColumnIndexOrThrow("split_json"));
            if (splitStr != null) {
                JSONArray arr = new JSONArray(splitStr);
                for (int i = 0; i < arr.length(); i++)
                    rs.splitInfos.add(RunState.SplitInfo.fromJson(arr.getJSONObject(i)));
            }

            // 加载暂停周期
            String pauseStr = c.getString(c.getColumnIndexOrThrow("pause_json"));
            if (pauseStr != null) {
                JSONArray arr = new JSONArray(pauseStr);
                for (int i = 0; i < arr.length(); i++)
                    rs.pausePeriods.add(RunState.PausePeriod.fromJson(arr.getJSONObject(i)));
            }

            // 加载轨迹点数（不加载具体点，减轻内存压力）
            Cursor cntC = db.rawQuery(
                "SELECT COUNT(*) FROM " + TABLE_POINTS + " WHERE client_activity_id = ?",
                new String[]{activityId});
            if (cntC.moveToFirst()) {
                int count = cntC.getInt(0);
                // 占位
            }
            cntC.close();

            return rs;
        } catch (Exception e) {
            return null;
        } finally {
            c.close();
        }
    }

    /** 读取轨迹点摘要（不带完整点数据，仅用于快速摘要） */
    public RunState.RunSummary loadSummary(String activityId) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT a.*, " +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id) as total_pts," +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id AND p.accepted = 0) as rejected_pts," +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id AND p.mock_location = 1) as mock_pts," +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id AND p.speed > 10) as high_speed_pts" +
            " FROM " + TABLE_ACTIVITY + " a WHERE a.client_activity_id = ?",
            new String[]{activityId});
        try {
            if (!c.moveToFirst()) return null;
            RunState.RunSummary s = new RunState.RunSummary();
            s.clientActivityId = c.getString(c.getColumnIndexOrThrow("client_activity_id"));
            s.startTimeMs = c.getLong(c.getColumnIndexOrThrow("start_time_ms"));
            s.endTimeMs = c.getLong(c.getColumnIndexOrThrow("end_time_ms"));
            s.totalDistanceM = c.getDouble(c.getColumnIndexOrThrow("total_distance_m"));
            s.totalPausedMs = c.getLong(c.getColumnIndexOrThrow("total_paused_ms"));
            s.totalDurationMs = c.getLong(c.getColumnIndexOrThrow("total_duration_ms"));
            s.movingDurationMs = c.getLong(c.getColumnIndexOrThrow("moving_duration_ms"));
            s.totalPoints = c.getInt(c.getColumnIndexOrThrow("total_pts"));
            s.rejectedPoints = c.getInt(c.getColumnIndexOrThrow("rejected_pts"));
            s.mockPoints = c.getInt(c.getColumnIndexOrThrow("mock_pts"));
            s.highSpeedPoints = c.getInt(c.getColumnIndexOrThrow("high_speed_pts"));
            s.riskPoints = countRiskPoints(db, activityId);
            s.serverUploadState = c.getString(c.getColumnIndexOrThrow("server_upload_state"));
            return s;
        } catch (Exception e) {
            return null;
        } finally {
            c.close();
        }
    }

    /** 获取指定活动的轨迹点（分页，避免OOM） */
    public List<RunState.TrackPoint> loadTrackPoints(String activityId, int limit, int offset) {
        List<RunState.TrackPoint> points = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT * FROM " + TABLE_POINTS +
            " WHERE client_activity_id = ? ORDER BY device_timestamp_ms ASC LIMIT ? OFFSET ?",
            new String[]{activityId, String.valueOf(limit), String.valueOf(offset)});
        try {
            while (c.moveToNext()) {
                RunState.TrackPoint p = new RunState.TrackPoint();
                p.latitude = c.getDouble(c.getColumnIndexOrThrow("latitude"));
                p.longitude = c.getDouble(c.getColumnIndexOrThrow("longitude"));
                p.accuracy = c.getFloat(c.getColumnIndexOrThrow("accuracy"));
                p.altitude = c.getDouble(c.getColumnIndexOrThrow("altitude"));
                p.speed = c.getFloat(c.getColumnIndexOrThrow("speed"));
                p.bearing = c.getFloat(c.getColumnIndexOrThrow("bearing"));
                p.timestampMs = c.getLong(c.getColumnIndexOrThrow("device_timestamp_ms"));
                p.accepted = c.getInt(c.getColumnIndexOrThrow("accepted")) == 1;
                p.rejectionReason = c.getString(c.getColumnIndexOrThrow("rejection_reason"));
                p.mockLocation = c.getInt(c.getColumnIndexOrThrow("mock_location")) == 1;
                p.provider = c.getString(c.getColumnIndexOrThrow("provider"));
                p.calculatedSpeed = c.getDouble(c.getColumnIndexOrThrow("calculated_speed"));
                p.distanceDelta = c.getDouble(c.getColumnIndexOrThrow("distance_delta"));
                p.riskFlag = c.getString(c.getColumnIndexOrThrow("risk_flag"));
                p.createdAtMs = c.getLong(c.getColumnIndexOrThrow("created_at_ms"));
                points.add(p);
            }
            return points;
        } finally {
            c.close();
        }
    }

    /** 获取历史活动列表 */
    public List<RunState.RunSummary> listFinishedActivities(int limit, int offset) {
        List<RunState.RunSummary> list = new ArrayList<>();
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT a.*, " +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id) as total_pts," +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id AND p.accepted = 0) as rejected_pts," +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id AND p.mock_location = 1) as mock_pts," +
            "  (SELECT COUNT(*) FROM " + TABLE_POINTS + " p WHERE p.client_activity_id = a.client_activity_id AND p.speed > 10) as high_speed_pts" +
            " FROM " + TABLE_ACTIVITY + " a WHERE a.state = ? ORDER BY a.start_time_ms DESC LIMIT ? OFFSET ?",
            new String[]{String.valueOf(RunState.STATE_IDLE), String.valueOf(limit), String.valueOf(offset)});
        try {
            while (c.moveToNext()) {
                RunState.RunSummary s = new RunState.RunSummary();
                s.clientActivityId = c.getString(c.getColumnIndexOrThrow("client_activity_id"));
                s.startTimeMs = c.getLong(c.getColumnIndexOrThrow("start_time_ms"));
                s.endTimeMs = c.getLong(c.getColumnIndexOrThrow("end_time_ms"));
                s.totalDistanceM = c.getDouble(c.getColumnIndexOrThrow("total_distance_m"));
                s.totalPausedMs = c.getLong(c.getColumnIndexOrThrow("total_paused_ms"));
                s.totalDurationMs = c.getLong(c.getColumnIndexOrThrow("total_duration_ms"));
                s.movingDurationMs = c.getLong(c.getColumnIndexOrThrow("moving_duration_ms"));
                s.totalPoints = c.getInt(c.getColumnIndexOrThrow("total_pts"));
                s.rejectedPoints = c.getInt(c.getColumnIndexOrThrow("rejected_pts"));
                s.mockPoints = c.getInt(c.getColumnIndexOrThrow("mock_pts"));
                s.highSpeedPoints = c.getInt(c.getColumnIndexOrThrow("high_speed_pts"));
                s.riskPoints = countRiskPoints(db, s.clientActivityId);
                s.serverUploadState = c.getString(c.getColumnIndexOrThrow("server_upload_state"));
                list.add(s);
            }
            return list;
        } finally {
            c.close();
        }
    }

    public int countTrackPoints(String activityId) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT COUNT(*) FROM " + TABLE_POINTS + " WHERE client_activity_id = ?",
            new String[]{activityId});
        try {
            return c.moveToFirst() ? c.getInt(0) : 0;
        } finally {
            c.close();
        }
    }

    public RunState.TrackPoint loadLastAcceptedGpsPoint(String activityId) {
        SQLiteDatabase db = getReadableDatabase();
        Cursor c = db.rawQuery(
            "SELECT * FROM " + TABLE_POINTS +
            " WHERE client_activity_id = ? AND accepted = 1 AND provider = 'gps'" +
            " ORDER BY device_timestamp_ms DESC LIMIT 1",
            new String[]{activityId});
        try {
            if (!c.moveToFirst()) return null;
            RunState.TrackPoint p = new RunState.TrackPoint();
            p.latitude = c.getDouble(c.getColumnIndexOrThrow("latitude"));
            p.longitude = c.getDouble(c.getColumnIndexOrThrow("longitude"));
            p.accuracy = c.getFloat(c.getColumnIndexOrThrow("accuracy"));
            p.timestampMs = c.getLong(c.getColumnIndexOrThrow("device_timestamp_ms"));
            p.mockLocation = c.getInt(c.getColumnIndexOrThrow("mock_location")) == 1;
            p.provider = c.getString(c.getColumnIndexOrThrow("provider"));
            return p;
        } finally {
            c.close();
        }
    }

    private int countRiskPoints(SQLiteDatabase db, String activityId) {
        Cursor c = db.rawQuery(
            "SELECT COUNT(*) FROM " + TABLE_POINTS +
            " WHERE client_activity_id = ? AND risk_flag IS NOT NULL AND risk_flag != ''",
            new String[]{activityId});
        try {
            return c.moveToFirst() ? c.getInt(0) : 0;
        } finally {
            c.close();
        }
    }
}
