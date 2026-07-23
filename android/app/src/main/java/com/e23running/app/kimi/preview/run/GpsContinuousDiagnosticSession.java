package com.e23running.app.kimi.preview.run;

import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.util.Log;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

/**
 * E23跑起来 · 独立持续GPS定位诊断会话
 *
 * 与正式跑步Service完全解耦，不创建Activity，不累计正式距离。
 * 支持两种Looper模式：主线程 / HandlerThread
 * 包含详细运行状态供React侧轮询读取。
 */
public class GpsContinuousDiagnosticSession {

    private static final String TAG = "E23_GPS_CONTINUOUS";

    // 唯一实例（一次只能一个诊断会话）
    private static GpsContinuousDiagnosticSession sInstance;

    // 配置
    private final String sessionId;
    private final String modeName; // "MAIN_THREAD" / "HANDLER_THREAD" / "STANDARD_60S"
    private final long durationMs;
    private final boolean useHandlerThread;

    // 注入
    private final LocationManager locationManager;

    // 线程与Handler
    private HandlerThread handlerThread;
    private Handler threadHandler;

    // LocationListener（成员变量，防止GC）
    private final LocationListenerImpl listener = new LocationListenerImpl();
    private final int listenerHash = System.identityHashCode(listener);

    // 状态
    private final AtomicBoolean started = new AtomicBoolean(false);
    private final AtomicBoolean requestInvoked = new AtomicBoolean(false);
    private final AtomicBoolean requestSucceeded = new AtomicBoolean(false);
    private final AtomicLong requestTimestampMs = new AtomicLong(0);
    private final AtomicInteger callbackCount = new AtomicInteger(0);
    private final AtomicLong firstCallbackMs = new AtomicLong(0);
    private final AtomicLong lastCallbackMs = new AtomicLong(0);
    private final AtomicReference<Location> lastLocation = new AtomicReference<>(null);
    private final AtomicReference<String> lastError = new AtomicReference<>(null);
    private final AtomicBoolean stopped = new AtomicBoolean(false);
    private final AtomicBoolean removeUpdatesCalled = new AtomicBoolean(false);
    private final AtomicBoolean threadQuitCalled = new AtomicBoolean(false);

    private GpsContinuousDiagnosticSession(LocationManager mgr, String sessionId, String modeName, long durationMs, boolean useHandlerThread) {
        this.locationManager = mgr;
        this.sessionId = sessionId;
        this.modeName = modeName;
        this.durationMs = durationMs;
        this.useHandlerThread = useHandlerThread;
    }

    /**
     * 启动诊断会话
     *
     * @param mgr             LocationManager
     * @param sessionId       唯一会话ID
     * @param modeName        模式名称（显示用）
     * @param durationMs      持续毫秒
     * @param useHandlerThread true=HandlerThread Looper, false=主线程Looper
     * @return 会话实例
     */
    public static synchronized GpsContinuousDiagnosticSession startSession(
            LocationManager mgr, String sessionId, String modeName,
            long durationMs, boolean useHandlerThread) {
        if (sInstance != null) {
            sInstance.stop();
        }
        GpsContinuousDiagnosticSession session = new GpsContinuousDiagnosticSession(
                mgr, sessionId, modeName, durationMs, useHandlerThread);
        sInstance = session;
        session.startInternal();
        return session;
    }

