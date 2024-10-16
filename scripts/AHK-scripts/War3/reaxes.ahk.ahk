;reaxes的AHK版本
reaxes(cb){
	return cb()
}

;;
collecting := false


autoRun(callback){
	collecting := true
	callback()
	collecting := false
}

useReactive(source := {count:0}){
	store:=observable(source)
	
	observable(o){
		_new := {}
		for(k,v in source.ownProps()){
			get(){
				return v
			}
			set(v){
				_new[k] = v
			}
			_new.defineProp( k , {
				get:get,
				set:set
			})
		}
	}
	
	collectDeps(_observable){
	
	}
	setState(store){
	
	}
	mutate(){
	
	}
	
	return {
		store : store,
		setState : setState,
		mutate : mutate ,
		
	}
}


observer(cb,observable){
	first := true
	
}


;APIs:

