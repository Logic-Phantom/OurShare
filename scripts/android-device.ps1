# Drives an Android phone over adb for 우리몫 device QA. See docs/TESTING.md for the test plan.
# Usage: powershell -File scripts/android-device.ps1 <command> [arg] [arg2]
#   install APK        install (or replace) an APK, e.g. one downloaded from the EAS build page
#   launch             open the app
#   shot NAME          screenshot to .device/NAME.png (git-ignored; use the sample names, never real family data)
#   text               list visible texts and their bounds
#   tap TEXT           tap the element whose text or description contains TEXT
#   tapxy X Y          tap a point
#   back | swipeup | swipedown | top
#   perms              requested and granted permissions of the installed app
#   alarms             notifications the OS currently holds for the app (scheduled reminders)
#   fontscale N        set system font size (1.0 normal, 1.3, 2.0 max). Changes the phone's setting: set 1.0 when done
#   reboot             restart the phone (to check reminders survive a reboot)
# Requires adb (winget install Google.PlatformTools) and a USB-debugging-authorized device.
param([string]$cmd, [string]$arg = '', [string]$arg2 = '')
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
$PKG = 'app.ourshare.mobile'
$D = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\.device'))
New-Item -ItemType Directory -Force $D | Out-Null

# Foldables report several displays; default to the first one SurfaceFlinger lists (main screen).
$DISP = $env:OURSHARE_DISPLAY
if (-not $DISP) {
  $first = adb shell dumpsys SurfaceFlinger --display-id | Select-Object -First 1
  if ($first -match '^Display (\d+)') { $DISP = $Matches[1] }
}

function Shot($name) {
  if ($DISP) { adb shell screencap -d $DISP -p /sdcard/os.png | Out-Null } else { adb shell screencap -p /sdcard/os.png | Out-Null }
  adb pull /sdcard/os.png "$D\$name-full.png" | Out-Null
  adb shell rm /sdcard/os.png | Out-Null
  Add-Type -AssemblyName System.Drawing
  $img = [System.Drawing.Image]::FromFile("$D\$name-full.png")
  $bmp = New-Object System.Drawing.Bitmap $img, ([int]($img.Width / 3)), ([int]($img.Height / 3))
  $img.Dispose()
  $bmp.Save("$D\$name.png"); $bmp.Dispose()
  "$D\$name.png"
}

function Dump() {
  adb shell uiautomator dump /sdcard/ui.xml | Out-Null
  adb pull /sdcard/ui.xml "$D\ui.xml" | Out-Null
  [xml]([IO.File]::ReadAllText("$D\ui.xml", [Text.Encoding]::UTF8))
}

function Find($text) {
  $x = Dump
  $nodes = $x.SelectNodes('//node') | Where-Object { $_.text -like "*$text*" -or $_.'content-desc' -like "*$text*" }
  $clickable = $nodes | Where-Object { $_.clickable -eq 'true' } | Select-Object -First 1
  if ($clickable) { $clickable } else { $nodes | Select-Object -First 1 }
}

function TapNode($n) {
  if (-not $n) { 'NOT FOUND'; return }
  $m = [regex]::Match($n.bounds, '\[(\d+),(\d+)\]\[(\d+),(\d+)\]')
  $cx = ([int]$m.Groups[1].Value + [int]$m.Groups[3].Value) / 2
  $cy = ([int]$m.Groups[2].Value + [int]$m.Groups[4].Value) / 2
  adb shell input tap $cx $cy
  "tapped '$($n.text)$($n.'content-desc')' at $cx,$cy"
}

switch ($cmd) {
  'install' { adb install -r $arg }
  'launch' { adb shell monkey -p $PKG -c android.intent.category.LAUNCHER 1 | Out-Null; "launched $PKG" }
  'shot' { Shot $arg }
  'tap' { TapNode (Find $arg) }
  'tapxy' { adb shell input tap $arg $arg2; "tapped $arg,$arg2" }
  'text' {
    $x = Dump
    $x.SelectNodes('//node') | ForEach-Object { $t = $_.text; if (-not $t) { $t = $_.'content-desc' }; if ($t) { "$t  [$($_.bounds)]" } }
  }
  'back' { adb shell input keyevent 4 }
  'swipeup' { adb shell input swipe 540 1900 540 700 400 }
  'swipedown' { adb shell input swipe 540 700 540 1900 400 }
  'top' { adb shell dumpsys activity activities | Select-String -Pattern 'topResumedActivity' | ForEach-Object { $_.Line.Trim() } }
  'perms' { adb shell dumpsys package $PKG | Select-String -Pattern 'permission' | ForEach-Object { $_.Line.Trim() } }
  'alarms' { adb shell dumpsys alarm | Select-String -Pattern $PKG -Context 0, 2 | ForEach-Object { $_.ToString().Trim() } }
  'fontscale' { adb shell settings put system font_scale $arg; "font_scale=$arg (set 1.0 when done)" }
  'reboot' { adb reboot; 'rebooting; wait until the phone is unlocked, then run launch' }
  default { 'usage: install APK | launch | shot NAME | text | tap TEXT | tapxy X Y | back | swipeup | swipedown | top | perms | alarms | fontscale N | reboot' }
}
