Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$kitRoot = Split-Path -Parent $PSScriptRoot
$skillRoot = Join-Path (Split-Path -Parent $kitRoot) 'plugins' 'codeappscompact' 'skills' 'codeappscompact'
$pkg = Get-Content -LiteralPath (Join-Path $kitRoot 'package.json') -Raw | ConvertFrom-Json -AsHashtable
$assets = Join-Path $skillRoot 'assets'

if ($pkg.name -ne 'codeappscompact' -or $pkg.private -ne $true) {
    throw 'Expected the private codeappscompact package; npm publication must remain disabled.'
}

$consumerPackage = [ordered]@{}
foreach ($key in @('name', 'version', 'description', 'license', 'type', 'main', 'types', 'exports',
    'files', 'sideEffects', 'engines', 'peerDependencies', 'private')) {
    if (-not $pkg.ContainsKey($key)) { throw "Missing consumer package metadata: $key" }
    $consumerPackage[$key] = $pkg[$key]
}
$consumerJson = ($consumerPackage | ConvertTo-Json -Depth 10).Replace("`r`n", "`n") + "`n"
$files = @(
    'API.txt', 'LICENSE', 'README.md', 'package.json',
    (Join-Path 'dist' 'index.d.ts'), (Join-Path 'dist' 'index.js'),
    (Join-Path 'examples' 'App.tsx'), (Join-Path 'examples' 'main.tsx'),
    (Join-Path 'examples' 'service.ts'), (Join-Path 'examples' 'style.css')
)

if (Test-Path -LiteralPath $assets) {
    $assetRoot = Get-Item -LiteralPath $assets -Force
    if (-not $assetRoot.PSIsContainer -or ($assetRoot.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'Expected assets to be a regular directory.'
    }
    foreach ($item in Get-ChildItem -LiteralPath $assets -Recurse -Force) {
        $path = [IO.Path]::GetRelativePath($assets, $item.FullName)
        $allowed = if ($item.PSIsContainer) { @('dist', 'examples') } else { $files }
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -or $allowed -cnotcontains $path) {
            throw "Unexpected bundled asset; inspect and remove it explicitly: $path"
        }
    }
}
foreach ($path in $files) {
    $source = Get-Item -LiteralPath (Join-Path $kitRoot $path)
    if ($source.PSIsContainer -or ($source.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw "Expected a regular consumer file: $path"
    }
}

foreach ($path in $files) {
    $destination = Join-Path $assets $path
    [void][IO.Directory]::CreateDirectory((Split-Path -Parent $destination))
    if ($path -eq 'package.json') {
        [IO.File]::WriteAllText($destination, $consumerJson)
    } else {
        [IO.File]::Copy((Join-Path $kitRoot $path), $destination, $true)
    }
}
Write-Output "Bundled $($pkg.name) $($pkg.version) as $($files.Count) plain files in assets."
