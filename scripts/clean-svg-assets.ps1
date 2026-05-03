$files = @(
  'public/assets/modules/MCB/MCB 1P.svg',
  'public/assets/modules/MCB/MCB 2P.svg',
  'public/assets/modules/MCB/MCB 3p.svg',
  'public/assets/modules/RCD/RCD 2P.svg',
  'public/assets/modules/RCD/RCD 4P.svg',
  'public/assets/modules/SPD/SPD.svg',
  'public/assets/modules/SPD/SPD 1p.svg',
  'public/assets/modules/FR/FR.svg',
  'public/assets/modules/FR/fr 1P.svg'
)

foreach ($relativePath in $files) {
  $repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
  $path = Join-Path $repoRoot $relativePath
  $content = Get-Content -LiteralPath $path -Raw

  $content = [regex]::Replace($content, '^\s*<\?xml[^>]*\?>', '')
  $content = [regex]::Replace($content, '\s*<!DOCTYPE[^>]*?(\[[\s\S]*?\])?>', '')
  $content = $content -replace '\s+xmlns:serif="[^"]*"', ''
  $content = $content -replace '\s+xml:space="preserve"', ''
  $content = [regex]::Replace($content, '\s+serif:[A-Za-z0-9_-]+="[^"]*"', '')
  $content = [regex]::Replace($content, '<metadata\b[^>]*>[\s\S]*?</metadata>', '')

  if ([System.IO.Path]::GetFileName($path) -eq 'MCB 1P.svg') {
    $onGroup = '<g transform="matrix(0.973322,0,0,1,-41.741121,-0)"><g transform="matrix(51.127002,0,0,51.127002,188.730758,539.67081)"></g><text x="112.04px" y="539.671px" style="font-family:''ArialMT'', ''Arial'', sans-serif;font-size:51.127px;">ON</text></g>'
    $content = $content.Replace($onGroup + $onGroup, $onGroup)
  }

  [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($false)))
}
