(function() {

	var model = window.model = function() {
		var args = _.toArray(arguments);
		if (args.length === 0 ) return;

		var obj = args[0];

		var rtn;

		if (isArray(obj)) rtn = new modArray( obj, args[1] || "global" );
		else rtn = new modObject( obj, args[1] || "global" );

		return rtn;

	};

	function isArray(obj) {
		if (typeof obj !== "object") return false;
		if (obj instanceof Array) return true;
		for (var key in obj) {
			if (isNumeric(key)) return true;
		}
		return false;
	}

	function TypeOf(obj) {
		var type = typeof obj;
		if (type !== "object") return type;
		for (var key in obj) {
			if (isNumeric(key)) return 'array';
		}
		return 'object';
	}

	function isNumeric(obj) {
		return !isNaN(parseFloat(obj)) && isFinite(obj);
	}

	function mod (from, name) {
		Object.defineProperties(this, {
			_events: {
				value: [],
				writable: true,
				enumerable: false
			},
			__name: {
				value: name,
				writable: true,
				enumerable: false
			},
			__defined: {
				value: [],
				writable: true,
				enumerable: false
			},
			__from: {
				value: from,
				writable: true,
				enumerable: false
			},
			__parent: {
				value: undefined,
				writable: true,
				enumerable: false
			},
			json: {
				get: function() {
					return this.__from;
				},
				set: function(v) {
					this.__from = v;
					this.sync('pull');
				}
			}
		});
		for (var key in from) {
			addProperty (from, this, key);
		}
	};
	_.extend(mod.prototype, Backbone.Events);
	_.extend(mod.prototype, {
		sync: function(type) {
			var modelKeys = Object.keys(this);
			var definedKeys = Object.keys(this.__defined);
			switch(type) {
			case undefined: case "both":
				var diff = _.difference(modelKeys, definedKeys);
				for (var i = 0; i < diff.length; i++) {
					if (this[diff[i]] instanceof mod || this[diff[i]] instanceof modObject || this[diff[i]] instanceof modArray ) {
						this.__from[diff[i]] = this[diff[i]].__from;
					} else {
						this.__from[diff[i]] = this[diff[i]];
					}
					delete this[diff[i]];
					addProperty(this.__from, this, diff[i]);
					this.trigger("add", diff[i], this.__from[diff[i]], this, this.__from, diff[i]);
					if (typeof this.__from[diff[i]] == "object") this[diff[i]].sync("both");
				}
				//from to model
				var diff = _.difference(definedKeys, modelKeys);
				for (var i = 0; i < diff.length; i++) {
					addProperty(this.__from, this, diff[i]);
					if (typeof this.__from[diff[i]] == "object") this[diff[i]].sync("both");
				}
				break;
			case "push":
				//model to from
				var diff = _.difference(modelKeys, definedKeys);
				for (var i = 0; i < diff.length; i++) {
					if (this[diff[i]] instanceof mod || this[diff[i]] instanceof modObject || this[diff[i]] instanceof modArray ) {
						this.__from[diff[i]] = this[diff[i]].__from;
					} else {
						this.__from[diff[i]] = this[diff[i]];
					}
					delete this[diff[i]];
					addProperty(this.__from, this, diff[i]);
					this.trigger("add", diff[i], this.__from[diff[i]], this, this.__from, diff[i]);
					if (typeof this.__from[diff[i]] == "object") this[diff[i]].sync("push");
				}
				break;
			case "pull":
				//from to model
				var diff = _.difference(definedKeys, modelKeys);
				for (var i = 0; i < diff.length; i++) {
					addProperty(this.__from, this, diff[i]);
					if (typeof this.__from[diff[i]] == "object") this[diff[i]].sync("pull");
				}
				break;
			default:
				throw new Error("Unsupported sync type: '" + type + "'");
			}
		},
		set: function(path, value) {
		    var a = path.split('.');
		    var o = this;
		    for (var i = 0; i < a.length - 1; i++) {
		        var n = a[i];
		        if (n in o) {
		            o = o[n];
		        } else {
		        	if ( isNumeric(a[i+1]) ) {
			            o[n] = new modArray({}, n);
			        } else {
			        	var nobj = {};
			            o[n] = new modObject([], n);
			        }
		            o[n].__parent = o;
		            o.sync('push');
		            o = o[n];
		        }
		    }
		    if (value instanceof mod || value instanceof modObject || value instanceof modArray) value = mod.__from;
		    o[a[a.length - 1]] = value;
		    o.sync('push');
		    return this;
		},
		get: function(path) {
		    var o = this;
		    path = path.replace(/\[(\w+)\]/g, '.$1');
		    path = path.replace(/^\./, '');
		    var a = path.split('.');
		    while (a.length) {
		        var n = a.shift();
		        if (n in o) {
		            o = o[n];
		        } else {
		            return;
		        }
		    }
		    return o;
		}
	})


	function modObject(from, name) {
		mod.call(this, from, name);
		this.on("change", function(path, value, proxy, json, name) {
			if (this.__parent) {
				var cpath;
				var bpath;
				cpath = this.__name + "." + (path || name);
				if (path === name) bpath = this.__name;
				
				this.__parent.trigger("ChangeProperty:"+cpath, cpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("ChangeObject:"+bpath, bpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("ChangeProperty", cpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("ChangeObject", bpath, value, proxy, proxy.__from, name);				
			}
		});
		this.on("add", function(path, value, proxy, json, name) {
			if (this.__parent) {
				var cpath;
				var bpath;
				cpath = this.__name + "." + (path || name);
				if (path === name) bpath = this.__name;

				this.__parent.trigger("AddProperty:"+cpath, cpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("AddObject:"+bpath, bpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("AddProperty", cpath, value, proxy, proxy.__from, name);				
				this.__parent.trigger("AddObject", bpath, value, proxy, proxy.__from, name);				
			}
		});
	}
	modObject.prototype = {};
	_.extend(modObject.prototype, mod.prototype);
	
	function modArray(from, name) {
		mod.call(this, from, name);
		Object.defineProperties(this, {
			'length': {
				get: function() {
					return this.__from.length;
				},
				set: function(v) {
					this.__from.length = v;
				}
			}
		});
		this.on("change", function(path, value, proxy, json, name) {
			if (this.__parent) {
				var cpath;
				var bpath;
				if (isNumeric(path)) {
					cpath = this.__name + "[" + name + "]";
					bpath = this.__name;
				} else {
					cpath = this.__name + "." + path;
					bpath = cpath;
				}
				this.__parent.trigger("ChangeProperty:"+cpath, cpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("ChangeObject:"+bpath, bpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("ChangeProperty", cpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("ChangeObject", bpath, value, proxy, proxy.__from, name);
			}
		});
		this.on("add", function(path, value, proxy, json, name) {
			if (this.__parent) {
				var cpath;
				var bpath;
				if (isNumeric(path)) {
					cpath = this.__name + "[" + name + "]";
					bpath = this.__name;
				} else {
					cpath = this.__name + "." + path;
					bpath = cpath;
				}
				this.__parent.trigger("AddProperty:"+cpath, cpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("AddObject:"+bpath, bpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("AddProperty", cpath, value, proxy, proxy.__from, name);
				this.__parent.trigger("AddObject", bpath, value, proxy, proxy.__from, name);				
			}
		});
	}
	modArray.prototype = [];
	_.extend(modArray.prototype, mod.prototype);
	_.extend(modArray.prototype, {
		push: function() {
			this.constructor.prototype.push.apply(this, arguments);
			this.sync("push");
		},
		splice: function() {
			this.constructor.prototype.splice.apply(this, arguments);
			this.sync("push");	
		}
	})


	function addProperty(object, proxy, name) {
		var childproxycache;
		proxy.__defined[name] = true;
		Object.defineProperty(proxy, name,
			{
				get: function() {
					if (typeof object[name] == "object") {
						if (childproxycache) return childproxycache;
						if (isArray(object[name])) childproxycache = new modArray(object[name], name);
						else childproxycache = new modObject(object[name], name);
						childproxycache.__parent = proxy;
						return childproxycache;
					} else {
						return object[name]; 
					}
				},
				set: function (value) {
					proxy.trigger("change", name, value, proxy, proxy.__from, name);
					if (typeof value == "object") childproxycache = undefined;
					if (value instanceof mod || value instanceof modObject || value instanceof modArray) value = mod.__from;
					object[name] = value;
					return value;
				},
				enumerable: true
			}
		);
	}



})();