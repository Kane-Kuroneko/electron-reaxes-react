#Include "./std.ahk"
#Include "../Libs/jsongo_AHKv2/jsongo.v2.ahk"

;jsongo


stdInstance := Std()
stdin := stdInstance.stdin
stdout := stdInstance.stdout

stdout.write(jsongo.Stringify({
	type : "question",
	data : "What's your name ?"
}))
stdout.close()

user := jsongo.Parse(stdin.readline())
;msgbox('type:' type(name) 'value: ' name)
;msgbox(name.type ',' name.data)
stdin.close()

stdout := stdInstance.stdout
stdout.writeLine(jsongo.stringify({
	type : 'greeting',
	data : 'Hello, ' user.get('data') '!'
}))
