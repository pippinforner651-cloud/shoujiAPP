#!/usr/bin/env bash
set -euo pipefail

APK_PATH="${1:?APK path required}"
APPLICATION_ID="${2:-com.e23running.app.preview}"
ACTIVITY_CLASS="${3:-com.e23running.app.MainActivity}"
OUTPUT_DIR="${4:-android-smoke-logs}"
COMPONENT="${APPLICATION_ID}/${ACTIVITY_CLASS}"

mkdir -p "$OUTPUT_DIR"
adb install "$APK_PATH"

previous_persistence=0
for round in $(seq 1 5); do
  prefix="$OUTPUT_DIR/round-$(printf '%02d' "$round")"
  adb logcat -c
  adb shell am force-stop "$APPLICATION_ID"
  adb shell am start -W -n "$COMPONENT" | tee "${prefix}-launch.txt"

  ready=0
  for attempt in $(seq 1 30); do
    adb logcat -d -v threadtime > "${prefix}-logcat.txt"
    if adb shell pidof "$APPLICATION_ID" >/dev/null 2>&1 \
      && grep -q 'E23Startup.*NATIVE_READY' "${prefix}-logcat.txt" \
      && grep -q 'E23_STARTUP.*WEB_READY' "${prefix}-logcat.txt" \
      && grep -q 'PERSISTENCE_READY' "${prefix}-logcat.txt"; then
      ready=1
      break
    fi
    sleep 1
  done

  adb logcat -d -v threadtime > "${prefix}-logcat.txt"
  ! grep -q 'FATAL EXCEPTION' "${prefix}-logcat.txt"
  [[ "$ready" -eq 1 ]]
  current_persistence="$(grep 'PERSISTENCE_READY' "${prefix}-logcat.txt" | tail -n 1 | sed -E 's/.*PERSISTENCE_READY ([0-9]+).*/\1/')"
  [[ "$current_persistence" =~ ^[0-9]+$ ]]
  [[ "$current_persistence" -gt "$previous_persistence" ]]
  previous_persistence="$current_persistence"
  echo "round=$round status=PASS persistence=$current_persistence" | tee -a "$OUTPUT_DIR/android-smoke-summary.txt"
done

for cycle in $(seq 1 3); do
  adb shell input keyevent KEYCODE_HOME
  sleep 1
  adb shell am start -W -n "$COMPONENT" | tee "$OUTPUT_DIR/resume-${cycle}.txt"
  adb shell pidof "$APPLICATION_ID" >/dev/null
  echo "resume=$cycle status=PASS" | tee -a "$OUTPUT_DIR/android-smoke-summary.txt"
done

adb shell pm revoke "$APPLICATION_ID" android.permission.ACCESS_FINE_LOCATION || true
adb shell pm revoke "$APPLICATION_ID" android.permission.ACCESS_COARSE_LOCATION || true
adb logcat -c
adb shell am force-stop "$APPLICATION_ID"
adb shell am start -W -n "$COMPONENT" | tee "$OUTPUT_DIR/permission-denied-launch.txt"
sleep 3
adb logcat -d -v threadtime > "$OUTPUT_DIR/permission-denied-logcat.txt"
adb shell pidof "$APPLICATION_ID" >/dev/null
! grep -q 'FATAL EXCEPTION' "$OUTPUT_DIR/permission-denied-logcat.txt"
echo "permission_denied status=PASS" | tee -a "$OUTPUT_DIR/android-smoke-summary.txt"

