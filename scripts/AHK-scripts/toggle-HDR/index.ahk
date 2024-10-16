#include "../Libs/jsongo_AHKv2/jsongo.v2.ahk"

hdr_enabled := false

toggleHDR(status := !hdr_enabled){
	Send("#!b")
}


;toggleHDR()


; 读取 HDR 状态
try {
    HDRStatus := RegRead("HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\VideoSettings", "EnableHDR")
    ; 检查当前 HDR 状态并显示消息
    if (HDRStatus = 1) {
        MsgBox("HDR is currently ON")
    } else {
        MsgBox("HDR is currently OFF")
    }
} catch Error as e {
    MsgBox("Error: " e.message)
}
