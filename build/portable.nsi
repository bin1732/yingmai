; 盈脉 · 电商工作台便携启动器（首次解包到程序旁固定目录，之后直接复用）· 灵感引擎工坊 · bin1732
CRCCheck off
WindowIcon Off
AutoCloseWindow True
RequestExecutionLevel user
SetCompressor zlib
BrandingText "灵感引擎工坊"

!include "FileFunc.nsh"
!include "WinMessages.nsh"

!define APPVER  "4.6.0"
!define PFOLDER "YingMai-Portable"
!define EXENAME "YingMai.exe"
!define BASEDIR "$EXEDIR\${PFOLDER}"
!define APPDIR  "$EXEDIR\${PFOLDER}\runtime"
!define MARKER  "$EXEDIR\${PFOLDER}\runtime\.portable-${APPVER}"
!define ARC     "E:\豆包工作区\盈脉（YingMai）测试区\build\app.7z"
!define SZ      "C:\Users\bingf\AppData\Local\electron-builder\Cache\7zip@1.0.0\7zip-win-x64-me3aj\bin\7za.exe"

Name "盈脉便携版"
OutFile "E:\豆包工作区\盈脉（YingMai）测试区\build\盈脉-便携版.exe"

Function .onInit
  ${GetParameters} $R9
  IfFileExists "${MARKER}" ready prep
  ready:
    System::Call 'kernel32::SetEnvironmentVariableW(w "PORTABLE_EXECUTABLE_DIR", w "${BASEDIR}")'
    ExecWait '"${APPDIR}\${EXENAME}" $R9' $R8
    SetErrorLevel $R8
    Quit
  prep:
FunctionEnd

Function .onGUIInit
  InitPluginsDir
  ; clean window title
  SendMessage $HWNDPARENT ${WM_SETTEXT} 0 "STR:盈脉便携版"
  ; center the window
  System::Call 'user32::GetSystemMetrics(i0)i.r6'
  System::Call 'user32::GetSystemMetrics(i1)i.r7'
  IntOp $8 $6 - 635
  IntOp $8 $8 / 2
  IntOp $9 $7 - 440
  IntOp $9 $9 / 2
  System::Call 'user32::SetWindowPos(p $HWNDPARENT, i-2, i r8, i r9, i635, i440, i0x0040)'
  BringToFront
FunctionEnd

Section
  SetCompress off
  SetOutPath "$PLUGINSDIR"
  File /oname=7za.exe "${SZ}"
  File /oname=app.7z "${ARC}"
  CreateDirectory "${APPDIR}"
  nsExec::Exec '"$PLUGINSDIR\7za.exe" x "$PLUGINSDIR\app.7z" -o"${APPDIR}" -y -bsp0 -bso0'
  Pop $R0
  StrCmp $R0 "0" extractOk extractFail
  extractFail:
    MessageBox MB_OK|MB_ICONEXCLAMATION "程序文件准备失败，请重新下载便携版。$\n错误代码：$R0"
    Quit
  extractOk:
  FileOpen $5 "${MARKER}" w
  FileWrite $5 ""
  FileClose $5
  System::Call 'kernel32::SetEnvironmentVariableW(w "PORTABLE_EXECUTABLE_DIR", w "${BASEDIR}")'
  ExecWait '"${APPDIR}\${EXENAME}" $R9' $R8
  SetErrorLevel $R8
SectionEnd
