param(
  [Parameter(Mandatory = $true)][string]$AdbPath,
  [Parameter(Mandatory = $true)][string]$OutputDirectory,
  [string]$ApplicationId = 'com.e23running.app.preview',
  [string]$ActivityClass = 'com.e23running.app.MainActivity',
  [ValidateRange(1, 5)][int]$Rounds = 5
)

$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$devices = & $AdbPath devices | Select-Object -Skip 1 | Where-Object { $_ -match '\tdevice$' }
if (@($devices).Count -ne 1) {
  throw "Expected exactly one authorized Android device; found $(@($devices).Count)."
}

$serial = (($devices | Select-Object -First 1) -split '\s+')[0]
$model = (& $AdbPath -s $serial shell getprop ro.product.model).Trim()
$apiLevel = (& $AdbPath -s $serial shell getprop ro.build.version.sdk).Trim()
$abi = (& $AdbPath -s $serial shell getprop ro.product.cpu.abi).Trim()
$versionName = ((& $AdbPath -s $serial shell dumpsys package $ApplicationId) |
  Select-String -Pattern 'versionName=' |
  Select-Object -First 1).Line.Trim()
$component = "$ApplicationId/$ActivityClass"
$roundResults = @()

for ($round = 1; $round -le $Rounds; $round += 1) {
  $prefix = Join-Path $OutputDirectory ("round-{0:D2}" -f $round)
  & $AdbPath -s $serial logcat -c
  & $AdbPath -s $serial shell am force-stop $ApplicationId
  $launch = & $AdbPath -s $serial shell am start -W -n $component 2>&1
  $alive = $false
  for ($attempt = 1; $attempt -le 30; $attempt += 1) {
    Start-Sleep -Milliseconds 500
    $appProcess = (& $AdbPath -s $serial shell pidof $ApplicationId 2>$null).Trim()
    if ($appProcess) { $alive = $true; break }
  }
  Start-Sleep -Seconds 2
  $log = & $AdbPath -s $serial logcat -d -v threadtime
  $logText = $log -join "`n"
  $fatalDetected = $logText -match "(?s)FATAL EXCEPTION.*Process:\s*$([regex]::Escape($ApplicationId))"
  $nativeReady = $logText -match 'E23Startup.*NATIVE_READY'
  $webReady = $logText -match 'E23_STARTUP.*WEB_READY'
  $persistenceMatch = [regex]::Matches($logText, 'PERSISTENCE_READY\s+(\d+)')
  $persistenceReady = if ($persistenceMatch.Count -gt 0) {
    [int]$persistenceMatch[$persistenceMatch.Count - 1].Groups[1].Value
  } else { 0 }

  $launch | Set-Content -LiteralPath "$prefix-launch.txt" -Encoding UTF8
  $log | Set-Content -LiteralPath "$prefix-logcat.txt" -Encoding UTF8
  $result = [ordered]@{
    round = $round
    serial = $serial
    model = $model
    apiLevel = $apiLevel
    abi = $abi
    versionName = $versionName
    applicationId = $ApplicationId
    activityClass = $ActivityClass
    processAlive = $alive
    fatalDetected = $fatalDetected
    nativeReady = $nativeReady
    webReady = $webReady
    persistenceReady = $persistenceReady
    capturedAt = (Get-Date).ToString('o')
  }
  $result | ConvertTo-Json | Set-Content -LiteralPath "$prefix-result.json" -Encoding UTF8
  $roundResults += [pscustomobject]$result
}

$resumeResults = @()
for ($cycle = 1; $cycle -le 3; $cycle += 1) {
  & $AdbPath -s $serial shell input keyevent KEYCODE_HOME
  Start-Sleep -Seconds 1
  $resume = & $AdbPath -s $serial shell am start -W -n $component 2>&1
  Start-Sleep -Seconds 1
  $alive = [bool]((& $AdbPath -s $serial shell pidof $ApplicationId 2>$null).Trim())
  $resume | Set-Content -LiteralPath (Join-Path $OutputDirectory ("resume-{0:D2}.txt" -f $cycle)) -Encoding UTF8
  $resumeResults += [pscustomobject]@{ cycle = $cycle; processAlive = $alive }
}

& $AdbPath -s $serial shell pm revoke $ApplicationId android.permission.ACCESS_FINE_LOCATION 2>$null
& $AdbPath -s $serial shell pm revoke $ApplicationId android.permission.ACCESS_COARSE_LOCATION 2>$null
& $AdbPath -s $serial logcat -c
& $AdbPath -s $serial shell am force-stop $ApplicationId
$permissionLaunch = & $AdbPath -s $serial shell am start -W -n $component 2>&1
Start-Sleep -Seconds 3
$permissionLog = & $AdbPath -s $serial logcat -d -v threadtime
$permissionText = $permissionLog -join "`n"
$permissionAlive = [bool]((& $AdbPath -s $serial shell pidof $ApplicationId 2>$null).Trim())
$permissionFatal = $permissionText -match "(?s)FATAL EXCEPTION.*Process:\s*$([regex]::Escape($ApplicationId))"
$permissionLaunch | Set-Content -LiteralPath (Join-Path $OutputDirectory 'permission-denied-launch.txt') -Encoding UTF8
$permissionLog | Set-Content -LiteralPath (Join-Path $OutputDirectory 'permission-denied-logcat.txt') -Encoding UTF8

$acceptance = [ordered]@{
  device = [ordered]@{ serial = $serial; model = $model; apiLevel = $apiLevel; abi = $abi }
  coldStartsPassed = @($roundResults | Where-Object {
    $_.processAlive -and -not $_.fatalDetected -and $_.nativeReady -and $_.webReady
  }).Count
  coldStartsRequired = $Rounds
  resumeCyclesPassed = @($resumeResults | Where-Object processAlive).Count
  resumeCyclesRequired = 3
  permissionDeniedPassed = $permissionAlive -and -not $permissionFatal
  persistencePassed = ($roundResults[-1].persistenceReady -gt $roundResults[0].persistenceReady)
  generatedAt = (Get-Date).ToString('o')
}
$acceptance | ConvertTo-Json -Depth 4 |
  Set-Content -LiteralPath (Join-Path $OutputDirectory 'physical-acceptance.json') -Encoding UTF8

if (
  $acceptance.coldStartsPassed -ne $acceptance.coldStartsRequired -or
  $acceptance.resumeCyclesPassed -ne $acceptance.resumeCyclesRequired -or
  -not $acceptance.permissionDeniedPassed -or
  -not $acceptance.persistencePassed
) {
  throw 'Physical-device startup acceptance failed. Evidence was preserved.'
}

