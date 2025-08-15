#include "std.ahk"
#include "jsongo.v2.ahk"
;;记事本测试进程
NotepadProcess := "ahk_exe Notepad.exe"
;;魔兽进程
WarcraftIIIProcess := "ahk_exe Warcraft III.exe"

;#HotIf WinActive(WarcraftIIIProcess)
;;总开关，控制着所有改键是否生效
G_MainSwitch := 1
G_DisableWheels := 1
G_RButtonDragging := 1
G_MButtonToAttack := 1
;;是否使用时间戳的快速保存替代原本f6
G_CoverQuickSave := 1
;从按下右键到移动鼠标的延迟ms
;;时间设过长会导致移动屏幕时右键下令. 设过短会导致右键单击但没有下令
G_RButtonDelay := A_Args.length ? A_Args[1] : 90


;;main-switch
;G_MainSwitch

;stdInstance := Std()
;stdin := stdInstance.stdin
;stdout := stdInstance.stdout


;initial := jsongo.Parse(stdin.read())


;stdout.write('Greeting from AHK-War3!!!')

;G_MainSwitch := initial.get("G_MainSwitch")
;G_DisableAlt := initial.get("G_DisableAlt")
;G_DisableWheels := initial.get("G_DisableWheels")
;G_RButtonDragging := initial.get("G_RButtonDragging")
;G_ReplaceQuickSave := initial.get("G_ReplaceQuickSave")
count := 0
StdinToString() {
	stdin := FileOpen("*", "r `n")
	result := ""
	while (!stdin.AtEOF) {
		result .= stdin.Read() . "`n"
	}
	if(result){
;		msgbox(result)
	}
	
	return result
}

pollingReadStdin(){
	global G_MainSwitch
	global G_DisableWheels
	global G_RButtonDragging
	global G_CoverQuickSave
	global G_MButtonToAttack
	global G_RButtonDelay
	
	txt := StdinToString()
	
	if(txt){
		dataArr := jsongo.Parse(txt)
		For index, value in dataArr {
			switch (value['key']){
				case "switch_main" :
					G_MainSwitch := value['value']
				case "switch_forbidWheelsZoom" :
					G_DisableWheels := value['value']
				case "switch_replaceF6" :
					G_CoverQuickSave := value['value']
				case "switch_RbtnDragging" :
					G_RButtonDragging := value['value']
				case "switch_MbtnToAttack" :
					G_MButtonToAttack := value['value']
				case "input_detectionDelay" :
					G_RButtonDelay := value['value']
			}
		}
;		msgbox(txt)
;      msgbox(mod(count,2))
   }
;	data := jsongo.Parse(original)
;	if(data){
;		switch(data['key'],1){
;			case "switch_forbidWheelsZoom" : 
;				msgbox('switch_forbidWheelsZoom:' data['value'] '  type:' type(data['value']))
;		}
;		
;	}
}

setTimer(pollingReadStdin,3)

;;进程启动后将Electron的配置发送给ahk














#Hotif WinActive(WarcraftIIIProcess) && G_MainSwitch && G_CoverQuickSave
F6::{
	Send("{RAlt DownR}{S}{RAlt Up}")
	Sleep(100)
	time := FormatTime(,"yyyy.M.d HH：mm")
	Send("QuickSave_" time "{Enter}")
}
;F6::{
;	; 打开标准输出
;	stdout := FileOpen("*", "w")
;	; 构造要发送的信息
;	msg := { type: "F6.normal", timestamp: A_TickCount }
;   		
;	; 将信息以 JSON 格式写入到标准输出
;	stdout.WriteLine(jsongo.Stringify(msg))
;	; 关闭标准输出（可选，根据需要决定是否保持打开状态）
;	stdout.Close()
;}

#HotIf WinActive(WarcraftIIIProcess) && G_MainSwitch
;;防止ctrl+shift+s关闭声音
^+s::return
;;防止ctrl+alt+shift+s关闭声音
^+!s::return
;Tab::AltTab
LAlt & q::{
	Send('{Numpad7}')
}
LAlt & w::{
	Send('{Numpad8}')
}
LAlt & a::{
	Send('{Numpad4}')
}
LAlt & s::{
	Send('{Numpad5}')
}
LAlt & z::{
	Send('{Numpad1}')
}
LAlt & x::{
	Send('{Numpad2}')
}
;!x::Numpad2

#HotIf WinActive(WarcraftIIIProcess) && G_MainSwitch && G_DisableWheels && !RButtonPressingTime
;;禁止滚轮滚动,替换为shift+wheel
WheelUp::{
	return
}
WheelDown::{
	return
}
:$:Shift & WheelUp::{
	Send("WheelUp")
}
:$:Shift & WheelDown::{
	Send("WheelUp")
}

#HotIf WinActive(WarcraftIIIProcess) && G_MainSwitch && G_RButtonDragging
;;右键拖拽屏幕
;;右键按下但不松开时拖动事件::
;;如果右键按下并立刻弹起,视为右键下令
;;此变量从右键按下那一刻开始记录右键按压持续时长,右键弹起时恢复为false
RButtonPressingTime := false

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

#HotIf WinActive(WarcraftIIIProcess) && G_MainSwitch && G_MButtonToAttack
*MButton:: {
	Send("{A}{LButton}")
}

	
class XGUI extends Gui {
	__New(title, opt:=''){
		global G_MainSwitch
		global G_DisableAlt
		global G_DisableWheels
		global G_RButtonDragging
		global G_RButtonDelay
		
		super.__new(opt, title, this)
			;this.SetFont('s22', "微软雅黑")
			this.MarginX := 30
			this.MarginY := 20
			
			
;			SwitchWidget_DisableAlt := this.UseSwitchs(,"关闭左Alt显血，和与其相关的其它组合键",(widget) => (
;				TipsWidget_DisableAlt.Visible := widget.value
;				G_DisableAlt := widget.value
;			))
;			TipsWidget_DisableAlt := this.UseTips("注意：此选项开启后与左Alt相关的任何组合键都将失效，要切屏时需按住Ctrl+Alt+Tab，保存游戏时按住Ctrl+Alt+S，以此类推（右Alt不受影响）")
			
			TipsWidget_AltKeys := this.UseCustomWidget('Text',"左Alt + Q，W`r        A，S`r        Z，X`r对应物品栏，右Alt未改动",'',(*) => this.SetFont('s22',"Consolas"),)
			
			SwitchWidget_DisableWheels := this.UseSwitchs(,"禁止滚轮缩放视角",(widget) => (
				TipsWidget_DisableWheels.Visible := widget.value
				G_DisableWheels := widget.value
			))
			TipsWidget_DisableWheels := this.UseTips("改为Shift+滚轮，也可以使用Page Up/Down")
			
			SwitchWidget_RButtonDrag := this.UseSwitchs(,"开启鼠标右键拖拽屏幕",(widget) => (
				TipsWidget_RButtonDragTips1.Visible :=
				GroupBoxWidget_RButtonDrag.Visible :=
				TextWidget_RButtonDrag.Visible :=
				EditWidget_RButtonDrag.Visible :=
				TipsWidget_Adanced.Visible :=
				widget.value
				
				G_RButtonDragging := widget.value
				G_RButtonDragging := widget.value
			))
			TipsWidget_RButtonDragTips1 := this.UseTips("这个值控制鼠标右键从按下到弹起多少ms内视为一次右键点击指令,`r设置过长会导致右键拖拽画面时误对部队下令移动`r设置过短会导致右键下令被忽略从而误认为是在拖拽画面而非点击")
			GroupBoxWidget_RButtonDrag := this.UseCustomWidget(
				"GroupBox",
				"右键拖拽选项",
				' xp',
				() => this.SetFont("s14","Consolas"),
			)
			TextWidget_RButtonDrag := this.UseCustomWidget('Text',"右键检测延迟(ms)",' yp+50 xp+20')
			EditWidget_RButtonDrag := this.UseCustomWidget('Edit',G_RButtonDelay,' x+0 yp-3')
			EditWidget_RButtonDrag.onEvent('Change',(s,f) => G_RButtonDelay := EditWidget_RButtonDrag.value)
			
			TipsWidget_Adanced := this.UseCustomWidget('Text','进阶：如果想永久保存自己的右键拖拽延迟数，可以给此程序创建快捷方式，`r在快捷方式属性->快捷方式->目标一行后面添加空格<ms数>，`r如"D:\改键工具.exe" 200',' x50',(*) => this.SetFont('s14',"Consolas"),)
			
			ButtonWidget_MainSwitch := this.UseCustomWidget('Button',"停止改键",' yp+100 xp260',,(widget) => (
				
				widget.onEvent('Click',(*) => (
					(G_MainSwitch := Mod(G_MainSwitch+1,2))
					(widget.Text := G_MainSwitch ? "停止改键" : "开启改键")
					widget.Opt("+Background" (G_MainSwitch ? "Default" : "00FF00"))
				))
			))
;			SwitchWidget_DisableAlt.value := 1
			SwitchWidget_DisableWheels.value := 1
			SwitchWidget_RButtonDrag.value := 1
	}
	UseTips(tips:=''){
		;this.setFont("s14","微软雅黑")
		this.SetFont("s16 c494949","Consolas")
		widget := this.AddText("yp+50 xp+20 w600",tips)
		this.SetFont()
		return widget
	}
	
	UseSwitchs(widgetType := "CheckBox" , title := '未定义' , onClick := (*) => "Null" ,options := ''){
		;this.SetFont('s22',"微软雅黑")
		this.SetFont('s22',"Consolas")
		widget := this.Add(widgetType,"x" this.MarginX options,title,)
		try{
			widget.onEvent('Click',(*) => onClick(widget))
		}
		this.SetFont()
		return widget
	}
	UseCustomWidget(widgetType,title,options:='',before := () => "" , after := (w) => ""){
		
		before()
		widget := this.Add(widgetType,"x" this.MarginX options,title)
		after(widget)
		return widget
	}
}



;X := XGUI('魔兽争霸III重铸版改键工具 by Kane.Kuroneko')
;X.show()


