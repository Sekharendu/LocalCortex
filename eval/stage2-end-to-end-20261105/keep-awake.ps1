$ErrorActionPreference = 'Stop'
$taskRoot = Join-Path (Get-Location) 'eval/stage2-end-to-end-20261105'
Add-Type @'
using System.Runtime.InteropServices;
public static class Stage2ExecutionState {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint flags);
}
'@
try {
    while ($true) {
        $requestState = [Stage2ExecutionState]::SetThreadExecutionState([uint32]2147483649)
        if ($requestState -eq 0) { throw 'Unable to request temporary system-awake state' }
        $progressPath = Join-Path $taskRoot 'progress.json'
        if (Test-Path -LiteralPath $progressPath) {
            $progress = Get-Content -LiteralPath $progressPath -Raw | ConvertFrom-Json
            if ($progress.successfulCalls -ge 558) { break }
        }
        $supervisor = Get-Content -LiteralPath (Join-Path $taskRoot 'background-process.json') -Raw | ConvertFrom-Json
        if (-not (Get-Process -Id $supervisor.pid -ErrorAction SilentlyContinue)) { break }
        Start-Sleep -Seconds 30
    }
} finally {
    [void][Stage2ExecutionState]::SetThreadExecutionState([uint32]2147483648)
}
