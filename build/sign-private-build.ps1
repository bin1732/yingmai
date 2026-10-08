# 可选：为自用构建生成自签名并签名（仅适合本人/本机使用）
# 用法：在项目根目录运行  powershell -ExecutionPolicy Bypass -File build\sign-private-build.ps1 -Exe "release\某安装包.exe"
# 说明：
#   1. 自签名证书只在导入到“受信任的根证书颁发机构/受信任的发布者”的电脑上受信任；
#      直接分发给他人时，对方电脑仍会提示“未知发布者”，因此自签名不适合公开分发。
#   2. 面向开源项目的免费“可信”签名可申请 SignPath Foundation（需公开源码仓库并通过审核，
#      在其流水线中构建），审核通过后签名可被 Windows 信任。
#   3. 也可购买标准的代码签名证书；本项目不强制要求签名。
param(
  [Parameter(Mandatory = $true)] [string] $Exe,
  [string] $Subject = "灵感引擎工坊 bin1732"
)

if (-not (Test-Path $Exe)) { Write-Error "找不到文件：$Exe"; exit 1 }

$cert = Get-ChildItem "Cert:\CurrentUser\My" | Where-Object { $_.Subject -eq "CN=$Subject" } | Select-Object -First 1
if (-not $cert) {
  $cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$Subject" `
    -CertStoreLocation "Cert:\CurrentUser\My" -KeyUsage DigitalSignature -KeyExportPolicy Exportable
  Write-Host "已创建自签名证书（仅本机受信任）：$($cert.Thumbprint)"
}

$result = Set-AuthenticodeSignature -FilePath $Exe -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
Write-Host "签名结果：$($result.Status)"
Get-AuthenticodeSignature $Exe | Format-List Status, SignerCertificate
