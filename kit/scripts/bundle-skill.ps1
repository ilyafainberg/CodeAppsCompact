Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$kitRoot = Split-Path -Parent $PSScriptRoot
$skillRoot = Join-Path (Split-Path -Parent $kitRoot) 'plugins' 'codeappscompact' 'skills' 'codeappscompact'
$pkg = Get-Content -LiteralPath (Join-Path $kitRoot 'package.json') -Raw | ConvertFrom-Json -AsHashtable
$manifestPath = Join-Path $skillRoot 'references' 'kit.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json -AsHashtable
$filename = "$($pkg.name)-$($pkg.version).zip"
$archive = "assets/$filename"
$assets = Join-Path $skillRoot 'assets'

if ($pkg.name -ne 'codeappscompact' -or $pkg.private -ne $true) {
    throw 'Expected the private codeappscompact package; npm publication must remain disabled.'
}
if ($manifest.name -ne $pkg.name -or $manifest.version -ne $pkg.version -or $manifest.archive -ne $archive -or
    $manifest.compatibleInstalledVersions -notcontains $pkg.version) {
    throw 'Update kit.json identity, local ZIP path, and reviewed compatibility before bundling.'
}
[void][IO.Directory]::CreateDirectory($assets)
if (Get-ChildItem -LiteralPath $assets -Force | Where-Object Name -ne $filename) {
    throw 'Remove the previous tracked kit archive explicitly; assets must contain only the current kit.'
}

$consumerPackage = [ordered]@{}
foreach ($key in @('name', 'version', 'description', 'license', 'type', 'main', 'types', 'exports',
    'files', 'sideEffects', 'engines', 'peerDependencies', 'private')) {
    if (-not $pkg.ContainsKey($key)) { throw "Missing consumer package metadata: $key" }
    $consumerPackage[$key] = $pkg[$key]
}
$consumerJson = ($consumerPackage | ConvertTo-Json -Depth 10).Replace("`r`n", "`n") + "`n"

$files = @(
    'API.txt', 'LICENSE', 'README.md', 'dist/index.d.ts', 'dist/index.js',
    'examples/App.tsx', 'examples/main.tsx', 'examples/service.ts', 'examples/style.css', 'package.json'
)
$memory = [IO.MemoryStream]::new()
try {
    $zip = [IO.Compression.ZipArchive]::new($memory, [IO.Compression.ZipArchiveMode]::Create, $true)
    try {
        foreach ($path in $files) {
            $source = Get-Item -LiteralPath (Join-Path $kitRoot $path)
            if ($source.PSIsContainer -or ($source.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
                throw "Expected a regular consumer file: $path"
            }
            $bytes = if ($path -eq 'package.json') {
                [Text.Encoding]::UTF8.GetBytes($consumerJson)
            } else {
                [IO.File]::ReadAllBytes($source.FullName)
            }
            $entry = $zip.CreateEntry("package/$path", [IO.Compression.CompressionLevel]::Optimal)
            $entry.LastWriteTime = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
            $output = $entry.Open()
            try { $output.Write($bytes, 0, $bytes.Length) }
            finally { $output.Dispose() }
        }
    }
    finally { $zip.Dispose() }
    $bundle = $memory.ToArray()
}
finally { $memory.Dispose() }

$destination = Join-Path $assets $filename
[IO.File]::WriteAllBytes($destination, $bundle)
[IO.File]::Copy((Join-Path $kitRoot 'API.txt'), (Join-Path $skillRoot 'references' 'API.txt'), $true)
$manifest.sha256 = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
$json = ($manifest | ConvertTo-Json -Depth 10).Replace("`r`n", "`n")
[IO.File]::WriteAllText($manifestPath, $json + "`n")
Write-Output "Bundled $filename ($($bundle.Length) bytes); synchronized references\API.txt and kit.json SHA-256."
