#include reaxes.ahk.ahk

reaxCallback(){
	reactive := useReactive()
	store := reactive.store
	setState := reactive.setState
	
	plus(){
		setState({
			count : store.count + 1
		})
	}
	minus(){
		setState({
			count : store.count - 1
		})
	}
	r := {
		plus:(*) => plus,
		minus:minus
	}
	return () => (r)
}
Reaxes_Counter := reaxes(reaxCallback)






class DemoGUI extends Gui {

	__New(title, opt:=''){
		super.__New(opt, title, this)
		this.MarginX := 30
		this.MarginY := 20
		
;		reax_Counter := 
		reax_Counter := Reaxes_Counter()
		
		
		
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

GuiInstance := DemoGUI('demo',)
GuiInstance.show()