    private void startInternal() {
        if (started.getAndSet(true)) return;

        Log.i(TAG, "SESSION_CREATED sessionId=" + sessionId
                + " mode=" + modeName
                + " useHandlerThread=" + useHandlerThread
                + " durationMs=" + durationMs);

        try {
            if (useHandlerThread) {
                handlerThread = new HandlerThread("E23GpsDiagThread-" + sessionId);
                handlerThread.start();
                Log.i(TAG, "THREAD_CREATED sessionId=" + sessionId + " thread=" + handlerThread.getName());

                // 等待Looper就绪
                while (handlerThread.getLooper() == null) {
                    try { Thread.sleep(10); } catch (InterruptedException ignored) {}
                }
                Log.i(TAG, "THREAD_STARTED sessionId=" + sessionId
                        + " looperAvailable=" + (handlerThread.getLooper() != null));
                threadHandler = new Handler(handlerThread.getLooper());
            }

            Log.i(TAG, "LISTENER_CREATED sessionId=" + sessionId
                    + " listenerHash=" + listenerHash);

            Looper looper = useHandlerThread ? handlerThread.getLooper() : Looper.getMainLooper();
            requestTimestampMs.set(System.currentTimeMillis());
            requestInvoked.set(true);

            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    1000L,           // minTime 1秒
                    0f,              // minDistance 0米
                    listener,
                    looper
            );

            requestSucceeded.set(true);
            Log.i(TAG, "REQUEST_SUCCEEDED sessionId=" + sessionId
                    + " provider=" + LocationManager.GPS_PROVIDER
                    + " minTime=1000 minDistance=0"
                    + " looper=" + (useHandlerThread ? "HandlerThread" : "MainLooper"));

        } catch (SecurityException e) {
            requestSucceeded.set(false);
            lastError.set("定位权限异常: " + e.getMessage());
            Log.e(TAG, "REQUEST_EXCEPTION sessionId=" + sessionId + " error=" + e.getMessage());
        } catch (Exception e) {
            requestSucceeded.set(false);
            lastError.set("requestLocationUpdates失败: " + e.getMessage());
            Log.e(TAG, "REQUEST_EXCEPTION sessionId=" + sessionId + " error=" + e.getMessage());
        }
    }

    /**
     * 停止诊断会话
     */
    public synchronized void stop() {
        if (stopped.getAndSet(true)) return;

        Log.i(TAG, "STOP_REQUESTED sessionId=" + sessionId
                + " callbackCount=" + callbackCount.get());

        if (locationManager != null && listener != null) {
            try {
                locationManager.removeUpdates(listener);
                removeUpdatesCalled.set(true);
                Log.i(TAG, "REMOVE_UPDATES sessionId=" + sessionId);
            } catch (Exception e) {
                Log.w(TAG, "removeUpdates failed sessionId=" + sessionId + " error=" + e.getMessage());
            }
        }

        if (handlerThread != null) {
            if (Build.VERSION.SDK_INT >= 18) {
                handlerThread.quitSafely();
            } else {
                handlerThread.quit();
            }
            threadQuitCalled.set(true);
            Log.i(TAG, "THREAD_QUIT sessionId=" + sessionId);
        }

        if (sInstance == this) {
            sInstance = null;
        }
        Log.i(TAG, "SESSION_FINISHED sessionId=" + sessionId);
    }

    /**
     * 获取当前诊断状态（供React侧轮询）
     */
    public JSObject getDiagnosticState() {
        JSObject ret = new JSObject();
        ret.put("sessionId", sessionId);
        ret.put("modeName", modeName);
        ret.put("started", started.get());
        ret.put("requestInvoked", requestInvoked.get());
        ret.put("requestSucceeded", requestSucceeded.get());
        ret.put("requestTimestampMs", requestTimestampMs.get());
        ret.put("listenerCreated", true);
        ret.put("listenerHash", listenerHash);
        ret.put("handlerThreadCreated", useHandlerThread && handlerThread != null);
        ret.put("handlerThreadAlive", handlerThread != null && handlerThread.isAlive());
        ret.put("looperAvailable", !useHandlerThread || (handlerThread != null && handlerThread.getLooper() != null));
        ret.put("callbackCount", callbackCount.get());
        ret.put("firstCallbackMs", firstCallbackMs.get());
        ret.put("lastCallbackMs", lastCallbackMs.get());
        ret.put("removeUpdatesCalled", removeUpdatesCalled.get());
        ret.put("threadQuitCalled", threadQuitCalled.get());
        ret.put("stopped", stopped.get());
        ret.put("lastError", lastError.get());

        Location loc = lastLocation.get();
        if (loc != null) {
            ret.put("lastLatitude", loc.getLatitude());
            ret.put("lastLongitude", loc.getLongitude());
            ret.put("lastAccuracy", loc.hasAccuracy() ? loc.getAccuracy() : -1);
            ret.put("lastSpeed", loc.hasSpeed() ? loc.getSpeed() : -1);
            ret.put("lastBearing", loc.hasBearing() ? loc.getBearing() : -1);
            ret.put("lastProvider", loc.getProvider());
            ret.put("lastAltitude", loc.hasAltitude() ? loc.getAltitude() : 0);
        }

        // 标准字段（兼容现有getDiagnostics字段名）
        ret.put("gpsCallbackCount", callbackCount.get());
        ret.put("firstFixReceived", firstCallbackMs.get() > 0);
        ret.put("lastLocationCallbackMs", lastCallbackMs.get());
        ret.put("locationRequestSucceeded", requestSucceeded.get());

        return ret;
    }

    public static synchronized JSObject getCurrentDiagnosticState() {
        if (sInstance == null) {
            JSObject empty = new JSObject();
            empty.put("sessionId", "");
            empty.put("started", false);
            empty.put("callbackCount", 0);
            empty.put("gpsCallbackCount", 0);
            empty.put("firstFixReceived", false);
            empty.put("locationRequestSucceeded", false);
            empty.put("requestInvoked", false);
            empty.put("listenerCreated", false);
            empty.put("handlerThreadAlive", false);
            empty.put("looperAvailable", false);
            empty.put("removeUpdatesCalled", false);
            empty.put("threadQuitCalled", false);
            empty.put("stopped", true);
            return empty;
        }
        return sInstance.getDiagnosticState();
    }

    // ========================================================================
    // LocationListener 实现（成员内部类，不会被GC）
    // ========================================================================
    private class LocationListenerImpl implements LocationListener {
        @Override
        public void onLocationChanged(Location location) {
            if (location == null) return;

            int count = callbackCount.incrementAndGet();
            if (firstCallbackMs.get() == 0) {
                firstCallbackMs.set(System.currentTimeMillis());
            }
            lastCallbackMs.set(System.currentTimeMillis());
            lastLocation.set(location);

            String threadName = Thread.currentThread().getName();
            Log.d(TAG, "ON_LOCATION_CHANGED sessionId=" + sessionId
                    + " callbackCount=" + count
                    + " provider=" + location.getProvider()
                    + " lat=" + location.getLatitude()
                    + " lng=" + location.getLongitude()
                    + " acc=" + (location.hasAccuracy() ? location.getAccuracy() : -1)
                    + " thread=" + threadName);
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {
            Log.d(TAG, "ON_STATUS_CHANGED sessionId=" + sessionId
                    + " provider=" + provider + " status=" + status);
        }

        @Override
        public void onProviderEnabled(String provider) {
            Log.d(TAG, "ON_PROVIDER_ENABLED sessionId=" + sessionId + " provider=" + provider);
        }

        @Override
        public void onProviderDisabled(String provider) {
            Log.d(TAG, "ON_PROVIDER_DISABLED sessionId=" + sessionId + " provider=" + provider);
        }
    }
}
