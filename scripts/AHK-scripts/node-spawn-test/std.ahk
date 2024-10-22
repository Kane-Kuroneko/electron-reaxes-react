
class Std {
	
	_in := ''
	_out := ''
	
	stdin {
		get {
			return this._in := FileOpen("*", "r") 
		}
	}
	
	stdout {
		get {
		
			return this._out := FileOpen("*", "w")
		}
	}
	
}





stdInstance := Std()
stdin := stdInstance.stdin
stdout := stdInstance.stdout

stdout.write(`{
	type : "question",
	data : "What's your name ?"
})`)
stdout.close()

user := stdin.readline()
;msgbox('type:' type(name) 'value: ' name)
;msgbox(name.type ',' name.data)
stdin.close()

stdout := stdInstance.stdout
stdout.writeLine(`{
	type : 'greeting',
	data : 'Hello, ' user.get('data') '!'
})`)
