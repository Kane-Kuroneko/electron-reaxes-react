;if (PID := ProcessExist("Kingdom Rush Alliance.exe")){
;
;}else {
;}


;;if(WinWaitActive "ahk_exe 'Kingdom Rush Alliance.exe'")
;if(WinWaitActive("ahk_exe Notepad.exe",,)){
;    WinMinimize  ; 使用由 WinWaitActive 找到的窗口.
;}
NotepadProcess := "ahk_exe Notepad.exe"
KingdomRushProcess := "ahk_exe Kingdom Rush Alliance.exe"

#HotIf WinActive(KingdomRushProcess)



$F1::{
    Send("4")
}
$F2::{
    Send("5")
}
