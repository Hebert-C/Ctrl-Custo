param(
    [Parameter(Mandatory)][string]$PackageName,
    [Parameter(Mandatory)][string]$DepName,
    [string]$Root = "$PSScriptRoot\..\node_modules"
)

$pkgFile = Join-Path $Root $PackageName "package.json"
if (-not (Test-Path $pkgFile)) {
    Write-Output "Package not found: $pkgFile"
    exit 1
}

$j = Get-Content $pkgFile -Raw | ConvertFrom-Json

Write-Output "=== $($j.name)@$($j.version) ==="
Write-Output ""
Write-Output "dependencies:"
if ($j.dependencies) {
    $j.dependencies.PSObject.Properties | Where-Object { $_.Name -match $DepName } | ForEach-Object { "  $($_.Name): $($_.Value)" }
}
Write-Output "devDependencies:"
if ($j.devDependencies) {
    $j.devDependencies.PSObject.Properties | Where-Object { $_.Name -match $DepName } | ForEach-Object { "  $($_.Name): $($_.Value)" }
}
Write-Output "peerDependencies:"
if ($j.peerDependencies) {
    $j.peerDependencies.PSObject.Properties | Where-Object { $_.Name -match $DepName } | ForEach-Object { "  $($_.Name): $($_.Value)" }
}
