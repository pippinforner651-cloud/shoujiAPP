package com.e23running.app.gps;

import android.content.Context;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.util.Log;

import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * GpsLocationEngine — 统一持续定位引擎
 *
 * 唯一负责：
 * - 启动/停止 HandlerThread
 * - 创建/注册/移除 LocationListener
 * - requestLocationUpdates
 * - callback 统计
 * - 状态输出
 *
 * GPS 测试中心和正式户外跑共用此引擎。
 * 禁止各自实现一套 listener。
 */
public class GpsLocationEngine {

    private static final String TAG = "GpsEngine";
    private static final long MIN_TIME_MS = 1000L;          // 1秒
    private static final float MIN_DISTANCE_M = 1.0f;       // 1米
    private static final long SINGLE_TIMEOUT_MS = 15000L;   // 单次定位超时

    private final Context context;
    private final LocationManager locationManager;

    private HandlerThread handlerThread;
    private Handler handler;
    private LocationListener listener;
    private boolean isRunning;

    // 统计
    private final AtomicInteger callbackCount = new AtomicInteger(0);
    private final AtomicLong lastCallbackTime = new AtomicLong(0);
    private final AtomicReference<String> lastProvider = new AtomicReference<>("");
    private final AtomicReference<Location> lastLocation = new AtomicReference<>(null);

    private EngineCallback engineCallback;

    public interface EngineCallback {
        void onLocationUpdate(Location location, int totalCallbacks);
        void onEngineStatus(String status, String detail);
        void onEngineError(String error);
    }

    public GpsLocationEngine(Context context) {
        this.context = context;
        this.locationManager = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
    }

    public void setCallback(EngineCallback cb) {
        this.engineCallback = cb;
    }

    /** 启动持续定位 */
    public synchronized void start() {
        if (isRunning) {
            Log.w(TAG, "Engine already running, skipping start");
            return;
        }

        // 检查 GPS 可用性
        if (!locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            notifyError("GPS_PROVIDER not enabled");
            return;
        }

        // 启动 HandlerThread
        handlerThread = new HandlerThread("GpsEngineThread");
        handlerThread.start();
        handler = new Handler(handlerThread.getLooper());

        // 重置计数器
        callbackCount.set(0);
        lastCallbackTime.set(0);
        lastProvider.set("");
        lastLocation.set(null);

        listener = new LocationListener() {
            @Override
            public void onLocationChanged(Location loc) {
                int count = callbackCount.incrementAndGet();
                long now = System.currentTimeMillis();
                lastCallbackTime.set(now);
                lastProvider.set(loc.getProvider());
                lastLocation.set(loc);

                Log.d(TAG, "Location #" + count
                        + " provider=" + loc.getProvider()
                        + " lat=" + loc.getLatitude()
                        + " lng=" + loc.getLongitude()
                        + " acc=" + loc.getAccuracy()
                        + " time=" + loc.getTime());

                if (engineCallback != null) {
                    engineCallback.onLocationUpdate(loc, count);
                }
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {
                String statusStr;
                switch (status) {
                    case android.location.LocationProvider.AVAILABLE:
                        statusStr = "AVAILABLE";
                        break;
                    case android.location.LocationProvider.TEMPORARILY_UNAVAILABLE:
                        statusStr = "TEMPORARILY_UNAVAILABLE";
                        break;
                    case android.location.LocationProvider.OUT_OF_SERVICE:
                        statusStr = "OUT_OF_SERVICE";
                        break;
                    default:
                        statusStr = "UNKNOWN";
                }
                Log.d(TAG, "Provider " + provider + " status: " + statusStr);
                notifyStatus("provider_status", provider + "=" + statusStr);
            }

            @Override
            public void onProviderEnabled(String provider) {
                Log.d(TAG, "Provider enabled: " + provider);
                notifyStatus("provider_enabled", provider);
            }

            @Override
            public void onProviderDisabled(String provider) {
                Log.d(TAG, "Provider disabled: " + provider);
                notifyStatus("provider_disabled", provider);
                if (LocationManager.GPS_PROVIDER.equals(provider)) {
                    notifyError("GPS_PROVIDER disabled during tracking");
                }
            }
        };

        try {
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    MIN_TIME_MS,
                    MIN_DISTANCE_M,
                    listener,
                    handler.getLooper()
            );

            // 同时注册 NETWORK_PROVIDER 作为辅助
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        MIN_TIME_MS * 2,
                        MIN_DISTANCE_M * 5,
                        listener,
                        handler.getLooper()
                );
            }

            isRunning = true;
            notifyStatus("started", "GPS_PROVIDER + NETWORK_PROVIDER registered");

            // 日志输出所有已注册 provider 状态
            for (String p : locationManager.getAllProviders()) {
                boolean enabled = locationManager.isProviderEnabled(p);
                Log.d(TAG, "Provider " + p + " enabled=" + enabled);
            }

        } catch (SecurityException e) {
            notifyError("SecurityException: " + e.getMessage());
        } catch (Exception e) {
            notifyError("Start failed: " + e.getMessage());
        }
    }

    /** 停止持续定位 */
    public synchronized void stop() {
        Log.d(TAG, "stop() called, isRunning=" + isRunning + " callbackCount=" + callbackCount.get());

        if (listener != null && locationManager != null) {
            try {
                locationManager.removeUpdates(listener);
                Log.d(TAG, "removeUpdates called successfully");
            } catch (Exception e) {
                Log.e(TAG, "removeUpdates error: " + e.getMessage());
            }
        }

        if (handlerThread != null) {
            handlerThread.quitSafely();
            handlerThread = null;
        }

        handler = null;
        listener = null;
        isRunning = false;

        notifyStatus("stopped", "Listener removed, thread quit. Total callbacks=" + callbackCount.get());
    }

    /** 获取当前回调统计 */
    public int getCallbackCount() {
        return callbackCount.get();
    }

    public long getLastCallbackTime() {
        return lastCallbackTime.get();
    }

    public String getLastProvider() {
        return lastProvider.get();
    }

    public Location getLastLocation() {
        return lastLocation.get();
    }

    public boolean isRunning() {
        return isRunning;
    }

    private void notifyStatus(String status, String detail) {
        if (engineCallback != null) {
            engineCallback.onEngineStatus(status, detail);
        }
    }

    private void notifyError(String error) {
        Log.e(TAG, error);
        if (engineCallback != null) {
            engineCallback.onEngineError(error);
        }
    }

    /** 单次定位（快速测试） */
    public interface SingleFixCallback {
        void onResult(boolean success, Location location, String detail);
    }

    public void requestSingleFix(SingleFixCallback cb) {
        try {
            LocationListener singleListener = new LocationListener() {
                @Override
                public void onLocationChanged(Location loc) {
                    Log.d(TAG, "Single fix: " + loc.getLatitude() + "," + loc.getLongitude());
                    locationManager.removeUpdates(this);
                    if (cb != null) cb.onResult(true, loc, "single_gps");
                }

                @Override
                public void onStatusChanged(String provider, int status, Bundle extras) {}

                @Override
                public void onProviderEnabled(String provider) {}

                @Override
                public void onProviderDisabled(String provider) {
                    if (cb != null) cb.onResult(false, null, provider + "_disabled");
                }
            };

            locationManager.requestSingleUpdate(LocationManager.GPS_PROVIDER, singleListener, null);
        } catch (SecurityException e) {
            if (cb != null) cb.onResult(false, null, "security: " + e.getMessage());
        }
    }
}
