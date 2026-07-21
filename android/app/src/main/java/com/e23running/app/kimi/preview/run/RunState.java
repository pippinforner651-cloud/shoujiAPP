package com.e23running.app.kimi.preview.run;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.ArrayList;
import java.util.List;

/**
 * 跑步活动状态模型
 * 保存GPS轨迹点、分段、暂停周期等完整数据
 */
public class RunState {
    public static final int STATE_IDLE = 0;
    public static final int STATE_RUNNING = 1;
    public static final int STATE_PAUSED = 2;

    public String clientActivityId;
    public int state;
    public long startTimeMs;
    public long endTimeMs;
    public long totalPausedMs;
    public double totalDistanceM;
    public long totalDurationMs;
    public long movingDurationMs;
    public long lastPauseStartMs;
    public int currentSplitIndex;
    public double splitDistanceM;

    public List<TrackPoint> trackPoints;
    public List<SplitInfo> splitInfos;
    public List<PausePeriod> pausePeriods;

    public RunState() {
        this.state = STATE_IDLE;
        this.trackPoints = new ArrayList<>();
        this.splitInfos = new ArrayList<>();
        this.pausePeriods = new ArrayList<>();
    }

    /** 保存到JSON，用于持久化 */
    public JSONObject toJson() throws JSONException {
        JSONObject obj = new JSONObject();
        obj.put("clientActivityId", clientActivityId != null ? clientActivityId : "");
        obj.put("state", state);
        obj.put("startTimeMs", startTimeMs);
        obj.put("endTimeMs", endTimeMs);
        obj.put("totalPausedMs", totalPausedMs);
        obj.put("totalDistanceM", totalDistanceM);
        obj.put("totalDurationMs", totalDurationMs);
        obj.put("movingDurationMs", movingDurationMs);
        obj.put("lastPauseStartMs", lastPauseStartMs);
        obj.put("currentSplitIndex", currentSplitIndex);
        obj.put("splitDistanceM", splitDistanceM);

        JSONArray pts = new JSONArray();
        for (TrackPoint p : trackPoints) pts.put(p.toJson());
        obj.put("trackPoints", pts);

        JSONArray splits = new JSONArray();
        for (SplitInfo s : splitInfos) splits.put(s.toJson());
        obj.put("splitInfos", splits);

        JSONArray pauses = new JSONArray();
        for (PausePeriod p : pausePeriods) pauses.put(p.toJson());
        obj.put("pausePeriods", pauses);

        return obj;
    }

    /** 从JSON还原 */
    public static RunState fromJson(JSONObject obj) throws JSONException {
        RunState rs = new RunState();
        rs.clientActivityId = obj.optString("clientActivityId", "");
        rs.state = obj.getInt("state");
        rs.startTimeMs = obj.getLong("startTimeMs");
        rs.endTimeMs = obj.getLong("endTimeMs");
        rs.totalPausedMs = obj.getLong("totalPausedMs");
        rs.totalDistanceM = obj.getDouble("totalDistanceM");
        rs.totalDurationMs = obj.getLong("totalDurationMs");
        rs.movingDurationMs = obj.getLong("movingDurationMs");
        rs.lastPauseStartMs = obj.getLong("lastPauseStartMs");
        rs.currentSplitIndex = obj.getInt("currentSplitIndex");
        rs.splitDistanceM = obj.getDouble("splitDistanceM");

        JSONArray pts = obj.optJSONArray("trackPoints");
        if (pts != null) {
            for (int i = 0; i < pts.length(); i++)
                rs.trackPoints.add(TrackPoint.fromJson(pts.getJSONObject(i)));
        }

        JSONArray splits = obj.optJSONArray("splitInfos");
        if (splits != null) {
            for (int i = 0; i < splits.length(); i++)
                rs.splitInfos.add(SplitInfo.fromJson(splits.getJSONObject(i)));
        }

        JSONArray pauses = obj.optJSONArray("pausePeriods");
        if (pauses != null) {
            for (int i = 0; i < pauses.length(); i++)
                rs.pausePeriods.add(PausePeriod.fromJson(pauses.getJSONObject(i)));
        }

        return rs;
    }

