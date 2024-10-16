
NotepadProcess := "ahk_exe Notepad.exe"

#HotIf WinActive(NotepadProcess)


HkGui := Gui()
HkGui.Add("Text", "xm", "Prefix key:")
HkGui.Add("Edit", "yp x100 w100 vPrefix", "Space")
HkGui.Add("Text", "xm", "Suffix hotkey:")
HkGui.Add("Edit", "yp x100 w100 vSuffix", "f & j")
HkGui.Add("Button", "Default", "Register").OnEvent("Click", RegisterHotkey)
HkGui.OnEvent("Close", (*) => ExitApp())
HkGui.OnEvent("Escape", (*) => ExitApp())
HkGui.Show()
RegisterHotkey(*)
{
    Saved := HkGui.Submit(false)
    HotIf (*) => GetKeyState(Saved.Prefix)
    Hotkey Saved.Suffix, (ThisHotkey) => MsgBox(ThisHotkey)
}
