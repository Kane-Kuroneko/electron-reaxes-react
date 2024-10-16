
#include AHI-Lib\lib\AutoHotInterception.ahk
AHI := AutoHotInterception()
processList := [
;	"Dungeons2.exe",
;	"Warcraft III.exe",
	"Dungeons 4.exe",       ;it works
	"SC2_x64.exe",       ;it works
]


#hotif checkProcessActive()

RButtonPressingTime := false
G_RButtonDelay := A_Args.length ? A_Args[1] : 90

*RButton::
{
	global RButtonPressingTime
	SetMouseDelay(-1)
	Send("{Blind}{MButton DownR}")
	RButtonPressingTime := A_TickCount
}

*RButton up::
{
	SetMouseDelay(-1)
	Send("{Blind}{MButton Up}")
	rbtn_delay_ms := A_TickCount - RButtonPressingTime
	global RButtonPressingTime := false
	if(rbtn_delay_ms < G_RButtonDelay ){
		Click(,,"Right")
	}
}
#HotIf


#HotIf CheckSpecificate(["Dungeons3.exe","Dungeons3Bin.exe"])

*RButton::
{
	SetMouseDelay(-1)
	sleep(10)
	global RButtonPressingTime
	Send('{RButton Up}')
	Send("{Blind}{MButton DownR}")
	RButtonPressingTime := A_TickCount
}

*RButton up::
{
	SetMouseDelay(-1)
	Send("{Blind}{MButton Up}")
	rbtn_delay_ms := A_TickCount - RButtonPressingTime
	global RButtonPressingTime := false
}








checkProcessActive(){
	global processList
	for(pname in processList){
		if(WinActive("ahk_exe " pname)) {
			return true
		}
	}
	return false
}

CheckSpecificate(processList){
	for(pname in processList){
		if(WinActive("ahk_exe " pname)) {
			return true
		}
	}
	return false
}
