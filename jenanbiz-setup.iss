#define MyAppName "جنان بيز"
#define MyAppNameEn "JananBiz"
#define MyAppVersion "2.0"
#define MyAppPublisher "Jenan Biz"
#define MyAppURL "http://localhost:5000"
#define MyInstallDir "C:\JananBiz"

[Setup]
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={#MyInstallDir}
DefaultGroupName={#MyAppName}
OutputDir=.
OutputBaseFilename=JananBiz-Setup-v2
SetupIconFile=logo.ico
UninstallDisplayIcon={app}\logo.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
DisableProgramGroupPage=yes
ShowLanguageDialog=no
LanguageDetectionMethod=none
CloseApplications=yes
CloseApplicationsFilter=*node.exe
RestartApplications=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
; Node.js
Source: "node\node.exe"; DestDir: "{app}\node"; Flags: ignoreversion

; Backend
Source: "backend\server.js";        DestDir: "{app}\backend"; Flags: ignoreversion
Source: "backend\database.js";      DestDir: "{app}\backend"; Flags: ignoreversion
Source: "backend\package.json";     DestDir: "{app}\backend"; Flags: ignoreversion
Source: "backend\.env";             DestDir: "{app}\backend"; Flags: ignoreversion
Source: "backend\routes\*";         DestDir: "{app}\backend\routes";     Flags: ignoreversion recursesubdirs
Source: "backend\middleware\*";     DestDir: "{app}\backend\middleware"; Flags: ignoreversion recursesubdirs
Source: "backend\services\*";       DestDir: "{app}\backend\services";   Flags: ignoreversion recursesubdirs
Source: "backend\node_modules\*";   DestDir: "{app}\backend\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

; Frontend
Source: "frontend\dist\*"; DestDir: "{app}\frontend\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; Uploads folders (فارغة)
Source: "uploads\bank-statements\.gitkeep"; DestDir: "{app}\uploads\bank-statements"; Flags: ignoreversion skipifsourcedoesntexist
Source: "uploads\documents\.gitkeep";       DestDir: "{app}\uploads\documents";       Flags: ignoreversion skipifsourcedoesntexist
Source: "uploads\complete-files\.gitkeep";  DestDir: "{app}\uploads\complete-files";  Flags: ignoreversion skipifsourcedoesntexist
Source: "uploads\contracts\.gitkeep";       DestDir: "{app}\uploads\contracts";       Flags: ignoreversion skipifsourcedoesntexist

; ملفات التشغيل والأيقونة
Source: "start.bat";  DestDir: "{app}"; Flags: ignoreversion
Source: "stop.bat";   DestDir: "{app}"; Flags: ignoreversion
Source: "logo.ico";   DestDir: "{app}"; Flags: ignoreversion

[Dirs]
Name: "{app}\uploads\bank-statements"
Name: "{app}\uploads\documents"
Name: "{app}\uploads\complete-files"
Name: "{app}\uploads\contracts"

[Icons]
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\start.bat"; IconFilename: "{app}\logo.ico"; Tasks: desktopicon
Name: "{group}\{#MyAppName}";       Filename: "{app}\start.bat"; IconFilename: "{app}\logo.ico"
Name: "{group}\إيقاف {#MyAppName}"; Filename: "{app}\stop.bat";  IconFilename: "{app}\logo.ico"

[Run]
Filename: "{app}\start.bat"; Description: "تشغيل جنان بيز الآن"; Flags: postinstall nowait skipifsilent shellexec

[UninstallRun]
Filename: "taskkill"; Parameters: "/F /IM node.exe"; Flags: runhidden; RunOnceId: "KillNode"

[Code]
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  ResultCode: Integer;
begin
  Exec('taskkill.exe', '/F /IM node.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Exec('taskkill.exe', '/F /IM node.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Sleep(3000);
  Result := '';
end;
