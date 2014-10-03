(function() {

	//Initial Public Interface
	var pub = window.Stemo = function() {
		var args = _.toArray(arguments);
		if (args.length === 0 ) return;

		var obj = args[0];

		var rtn;

		if (isArray(obj)) rtn = new ModelArray(undefined, obj, args[1] || "global" );
		else rtn = new ModelObject(undefined, obj, args[1] || "global" );

		return rtn;
	};

	//Public utility functions
	var isArray = pub.isArray = function(obj) {
		if (typeof obj !== "object") return false;
		if (obj instanceof Array) return true;
		for (var key in obj) {
			if (isNumeric(key)) return true;
		}
		return false;
	}

	var typeOf = pub.typeOf = function (obj) {
		var type = typeof obj;
		if (type !== "object") return type;
		for (var key in obj) {
			if (isNumeric(key)) return 'array';
		}
		return 'object';
	}

	var isNumeric = pub.isNumeric = function (obj) {
		return !isNaN(parseFloat(obj)) && isFinite(obj);
	}












	//Foundation Functionality
	var Model = function (parent, from, name) {
		Object.defineProperties(this, {
			_events: {
				value: {},
				writable: true,
				enumerable: false
			},
			__name: {
				value: name,
				writable: true,
				enumerable: false
			},
			__defined: {
				value: {},
				writable: true,
				enumerable: false
			},
			__from: {
				value: from,
				writable: true,
				enumerable: false
			},
			__parent: {
				value: parent,
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
			},
			parent: {
				get: function() {
					return this.__parent;
				}
			}
		});
		for (var key in from) {
			addProperty (from, this, key);
		}
	};
	_.extend(Model.prototype, Backbone.Events);
	_.extend(Model.prototype, {
		syncAll: function(type) {
			this.sync(type);
			var definedKeys = Object.keys(this.__defined);
			for (var i = 0; i < definedKeys.length; i++) {
				var key = definedKeys[i];
				if (this[key] instanceof ModelObject || this[key] instanceof ModelArray ) {
					this[key].syncAll(type);
				}
			}
			return this;
		},
		sync: function(type) {
			var modelKeys = Object.keys(this);
			var definedKeys = Object.keys(this.__defined);
			var fromKeys = Object.keys(this.__from);
			switch(type) {
			case undefined: case "both":
				var diff = _.difference(modelKeys, definedKeys);
				for (var i = 0; i < diff.length; i++) {
					if (this[diff[i]] instanceof ModelObject || this[diff[i]] instanceof ModelArray ) {
						this.__from[diff[i]] = this[diff[i]].__from;
					} else {
						this.__from[diff[i]] = this[diff[i]];
					}
					delete this[diff[i]];
					addProperty(this.__from, this, diff[i]);
					this.trigger("add", diff[i], this.__from[diff[i]], this, diff[i]);
					if (typeof this.__from[diff[i]] == "object") this[diff[i]].sync("both");
				}
				//from to model
				var diff = _.difference(definedKeys, modelKeys);
				for (var i = 0; i < diff.length; i++) {
					addProperty(this.__from, this, diff[i]);
					this.trigger("add", diff[i], this.__from[diff[i]], this, diff[i]);
					if (typeof this.__from[diff[i]] == "object") this[diff[i]].sync("both");
				}
				break;
			case "push":
				//from to model
				var diff = _.difference(fromKeys, modelKeys);
				for (var i = 0; i < diff.length; i++) {
					delete this.__defined[diff[i]];
					delete this.__from[diff[i]];
					this.trigger("remove", diff[i], this.__from[diff[i]], this, diff[i]);
				}

				//model to from
				var diff = _.difference(modelKeys, definedKeys);
				for (var i = 0; i < diff.length; i++) {
					if (this[diff[i]] instanceof ModelObject || this[diff[i]] instanceof ModelArray ) {
						this.__from[diff[i]] = this[diff[i]].__from;
					} else {
						this.__from[diff[i]] = this[diff[i]];
					}
					delete this[diff[i]];
					addProperty(this.__from, this, diff[i]);
					this.trigger("add", diff[i], this.__from[diff[i]], this, diff[i]);
					if (typeof this.__from[diff[i]] == "object") this[diff[i]].sync("push");
				}

				break;
			case "pull":
				//model to from
				var diff = _.difference(modelKeys, fromKeys);
				for (var i = 0; i < diff.length; i++) {
					delete this[diff[i]];
					delete this.__defined[diff[i]];
					this.trigger("remove", diff[i], this.__from[diff[i]], this, diff[i]);
				}

				//from to model
				var diff = _.difference(fromKeys, definedKeys);
				for (var i = 0; i < diff.length; i++) {
					addProperty(this.__from, this, diff[i]);
					this.trigger("add", diff[i], this.__from[diff[i]], this, diff[i]);
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
			            o[n] = new ModelArray(o, [], n);
			        } else {
			        	var nobj = {};
			            o[n] = new ModelObject(o, {}, n);
			        }
		            //o[n].__parent = o;
		            o.sync('push');
		            o = o[n];
		        }
		    }
		    if (value instanceof ModelObject || value instanceof ModelArray) value = mod.__from;
		    if (value === undefined) {
		    	if (isArray(o)) {
		    		o.splice(a[a.length - 1],1);
		    	} else {
			    	delete o[a[a.length - 1]];
			    }
		    } else {
			    o[a[a.length - 1]] = value;
			}
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
		        if (typeof o === "object" && n in o) {
		            o = o[n];
		        } else {
		            return;
		        }
		    }
		    return o;
		}
	})











	//Object specific functioncality
	function ModelObject(parent, from, name) {
		Model.call(this, parent, from, name);
		this.on("change", function(path, value, proxy, name) {
			if (this.__parent) {
				var cpath;
				cpath = this.__name + "." + (path || name);
				
				this.__parent.trigger("change:"+cpath, cpath, value, proxy, name);
				this.__parent.trigger("change", cpath, value, proxy, name);
			}
		});
		this.on("add", function(path, value, proxy, name) {
			if (this.__parent) {
				var cpath;
				cpath = this.__name + "." + (path || name);

				this.__parent.trigger("add:"+cpath, cpath, value, proxy, name);
				this.__parent.trigger("add", cpath, value, proxy, name);				
			}
		});
		this.on("remove", function(path, value, proxy, name) {
			if (this.__parent) {
				var cpath;
				cpath = this.__name + "." + (path || name);

				this.__parent.trigger("remove:"+cpath, cpath, value, proxy, name);
				this.__parent.trigger("remove", cpath, value, proxy, name);				
			}
		});
	}
	ModelObject.prototype = {};
	_.extend(ModelObject.prototype, Model.prototype);
	














	//Array specific functioncality
	function ModelArray(parent, from, name) {
		Model.call(this, parent, from, name);
		Object.defineProperties(this, {
			'__length': {
				'value': from.length,
				'configurable': true,
				'writable': true,
				'enumerable': false,
			},
			'length': {
				get: function() {
					return this.__length;
				},
				set: function(v) {
					this.__length = v;
				}
			}
		});
		this.on("change", function(path, value, proxy, name) {
			if (this.__parent) {
				var cpath;
				if (isNumeric(path)) {
					cpath = this.__name + "[" + name + "]";
				} else {
					cpath = this.__name + "." + path;
				}
				this.__parent.trigger("change:"+cpath, cpath, value, proxy, name);
				this.__parent.trigger("change", cpath, value, proxy, name);
			}
		});
		this.on("add", function(path, value, proxy, name) {
			if (this.__parent) {
				var cpath;
				if (isNumeric(path)) {
					cpath = this.__name + "[" + name + "]";
				} else {
					cpath = this.__name + "." + path;
				}
				this.__parent.trigger("add:"+cpath, cpath, value, proxy, name);
				this.__parent.trigger("add", cpath, value, proxy, name);	
			}
		});
		this.on("remove", function(path, value, proxy, name) {
			if (this.__parent) {
				var cpath;
				if (isNumeric(path)) {
					cpath = this.__name + "[" + name + "]";
				} else {
					cpath = this.__name + "." + path;
				}
				this.__parent.trigger("remove:"+cpath, cpath, value, proxy, name);
				this.__parent.trigger("remove", cpath, value, proxy, name);	
			}
		});
	}
	ModelArray.prototype = [];
	_.extend(ModelArray.prototype, Model.prototype);
	var trapNatives = [
		"concat",
		"every",
		"filter",
		"forEach",
		"indexOf",
		"join",
		"lastIndexOf",
		"map",
		"pop",
		"push",
		"reduce",
		"reduceRight",
		"reverse",
		"shift",
		"slice",
		"some",
		"sort",
		"splice",
		"toLocaleString",
		"toString",
		"unshift"
	];
	for (var i = 0 ; i < trapNatives.length; i++) {
		var a = trapNatives[i];
		createFunctionFrom(ModelArray.prototype, a, [], function() {
			this.sync('push');
		});
	}











	//Private utility functions
	function addProperty(object, proxy, name) {
		var childproxycache;
		proxy.__defined[name] = true;
		Object.defineProperty(proxy, name,
			{
				get: function() {
					if (typeof object[name] == "object") {
						if (childproxycache) return childproxycache;
						if (isArray(object[name])) childproxycache = new ModelArray(proxy, object[name], name);
						else childproxycache = new ModelObject(proxy, object[name], name);
						return childproxycache;
					} else {
						return object[name]; 
					}
				},
				set: function (value) {
					if (typeof value == "object") childproxycache = undefined;
					if (value instanceof ModelObject || value instanceof ModelArray) value = proxy.__from;
					proxy.trigger("change", name, value, proxy, name);
					object[name] = value;
					return value;
				},
				enumerable: true,
				configurable: true
			}
		);
	}

	function createFunctionFrom(object, name, from, complete) {
		var args = _.toArray(arguments);
		args.splice(0,4);
		object[name] = function() {
			var rtn = from[name].apply(this, arguments);
			complete.apply(this, args);
			return rtn;
		};
	}



})();