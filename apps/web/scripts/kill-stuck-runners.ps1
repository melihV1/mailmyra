# Takili kalan CLI kosucularini sonlandirir (RDP'siz temizlik, 2026-08-21).
#
# YALNIZ komut satirinda run-reports.ts / cleanup-orphans.ts gecen node.exe
# sureclerini hedefler — uygulamanin kendi node surecine (iisnode/next)
# DOKUNMAZ. Bu betigi calistiran npm/powershell zincirinin komut satiri da
# bu kaliba uymaz, kendini olduremez.
#
# Kullanim (Plesk > Node.js > Komut dosyasi calistir; kutu basa npm ekler):
#   exec -- powershell -ExecutionPolicy Bypass -File scripts/kill-stuck-runners.ps1
$targets = Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -match 'run-reports\.ts|cleanup-orphans\.ts' }
if (-not $targets) {
  Write-Output 'Takili kosucu yok.'
  exit 0
}
foreach ($p in $targets) {
  Write-Output ("Sonlandiriliyor: PID {0}" -f $p.ProcessId)
  Stop-Process -Id $p.ProcessId -Force
}
Write-Output ("{0} surec sonlandirildi." -f @($targets).Count)
