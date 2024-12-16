#include "jsongo.v2.ahk"
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


