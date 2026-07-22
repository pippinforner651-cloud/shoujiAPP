package com.e23running.app.kimi.preview.run;

/**
 * Offline test harness for environments where Gradle cannot reach Google Maven.
 * The same rules are also covered by GpsPointEvaluatorTest under JUnit in CI.
 */
public final class GpsPointEvaluatorSelfTest {
    public static void main(String[] args) {
        firstFixIsBaselineOnly();
        secondGoodPointAddsDistance();
        poorAccuracyIsRejected();
        networkAndPassiveNeverAccumulate();
        duplicateAndTimeRegressionAreRejected();
        mockLocationIsRejected();
        suspiciousSpeedIsFlagged();
        impossibleSpeedIsRejected();
        resetClearsBaseline();
        System.out.println("GpsPointEvaluatorSelfTest: 9 passed");
    }

    private static void firstFixIsBaselineOnly() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        check(result.accepted && result.firstFix && close(result.distanceDeltaM, 0d), "first fix baseline");
    }

    private static void secondGoodPointAddsDistance() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600009, 113.970000, 8f, 2_000), true);
        check(result.accepted && result.distanceDeltaM > 0.5d, "good point distance");
    }

    private static void poorAccuracyIsRejected() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600000, 113.970000, 101f, 1_000), true);
        check(!result.accepted && "first_fix_accuracy".equals(result.rejectionReason), "poor accuracy");
    }

    private static void networkAndPassiveNeverAccumulate() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        GpsPointEvaluator.Result network = evaluator.evaluate(sample("network", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result passive = evaluator.evaluate(sample("passive", 22.600000, 113.970000, 8f, 2_000), true);
        check(!network.accepted && "network_assist_only".equals(network.rejectionReason), "network provider");
        check(!passive.accepted && "passive_provider".equals(passive.rejectionReason), "passive provider");
    }

    private static void duplicateAndTimeRegressionAreRejected() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 2_000), true);
        GpsPointEvaluator.Result duplicate = evaluator.evaluate(sample("gps", 22.600001, 113.970000, 8f, 3_000), true);
        GpsPointEvaluator.Result time = evaluator.evaluate(sample("gps", 22.600009, 113.970000, 8f, 2_000), true);
        check(!duplicate.accepted && "duplicate_point".equals(duplicate.rejectionReason), "duplicate");
        check(!time.accepted && "time_not_increasing".equals(time.rejectionReason), "timestamp");
    }

    private static void mockLocationIsRejected() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        GpsPointEvaluator.Sample point = sample("gps", 22.600000, 113.970000, 8f, 1_000);
        point.mockLocation = true;
        GpsPointEvaluator.Result result = evaluator.evaluate(point, true);
        check(!result.accepted && "mock_location".equals(result.rejectionReason), "mock");
    }

    private static void suspiciousSpeedIsFlagged() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600090, 113.970000, 8f, 2_000), true);
        check(result.accepted && "suspicious_speed".equals(result.riskFlag), "suspicious speed");
    }

    private static void impossibleSpeedIsRejected() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600180, 113.970000, 8f, 2_000), true);
        check(!result.accepted && "speed_too_high".equals(result.rejectionReason), "impossible speed");
    }

    private static void resetClearsBaseline() {
        GpsPointEvaluator evaluator = new GpsPointEvaluator();
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        evaluator.reset();
        check(!evaluator.hasFirstFix() && evaluator.getBaseline() == null, "reset");
    }

    private static GpsPointEvaluator.Sample sample(String provider, double lat, double lon, float accuracy, long timestamp) {
        GpsPointEvaluator.Sample sample = new GpsPointEvaluator.Sample();
        sample.provider = provider;
        sample.latitude = lat;
        sample.longitude = lon;
        sample.accuracy = accuracy;
        sample.timestampMs = timestamp;
        sample.mockLocation = false;
        return sample;
    }

    private static boolean close(double a, double b) {
        return Math.abs(a - b) < 0.001d;
    }

    private static void check(boolean condition, String name) {
        if (!condition) throw new AssertionError(name);
    }
}
