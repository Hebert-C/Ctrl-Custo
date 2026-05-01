param(
    [Parameter(Mandatory)][string]$PackageName,
    [string]$Root = "$PSScriptRoot\..\node_modules",
    [int]$Depth = 2
)

Get-ChildItem $Root -Filter "package.json" -Recurse -Depth $Depth -ErrorAction SilentlyContinue | ForEach-Object {
    $j = Get-Content $_.FullName -Raw | ConvertFrom-Json -ErrorAction SilentlyContinue
    if (-not $j) { return }
    $deps = @{}
    if ($j.dependencies)    { $j.dependencies.PSObject.Properties    | ForEach-Object { $deps[$_.Name] = $_.Value } }
    if ($j.devDependencies) { $j.devDependencies.PSObject.Properties  | ForEach-Object { $deps[$_.Name] = $_.Value } }
    if ($deps.ContainsKey($PackageName)) {
        "$($j.name)@$($j.version) -> $PackageName : $($deps[$PackageName])"
    }
} | Sort-Object
