package com.e23running.app.kimi.preview.run;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import org.junit.Before;
import org.junit.Test;

public class GpsPointEvaluatorTest {
    private GpsPointEvaluator evaluator;

    @Before
    public void setUp() {
        evaluator = new GpsPointEvaluator();
    }

    @Test
    public void firstGpsFixIsBaselineOnly() {
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);

        assertTrue(result.accepted);
        assertTrue(result.firstFix);
        assertEquals(0d, result.distanceDeltaM, 0.001d);
        assertEquals(0d, result.calculatedSpeedMps, 0.001d);
    }

    @Test
    public void secondGoodGpsPointAddsDistance() {
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600009, 113.970000, 8f, 2_000), true);

        assertTrue(result.accepted);
        assertFalse(result.firstFix);
        assertTrue(result.distanceDeltaM > 0.5d);
        assertTrue(result.calculatedSpeedMps > 0d);
    }

    @Test
    public void goodPreflightPointUpdatesBaselineWithoutDistance() {
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), false);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600009, 113.970000, 8f, 2_000), false);

        assertTrue(result.accepted);
        assertEquals(0d, result.distanceDeltaM, 0.001d);
        assertTrue(evaluator.hasFirstFix());
    }

    @Test
    public void poorAccuracyIsRejected() {
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600000, 113.970000, 101f, 1_000), true);

        assertFalse(result.accepted);
        assertEquals("first_fix_accuracy", result.rejectionReason);
        assertFalse(evaluator.hasFirstFix());
    }

    @Test
    public void networkProviderNeverAddsOfficialDistance() {
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("network", 22.600000, 113.970000, 10f, 1_000), true);

        assertFalse(result.accepted);
        assertEquals("network_assist_only", result.rejectionReason);
        assertEquals(0d, result.distanceDeltaM, 0.001d);
    }

    @Test
    public void passiveProviderNeverAddsOfficialDistance() {
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("passive", 22.600000, 113.970000, 10f, 1_000), true);

        assertFalse(result.accepted);
        assertEquals("passive_provider", result.rejectionReason);
    }

    @Test
    public void duplicatePointIsRejected() {
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600001, 113.970000, 8f, 2_000), true);

        assertFalse(result.accepted);
        assertEquals("duplicate_point", result.rejectionReason);
    }

    @Test
    public void nonIncreasingTimestampIsRejected() {
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 2_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600009, 113.970000, 8f, 2_000), true);

        assertFalse(result.accepted);
        assertEquals("time_not_increasing", result.rejectionReason);
    }

    @Test
    public void mockLocationIsRejected() {
        GpsPointEvaluator.Sample sample = sample("gps", 22.600000, 113.970000, 8f, 1_000);
        sample.mockLocation = true;

        GpsPointEvaluator.Result result = evaluator.evaluate(sample, true);

        assertFalse(result.accepted);
        assertEquals("mock_location", result.rejectionReason);
    }

    @Test
    public void speedBetweenEightAndTwelveIsAcceptedWithRiskFlag() {
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600090, 113.970000, 8f, 2_000), true);

        assertTrue(result.accepted);
        assertEquals("suspicious_speed", result.riskFlag);
        assertTrue(result.calculatedSpeedMps > 8d);
        assertTrue(result.calculatedSpeedMps <= 12d);
    }

    @Test
    public void speedOverTwelveIsRejected() {
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        GpsPointEvaluator.Result result = evaluator.evaluate(sample("gps", 22.600180, 113.970000, 8f, 2_000), true);

        assertFalse(result.accepted);
        assertEquals("speed_too_high", result.rejectionReason);
        assertTrue(result.calculatedSpeedMps > 12d);
        assertEquals(0d, result.distanceDeltaM, 0.001d);
    }

    @Test
    public void resetClearsTheFirstFix() {
        evaluator.evaluate(sample("gps", 22.600000, 113.970000, 8f, 1_000), true);
        evaluator.reset();

        assertFalse(evaluator.hasFirstFix());
        assertNull(evaluator.getBaseline());
    }

    private static GpsPointEvaluator.Sample sample(
        String provider,
        double latitude,
        double longitude,
        float accuracy,
        long timestampMs
    ) {
        GpsPointEvaluator.Sample sample = new GpsPointEvaluator.Sample();
        sample.provider = provider;
        sample.latitude = latitude;
        sample.longitude = longitude;
        sample.accuracy = accuracy;
        sample.timestampMs = timestampMs;
        sample.mockLocation = false;
        return sample;
    }
}
