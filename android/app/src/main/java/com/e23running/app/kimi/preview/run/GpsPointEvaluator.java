package com.e23running.app.kimi.preview.run;

import java.util.Locale;

/**
 * Pure Java GPS point quality and distance evaluator.
 * It has no Android framework dependency so the rules can be tested offline.
 */
public final class GpsPointEvaluator {
    public static final float FIRST_FIX_ACCURACY_MAX_M = 100f;
    public static final float RUNNING_ACCURACY_MAX_M = 50f;
    public static final double MIN_POINT_DISTANCE_M = 0.5d;
    public static final double NORMAL_SPEED_MAX_MPS = 8d;
    public static final double SUSPICIOUS_SPEED_MAX_MPS = 12d;

    private Sample baseline;

    public Result evaluate(Sample sample, boolean accumulateDistance) {
        if (sample == null) return Result.rejected("missing_point");
        if (sample.mockLocation) return Result.rejected("mock_location");
        if (!isCoordinateValid(sample.latitude, sample.longitude) || sample.timestampMs <= 0) {
            return Result.rejected("invalid_coordinate_or_time");
        }

        String provider = normalizeProvider(sample.provider);
        if ("network".equals(provider)) return Result.rejected("network_assist_only");
        if ("passive".equals(provider)) return Result.rejected("passive_provider");
        if (!"gps".equals(provider)) return Result.rejected("unsupported_provider");

        float accuracyLimit = baseline == null ? FIRST_FIX_ACCURACY_MAX_M : RUNNING_ACCURACY_MAX_M;
        if (!Float.isFinite(sample.accuracy) || sample.accuracy < 0f || sample.accuracy > accuracyLimit) {
            return Result.rejected(baseline == null ? "first_fix_accuracy" : "accuracy_too_low");
        }

        if (baseline == null) {
            baseline = copy(sample);
            Result result = Result.accepted();
            result.firstFix = true;
            return result;
        }

        if (sample.timestampMs <= baseline.timestampMs) {
            return Result.rejected("time_not_increasing");
        }

        double distanceM = haversineM(
            baseline.latitude,
            baseline.longitude,
            sample.latitude,
            sample.longitude
        );
        if (distanceM < MIN_POINT_DISTANCE_M) {
            Result result = Result.rejected("duplicate_point");
            result.calculatedSpeedMps = speed(distanceM, sample.timestampMs - baseline.timestampMs);
            return result;
        }

        double calculatedSpeedMps = speed(distanceM, sample.timestampMs - baseline.timestampMs);
        if (!Double.isFinite(calculatedSpeedMps) || calculatedSpeedMps > SUSPICIOUS_SPEED_MAX_MPS) {
            Result result = Result.rejected("speed_too_high");
            result.calculatedSpeedMps = calculatedSpeedMps;
            return result;
        }

        Result result = Result.accepted();
        result.calculatedSpeedMps = calculatedSpeedMps;
        result.distanceDeltaM = accumulateDistance ? distanceM : 0d;
        if (calculatedSpeedMps > NORMAL_SPEED_MAX_MPS) {
            result.riskFlag = "suspicious_speed";
        }
        baseline = copy(sample);
        return result;
    }

    public void reset() {
        baseline = null;
    }

    public boolean hasFirstFix() {
        return baseline != null;
    }

    public Sample getBaseline() {
        return baseline == null ? null : copy(baseline);
    }

    public void restoreBaseline(Sample sample) {
        baseline = sample == null ? null : copy(sample);
    }

    public static double haversineM(double lat1, double lon1, double lat2, double lon2) {
        final double earthRadiusM = 6_371_000d;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2d) * Math.sin(dLat / 2d)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2d) * Math.sin(dLon / 2d);
        return 2d * earthRadiusM * Math.asin(Math.sqrt(a));
    }

    private static double speed(double distanceM, long deltaMs) {
        return deltaMs > 0 ? distanceM / (deltaMs / 1000d) : Double.POSITIVE_INFINITY;
    }

    private static boolean isCoordinateValid(double latitude, double longitude) {
        return Double.isFinite(latitude)
            && Double.isFinite(longitude)
            && latitude >= -90d
            && latitude <= 90d
            && longitude >= -180d
            && longitude <= 180d;
    }

    private static String normalizeProvider(String provider) {
        return provider == null ? "" : provider.trim().toLowerCase(Locale.US);
    }

    private static Sample copy(Sample source) {
        Sample copy = new Sample();
        copy.provider = source.provider;
        copy.latitude = source.latitude;
        copy.longitude = source.longitude;
        copy.accuracy = source.accuracy;
        copy.timestampMs = source.timestampMs;
        copy.mockLocation = source.mockLocation;
        return copy;
    }

    public static final class Sample {
        public String provider;
        public double latitude;
        public double longitude;
        public float accuracy;
        public long timestampMs;
        public boolean mockLocation;
    }

    public static final class Result {
        public boolean accepted;
        public boolean firstFix;
        public String rejectionReason;
        public double calculatedSpeedMps;
        public double distanceDeltaM;
        public String riskFlag;

        private static Result accepted() {
            Result result = new Result();
            result.accepted = true;
            return result;
        }

        private static Result rejected(String reason) {
            Result result = new Result();
            result.accepted = false;
            result.rejectionReason = reason;
            return result;
        }
    }
}
