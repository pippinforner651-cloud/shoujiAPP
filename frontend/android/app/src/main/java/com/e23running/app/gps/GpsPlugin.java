package com.e23running.app.gps;

import android.content.Intent;
import android.location.Location;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * GpsPlugin — Capacitor 插件桥
 *
 * 将原生 GpsLocationEngine 的能力暴露给 JavaScript：
 * - startEngine / stopEngine
 * - getEngineStatus
 * - requestSingleFix
 * - startRun / pauseRun / resumeRun / stopRun (户外跑)
 */
@CapacitorPlugin(name = "GpsPlugin")
public class GpsPlugin extends Plugin {

    private static final String TAG = "GpsPlugin";
    private GpsLocationEngine engine;
    private GpsLocationEngine.EngineCallback engineCallback;

    @Override
    public void load() {
        super.load();
        Log.d(TAG, "GpsPlugin loaded");
        engine = new GpsLocationEngine(getContext());
        engineCallback = new GpsLocationEngine.EngineCallback() {
            @Override
            public void onLocationUpdate(Location location, int totalCallbacks) {
                JSObject data = new JSObject();
                try {
                    data.put("latitude", location.getLatitude());
                    data.put("longitude", location.getLongitude());
                    data.put("accuracy", location.getAccuracy());
                    data.put("altitude", location.getAltitude());
                    data.put("speed", location.getSpeed());
                    data.put("bearing", location.getBearing());
                    data.put("time", location.getTime());
                    data.put("provider", location.getProvider());
                    data.put("callbackCount", totalCallbacks);
                    notifyListeners("locationUpdate", data);
                } catch (Exception e) {
                    Log.e(TAG, "notify error: " + e.getMessage());
                }
            }

            @Override
            public void onEngineStatus(String status, String detail) {
                JSObject data = new JSObject();
                try {
                    data.put("status", status);
                    data.put("detail", detail);
                    data.put("callbackCount", engine.getCallbackCount());
                    notifyListeners("engineStatus", data);
                } catch (Exception e) {
                    Log.e(TAG, "notify error: " + e.getMessage());
                }
            }

            @Override
            public void onEngineError(String error) {
                JSObject data = new JSObject();
                try {
                    data.put("error", error);
                    notifyListeners("engineError", data);
                } catch (Exception e) {
                    Log.e(TAG, "notify error: " + e.getMessage());
                }
            }
        };
        engine.setCallback(engineCallback);
    }

    @PluginMethod
    public void startEngine(PluginCall call) {
        engine.start();
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Engine starting");
        call.resolve(ret);
    }

    @PluginMethod
    public void stopEngine(PluginCall call) {
        engine.stop();
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Engine stopped. Total callbacks=" + engine.getCallbackCount());
        call.resolve(ret);
    }

    @PluginMethod
    public void getEngineStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("isRunning", engine.isRunning());
        ret.put("callbackCount", engine.getCallbackCount());
        ret.put("lastCallbackTime", engine.getLastCallbackTime());
        ret.put("lastProvider", engine.getLastProvider());
        Location lastLoc = engine.getLastLocation();
        if (lastLoc != null) {
            JSObject loc = new JSObject();
            loc.put("latitude", lastLoc.getLatitude());
            loc.put("longitude", lastLoc.getLongitude());
            loc.put("accuracy", lastLoc.getAccuracy());
            loc.put("provider", lastLoc.getProvider());
            ret.put("lastLocation", loc);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void requestSingleFix(PluginCall call) {
        engine.requestSingleFix((success, location, detail) -> {
            JSObject ret = new JSObject();
            ret.put("success", success);
            if (location != null) {
                JSObject loc = new JSObject();
                loc.put("latitude", location.getLatitude());
                loc.put("longitude", location.getLongitude());
                loc.put("accuracy", location.getAccuracy());
                loc.put("provider", location.getProvider());
                ret.put("location", loc);
            }
            ret.put("detail", detail);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void startRun(PluginCall call) {
        String activityId = call.getString("activityId", "run_" + System.currentTimeMillis());
        Intent intent = new Intent(getContext(), GpsRunService.class);
        intent.setAction(GpsRunService.ACTION_START_RUN);
        intent.putExtra("activityId", activityId);
        getContext().startForegroundService(intent);
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("activityId", activityId);
        call.resolve(ret);
    }

    @PluginMethod
    public void pauseRun(PluginCall call) {
        Intent intent = new Intent(getContext(), GpsRunService.class);
        intent.setAction(GpsRunService.ACTION_PAUSE_RUN);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void resumeRun(PluginCall call) {
        Intent intent = new Intent(getContext(), GpsRunService.class);
        intent.setAction(GpsRunService.ACTION_RESUME_RUN);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void stopRun(PluginCall call) {
        Intent intent = new Intent(getContext(), GpsRunService.class);
        intent.setAction(GpsRunService.ACTION_STOP_RUN);
        getContext().startService(intent);
        JSObject ret = new JSObject();
        ret.put("success", true);
        ret.put("message", "Service stopping");
        call.resolve(ret);
    }
}
