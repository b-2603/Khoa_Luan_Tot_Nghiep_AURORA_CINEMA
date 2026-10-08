# AURORA CINEMA - Dừng toàn bộ hệ thống
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         AURORA CINEMA - DUNG TOAN BO HE THONG          " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ports = @(3000, 5174, 5175, 5176)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($p in $pids) {
            try {
                Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                Write-Host "Da giai phong cong $port (PID: $p)" -ForegroundColor Green
            } catch {}
        }
    } else {
        Write-Host "Cong $port: Khong co tien trinh chay" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Da dung toan bo cac phan he Frontend thanh cong!" -ForegroundColor Yellow
Start-Sleep -Seconds 2
