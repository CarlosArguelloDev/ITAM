param(
    [string]$templatePath = "templates/etiqueta.lbx",
    [string]$printerName = "Brother PT-D410",
    [string]$brandModel = "DELL LATITUDE 5440",
    [string]$assetTag = "IT-LAP-0010",
    [string]$barcodeValue = "",
    [string]$batchFile = ""
)

if (-not $barcodeValue -or $barcodeValue.Trim() -eq "") {
    $barcodeValue = $assetTag
}

try {
    $doc = New-Object -ComObject "bpac.Document"
} catch {
    Write-Error "Brother b-PAC Client no está instalado en este equipo."
    exit 2
}

$resolved = (Resolve-Path $templatePath -ErrorAction SilentlyContinue)
if (-not $resolved -or -not (Test-Path $resolved.Path)) {
    Write-Error "No se encontró la plantilla en: $templatePath"
    exit 3
}

$opened = $doc.Open($resolved.Path)
if (-not $opened) {
    Write-Error "b-PAC no pudo abrir el archivo de plantilla: $($resolved.Path)"
    exit 4
}

function Set-LabelFields {
    param($doc, [string]$bm, [string]$tag, [string]$bc)
    if (-not $bc -or $bc.Trim() -eq "") { $bc = $tag }

    $barcodeObj = $doc.GetObject("Barcode")
    if ($barcodeObj) { $barcodeObj.Text = $bc }

    $brandObj = $doc.GetObject("txtBrandModel")
    if (-not $brandObj) { $brandObj = $doc.GetObject("txtModelBrand") }
    if ($brandObj) { $brandObj.Text = $bm.ToUpper() }

    $tagObj = $doc.GetObject("txtAssetTag")
    if ($tagObj) { $tagObj.Text = $tag }
}

try {
    if ($printerName) {
        [void]$doc.SetPrinter($printerName, $false)
    }

    if ($batchFile -and (Test-Path $batchFile)) {
        $items = Get-Content $batchFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($items -isnot [System.Array]) { $items = @($items) }

        # Imprimir todo el lote en un solo trabajo continuo (sin pausa ni espacio extra entre etiquetas)
        [void]$doc.StartPrint("ITAM-BATCH", 0)
        foreach ($item in $items) {
            Set-LabelFields -doc $doc -bm $item.brandModel -tag $item.assetTag -bc $item.barcodeValue
            [void]$doc.PrintOut(1, 0)
        }
        [void]$doc.EndPrint()

        Write-Host "PRINT_SUCCESS: Lote de $($items.Count) etiquetas enviado en un solo trabajo a $printerName"
        exit 0
    } else {
        Set-LabelFields -doc $doc -bm $brandModel -tag $assetTag -bc $barcodeValue

        # Imprimir individual
        [void]$doc.StartPrint("ITAM-$assetTag", 0)
        [void]$doc.PrintOut(1, 0)
        [void]$doc.EndPrint()

        Write-Host "PRINT_SUCCESS: Etiqueta de $assetTag enviada a $printerName"
        exit 0
    }
} catch {
    Write-Error "Error de impresión: $($_.Exception.Message)"
    exit 5
} finally {
    [void]$doc.Close()
}
