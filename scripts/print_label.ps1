param(
    [string]$templatePath = "templates/etiqueta.lbx",
    [string]$printerName = "Brother PT-D410",
    [string]$brandModel = "DELL LATITUDE 5440",
    [string]$assetTag = "IT-LAP-0010"
)

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

try {
    if ($printerName) {
        [void]$doc.SetPrinter($printerName, $false)
    }

    # 1. Objeto Código de Barras
    $barcodeObj = $doc.GetObject("Barcode")
    if ($barcodeObj) {
        $barcodeObj.Text = $assetTag
    }

    # 2. Objeto Marca y Modelo
    $brandObj = $doc.GetObject("txtBrandModel")
    if (-not $brandObj) {
        $brandObj = $doc.GetObject("txtModelBrand")
    }
    if ($brandObj) {
        $brandObj.Text = $brandModel.ToUpper()
    }

    # 3. Objeto Tag de Activo
    $tagObj = $doc.GetObject("txtAssetTag")
    if ($tagObj) {
        $tagObj.Text = $assetTag
    }

    # Imprimir
    [void]$doc.StartPrint("ITAM-$assetTag", 0)
    [void]$doc.PrintOut(1, 0)
    [void]$doc.EndPrint()

    Write-Host "PRINT_SUCCESS: Etiqueta de $assetTag enviada a $printerName"
    exit 0
} catch {
    Write-Error "Error de impresión: $($_.Exception.Message)"
    exit 5
} finally {
    [void]$doc.Close()
}
