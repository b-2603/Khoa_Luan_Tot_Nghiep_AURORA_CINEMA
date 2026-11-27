param(
    [Parameter(Mandatory = $true)][string]$SourcePath,
    [Parameter(Mandatory = $true)][string]$OutputDirectory
)

Add-Type -AssemblyName System.Drawing

$source = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $SourcePath))
try {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

    $parts = [ordered]@{
        # V2 is derived from one canonical 3D master, so every layer keeps identical
        # geometry, materials and studio lighting when recomposed in the browser.
        'head' = @(185, 0, 815, 575); 'body' = @(390, 545, 470, 350)
        'arm-left' = @(175, 575, 205, 205); 'arm-right' = @(885, 535, 270, 240)
        'foot-left' = @(245, 725, 205, 175); 'foot-right' = @(795, 725, 215, 180)
        'scarf-left' = @(20, 850, 370, 300); 'scarf-right' = @(865, 850, 389, 305)
        'eye-left' = @(365, 905, 245, 210); 'eye-right' = @(645, 905, 245, 210)
        'mouth-open' = @(385, 1090, 235, 164); 'mouth-smile' = @(660, 1115, 185, 139)
    }

    foreach ($part in $parts.GetEnumerator()) {
        $left = $part.Value[0]
        $top = $part.Value[1]
        $partWidth = $part.Value[2]
        $partHeight = $part.Value[3]
        $rectangle = New-Object System.Drawing.Rectangle(
            $left,
            $top,
            $partWidth,
            $partHeight
        )
        $bitmap = New-Object System.Drawing.Bitmap($partWidth, $partHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
            try {
                $graphics.Clear([System.Drawing.Color]::Transparent)
                $graphics.DrawImage($source, (New-Object System.Drawing.Rectangle(0, 0, $partWidth, $partHeight)), $rectangle, [System.Drawing.GraphicsUnit]::Pixel)
            } finally {
                $graphics.Dispose()
            }
            $outputPath = Join-Path $OutputDirectory ($part.Key + '.png')
            $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        } finally {
            $bitmap.Dispose()
        }
    }

    Copy-Item -LiteralPath $SourcePath -Destination (Join-Path $OutputDirectory 'aurora-rig-sheet.png') -Force
    Write-Output "Created $($parts.Count) rig layers from $($source.Width) x $($source.Height) in $OutputDirectory."
} finally {
    $source.Dispose()
}