    /** GPS轨迹点 */
    public static class TrackPoint {
        public double latitude;
        public double longitude;
        public float accuracy;
        public double altitude;
        public float speed;
        public float bearing;
        public long timestampMs;
        public boolean accepted;
        public String rejectionReason;
        public boolean mockLocation;
        public long createdAtMs;

        public JSONObject toJson() throws JSONException {
            JSONObject obj = new JSONObject();
            obj.put("lat", latitude);
            obj.put("lon", longitude);
            obj.put("accuracy", accuracy);
            obj.put("altitude", altitude);
            obj.put("speed", speed);
            obj.put("bearing", bearing);
            obj.put("ts", timestampMs);
            obj.put("accepted", accepted);
            obj.put("rejectionReason", rejectionReason);
            obj.put("mock", mockLocation);
            obj.put("createdAt", createdAtMs);
            return obj;
        }

        public static TrackPoint fromJson(JSONObject obj) throws JSONException {
            TrackPoint p = new TrackPoint();
            p.latitude = obj.getDouble("lat");
            p.longitude = obj.getDouble("lon");
            p.accuracy = (float) obj.optDouble("accuracy", 999);
            p.altitude = obj.optDouble("altitude", 0);
            p.speed = (float) obj.optDouble("speed", 0);
            p.bearing = (float) obj.optDouble("bearing", 0);
            p.timestampMs = obj.getLong("ts");
            p.accepted = obj.optBoolean("accepted", true);
            p.rejectionReason = obj.optString("rejectionReason", null);
            if (p.rejectionReason != null && p.rejectionReason.isEmpty()) p.rejectionReason = null;
            p.mockLocation = obj.optBoolean("mock", false);
            p.createdAtMs = obj.optLong("createdAt", System.currentTimeMillis());
            return p;
        }
    }

    /** 每公里分段 */
    public static class SplitInfo {
        public int splitIndex;
        public double distanceM;
        public double durationS;
        public double paceSecPerKm;
        public long startTimeMs;
        public long endTimeMs;

        public JSONObject toJson() throws JSONException {
            JSONObject obj = new JSONObject();
            obj.put("splitIndex", splitIndex);
            obj.put("distanceM", distanceM);
            obj.put("durationS", durationS);
            obj.put("pace", paceSecPerKm);
            obj.put("startTime", startTimeMs);
            obj.put("endTime", endTimeMs);
            return obj;
        }

        public static SplitInfo fromJson(JSONObject obj) throws JSONException {
            SplitInfo s = new SplitInfo();
            s.splitIndex = obj.getInt("splitIndex");
            s.distanceM = obj.getDouble("distanceM");
            s.durationS = obj.getDouble("durationS");
            s.paceSecPerKm = obj.getDouble("pace");
            s.startTimeMs = obj.getLong("startTime");
            s.endTimeMs = obj.getLong("endTime");
            return s;
        }
    }

    /** 跑步摘要（不含完整轨迹点） */
    public static class RunSummary {
        public String clientActivityId;
        public long startTimeMs;
        public long endTimeMs;
        public double totalDistanceM;
        public long totalPausedMs;
        public long totalDurationMs;
        public long movingDurationMs;
        public int totalPoints;
        public int rejectedPoints;
        public int mockPoints;
        public int highSpeedPoints;
        public String serverUploadState;
    }

    /** 暂停周期 */
    public static class PausePeriod {
        public long startMs;
        public long endMs;

        public JSONObject toJson() throws JSONException {
            JSONObject obj = new JSONObject();
            obj.put("startMs", startMs);
            obj.put("endMs", endMs);
            return obj;
        }

        public static PausePeriod fromJson(JSONObject obj) throws JSONException {
            PausePeriod p = new PausePeriod();
            p.startMs = obj.getLong("startMs");
            p.endMs = obj.getLong("endMs");
            return p;
        }
    }
}
