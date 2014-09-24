(function (modules) {
	var resolve, getRequire, require, notFoundError, findFile
	  , extensions = {".js":[],".json":[],".css":[],".html":[]};
	notFoundError = function (path) {
		var error = new Error("Could not find module '" + path + "'");
		error.code = 'MODULE_NOT_FOUND';
		return error;
	};
	findFile = function (scope, name, extName) {
		var i, ext;
		if (typeof scope[name + extName] === 'function') return name + extName;
		for (i = 0; (ext = extensions[extName][i]); ++i) {
			if (typeof scope[name + ext] === 'function') return name + ext;
		}
		return null;
	};
	resolve = function (scope, tree, path, fullpath, state) {
		var name, dir, exports, module, fn, found, i, ext;
		path = path.split(/[\\/]/);
		name = path.pop();
		if ((name === '.') || (name === '..')) {
			path.push(name);
			name = '';
		}
		while ((dir = path.shift()) != null) {
			if (!dir || (dir === '.')) continue;
			if (dir === '..') {
				scope = tree.pop();
			} else {
				tree.push(scope);
				scope = scope[dir];
			}
			if (!scope) throw notFoundError(fullpath);
		}
		if (name && (typeof scope[name] !== 'function')) {
			found = findFile(scope, name, '.js');
			if (!found) found = findFile(scope, name, '.json');
			if (!found) found = findFile(scope, name, '.css');
			if (!found) found = findFile(scope, name, '.html');
			if (found) {
				name = found;
			} else if ((state !== 2) && (typeof scope[name] === 'object')) {
				tree.push(scope);
				scope = scope[name];
				name = '';
			}
		}
		if (!name) {
			if ((state !== 1) && scope[':mainpath:']) {
				return resolve(scope, tree, scope[':mainpath:'], fullpath, 1);
			}
			return resolve(scope, tree, 'index', fullpath, 2);
		}
		fn = scope[name];
		if (!fn) throw notFoundError(fullpath);
		if (fn.hasOwnProperty('module')) return fn.module.exports;
		exports = {};
		fn.module = module = { exports: exports };
		fn.call(exports, exports, module, getRequire(scope, tree));
		return module.exports;
	};
	require = function (scope, tree, fullpath) {
		var name, path = fullpath, t = fullpath.charAt(0), state = 0;
		if (t === '/') {
			path = path.slice(1);
			scope = modules['/'];
			tree = [];
		} else if (t !== '.') {
			name = path.split('/', 1)[0];
			scope = modules[name];
			if (!scope) throw notFoundError(fullpath);
			tree = [];
			path = path.slice(name.length + 1);
			if (!path) {
				path = scope[':mainpath:'];
				if (path) {
					state = 1;
				} else {
					path = 'index';
					state = 2;
				}
			}
		}
		return resolve(scope, tree, path, fullpath, state);
	};
	getRequire = function (scope, tree) {
		return function (path) { return require(scope, [].concat(tree), path); };
	};
	return getRequire(modules, []);
})({
	"carota": {
		"src": {
			"carota.js": function (exports, module, require) {
				var editor = require('./editor');
				var doc = require('./doc');
				var dom = require('./dom');
				var runs = require('./runs');
				var html = require('./html');
				var measure = require('./measure');
				
				var bundle = {
				    editor: editor,
				    document: doc,
				    dom: dom,
				    runs: runs,
				    html: html,
				    measure: measure
				};
				
				module.exports = bundle;
				
				if (typeof window !== 'undefined' && window.document) {
				    if (window.carota) {
				        throw new Error('Something else is called carota!');
				    }
				    window.carota = bundle;
				}
			},
			"characters.js": function (exports, module, require) {
				var runs = require('./runs');
				
				var compatible = function(a, b) {
				    if (a._runs !== b._runs) {
				        throw new Error('Characters for different documents');
				    }
				};
				
				var prototype = {
				    equals: function(other) {
				        compatible(this, other);
				        return this._run === other._run && this._offset === other._offset;
				    },
				    cut: function(upTo) {
				        compatible(this, upTo);
				        var self = this;
				        return function(eachRun) {
				            for (var runIndex = self._run; runIndex <= upTo._run; runIndex++) {
				                var run = self._runs[runIndex];
				                if (run) {
				                    var start = (runIndex === self._run) ? self._offset : 0;
				                    var stop = (runIndex === upTo._run) ? upTo._offset : runs.getTextLength(run.text);
				                    if (start < stop) {
				                        runs.getSubText(function(piece) {
				                            var pieceRun = Object.create(run);
				                            pieceRun.text = piece;
				                            eachRun(pieceRun);
				                        }, run.text, start, stop - start);
				                    }
				                }
				            }
				        };
				    }
				};
				
				function character(runArray, run, offset) {
				    return Object.create(prototype, {
				        _runs: { value: runArray },
				        _run: { value: run },
				        _offset: { value: offset },
				        char: {
				            value: run >= runArray.length ? null :
				                runs.getTextChar(runArray[run].text, offset)
				        }
				    });
				}
				
				function firstNonEmpty(runArray, n) {
				    for (; n < runArray.length; n++) {
				        if (runs.getTextLength(runArray[n].text) != 0) {
				            return character(runArray, n, 0);
				        }
				    }
				    return character(runArray, runArray.length, 0);
				}
				
				module.exports = function(runArray) {
				    return function(emit) {
				        var c = firstNonEmpty(runArray, 0);
				        while (!emit(c) && (c.char !== null)) {
				            c = (c._offset + 1 < runs.getTextLength(runArray[c._run].text))
				                ? character(runArray, c._run, c._offset + 1)
				                : firstNonEmpty(runArray, c._run + 1);
				        }
				    };
				};
			},
			"doc.js": function (exports, module, require) {
				var per = require('per');
				var characters = require('./characters');
				var split = require('./split');
				var wrap = require('./wrap');
				var word = require('./word');
				var node = require('./node');
				var runs = require('./runs');
				var measure = require('./measure');
				var range = require('./range');
				var util = require('./util');
				
				var wordCharRuns = function(positionedWord) {
				    return positionedWord.children().map(function(char) {
				        return char.part.run;
				    });
				};
				
				var makeEditCommand = function(doc, start, count, words) {
				    var selStart = doc.selection.start, selEnd = doc.selection.end;
				    return function(redo) {
				        var oldWords = Array.prototype.splice.apply(doc.words, [start, count].concat(words));
				        var stack = doc[redo ? 'redo' : 'undo'];
				        while (stack.length > 50) {
				            stack.shift();
				        }
				        stack.push(makeEditCommand(doc, start, words.length, oldWords));
				        doc.layout();
				        doc.contentChanged.fire();
				        doc.select(selStart, selEnd);
				    };
				};
				
				var prototype = node.derive({
				    load: function(runs) {
				        var self = this;
				        this.undo = [];
				        this.redo = [];
				        this.words = per(characters(runs)).per(split()).map(function(w) {
				            return word(w, self.inlines);
				        }).all();
				        this.layout();
				        this.contentChanged.fire();
				        this.select(0, 0);
				    },
				    layout: function() {
				        this.lines = per(this.words).per(wrap(this._width, this)).all();
				        var lastLine = this.last();
				        this.height = !lastLine ? 0 : lastLine.baseline + lastLine.descent;
				    },
				    plainText: function() {
				        return this.words.map(function(word) {
				            return word.plainText;
				        }).join('');
				    },
				    runs: function(emit) {
				        this.lines.forEach(function(line) {
				            line.runs(emit);
				        });
				    },
				    range: function(start, end) {
				        return range(this, start, end);
				    },
				    documentRange: function() {
				        return this.range(0, this.length());
				    },
				    selectedRange: function() {
				        return this.range(this.selection.start, this.selection.end);
				    },
				    save: function() {
				        return this.documentRange().save();
				    },
				    paragraphRange: function(start, end) {
				        // find the character after the nearest newline before start
				        var ch = this.characterByOrdinal(start), word;
				        if (ch) {
				            word = ch.word;
				            while (word.ordinal > 0) {
				                var prev = word.previous();
				                if (prev.word.isNewLine()) {
				                    break;
				                }
				                word = prev;
				            }
				            start = word.ordinal;
				        }
				        // find the nearest newline after end
				        ch = this.characterByOrdinal(end);
				        if (ch) {
				            word = ch.word;
				            while (!word.word.isNewLine()) {
				                word = word.next();
				            }
				            end = word.ordinal;
				        }
				        return this.range(start, end);
				    },
				    insert: function(text) {
				        this.select(this.selection.end + this.selectedRange().setText(text));
				    },
				    splice: function(start, end, text) {
				        var startChar = this.characterByOrdinal(start),
				            endChar = start === end ? startChar : this.characterByOrdinal(end);
				        if (typeof text === 'string') {
				            text = [
				                Object.create((startChar.previous() || startChar).part.run, {
				                    text: { value: text }
				                })
				            ];
				        } else if (!Array.isArray(text)) {
				            text = [{ text: text }];
				        }
				
				        var startWord = startChar.parent();
				        var startWordIndex = this.words.indexOf(startWord.word);
				        var startWordChars = wordCharRuns(startWord);
				
				        var endWord = endChar.parent();
				        var endWordIndex = endWord === startWord ? startWordIndex : this.words.indexOf(endWord.word);
				        var endWordChars = endWord === startWord ? startWordChars : wordCharRuns(endWord);
				
				        var prefix;
				        if (startChar.ordinal === startWord.ordinal) {
				            var previousWord = startWord.previous();
				            if (previousWord) {
				                prefix = wordCharRuns(previousWord);
				                startWordIndex--;
				            } else {
				                prefix = [];
				            }
				        } else {
				            prefix = startWordChars.slice(0, startChar.ordinal - startWord.ordinal);
				        }
				
				        var suffix;
				        if (endChar.ordinal === endWord.ordinal) {
				            if (endChar.ordinal === this.length()) {
				                suffix = [];
				                endWordIndex--;
				            } else {
				                suffix = wordCharRuns(endWord);
				            }
				        } else {
				            suffix = endWordChars.slice(endChar.ordinal - endWord.ordinal);
				        }
				
				        var self = this;
				        var oldLength = this.length();
				        var newRuns = per(prefix).concat(text).concat(suffix).per(runs.consolidate()).all();
				        var newWords = per(characters(newRuns))
				            .per(split())
				            .truthy()
				            .map(function(w) {
				                return word(w, self.inlines);
				            })
				            .all();
				
				        this.redo.length = 0;
				        makeEditCommand(this, startWordIndex, (endWordIndex - startWordIndex) + 1, newWords)();
				        return this.length() - oldLength;
				    },
				    width: function(width) {
				        if (arguments.length === 0) {
				            return this._width;
				        }
				        this._width = width;
				        this.layout();
				    },
				    first: function() {
				        return this.lines[0];
				    },
				    last: function() {
				        return this.lines[this.lines.length - 1];
				    },
				    children: function() {
				        return this.lines;
				    },
				    length: function() {
				        var lastLine = this.last();
				        return !lastLine ? 0 : lastLine.last().last().ordinal;
				    },
				    draw: function(ctx, bottom) {
				        bottom = bottom || Number.MAX_VALUE;
				        measure.prepareContext(ctx);
				        this.lines.some(function(line) {
				            if (line.baseline - line.ascent > bottom) {
				                return true;
				            }
				            line.draw(ctx);
				        });
				    },
				    toggleCaret: function() {
				        var old = this.caretVisible;
				        if (this.selection.start === this.selection.end) {
				            if (this.selectionJustChanged) {
				                this.selectionJustChanged = false;
				            } else {
				                this.caretVisible = !this.caretVisible;
				            }
				        }
				        return this.caretVisible !== old;
				    },
				    drawSelection: function(ctx, hasFocus) {
				        if (this.selection.end === this.selection.start) {
				            if (this.selectionJustChanged || hasFocus && this.caretVisible) {
				                var char = this.characterByOrdinal(this.selection.start);
				                if (char) {
				                    var charBounds = char.bounds(),
				                        lineBounds = char.word.line.bounds(true);
				                    ctx.beginPath();
				                    ctx.moveTo(charBounds.l, lineBounds.t);
				                    ctx.lineTo(charBounds.l, lineBounds.t + lineBounds.h);
				                    ctx.stroke();
				                }
				            }
				        } else {
				            ctx.save();
				            ctx.fillStyle = hasFocus ? 'rgba(0, 100, 200, 0.3)' : 'rgba(160, 160, 160, 0.3)';
				            this.selectedRange().parts(function(part) {
				                var b = part.bounds(true);
				                ctx.fillRect(b.l, b.t, b.w, b.h);
				            });
				            ctx.restore();
				        }
				    },
				    select: function(ordinal, ordinalEnd) {
				        this.selection.start = Math.max(0, ordinal);
				        this.selection.end = Math.min(
				            typeof ordinalEnd === 'number' ? ordinalEnd : this.selection.start,
				            this.length()
				        );
				        this.selectionJustChanged = true;
				        this.caretVisible = true;
				
				        // When firing selectionChanged, we pass a function can be used
				        // to obtain the formatting, as this highly likely to be needed
				        var cachedFormatting = null;
				        var self = this;
				        var getFormatting = function() {
				            if (!cachedFormatting) {
				                cachedFormatting = self.selectedRange().getFormatting();
				            }
				            return cachedFormatting;
				        };
				        this.selectionChanged.fire(getFormatting);
				    },
				    characterByOrdinal: function(index) {
				        var result = null;
				        if (this.lines.some(function(line) {
				            result = line.characterByOrdinal(index);
				            if (result) {
				                return true;
				            }
				        })) {
				            return result;
				        }
				    },
				    characterByCoordinate: function(x, y, right) {
				        var found, nextLine = false;
				        this.children().some(function(line) {
				            if (nextLine) {
				                found = line.characterByOrdinal(line.ordinal);
				                return true;
				            }
				            var bounds = line.bounds();
				            if (bounds.contains(x, y)) {
				                line.children().some(function(pword) {
				                    bounds = pword.bounds();
				                    if (bounds.contains(x, y)) {
				                        pword.children().some(function(pchar) {
				                            bounds = pchar.bounds();
				                            if (bounds.contains(x, y)) {
				                                if (!pchar.word.word.isNewLine() && (x - bounds.l) > (bounds.w / 2)) {
				                                    found = pchar.next();
				                                } else {
				                                    found = pchar;
				                                }
				                                return true;
				                            }
				                        });
				                        return true;
				                    }
				                });
				                if (!found) {
				                    if (right) {
				                        nextLine = true;
				                    } else {
				                        found = line.last().last();
				                    }
				                } else {
				                    return true;
				                }
				            }
				        });
				        if (!found) {
				            found = this.last().last().last();
				        }
				        return found;
				    },
				    performUndo: function(redo) {
				        var op = (redo ? this.redo : this.undo).pop();
				        if (op) {
				            op(!redo);
				        }
				    },
				    canUndo: function(redo) {
				        return redo ? !!this.redo.length : !!this.undo.length;
				    }
				});
				
				exports = module.exports = function() {
				    var doc = Object.create(prototype);
				    doc._width = 0;
				    doc.height = 0;
				    doc.selection = { start: 0, end: 0 };
				    doc.caretVisible = true;
				    doc.inlines = function() {};
				    doc.selectionChanged = util.event();
				    doc.contentChanged = util.event();
				    doc.load([]);
				    return doc;
				};
			},
			"dom.js": function (exports, module, require) {
				
				exports.isAttached = function(element) {
				    var ancestor = element;
				    while(ancestor.parentNode) {
				        ancestor = ancestor.parentNode;
				    }
				    return !!ancestor.body;
				};
				
				exports.clear = function(element) {
				    while (element.firstChild) {
				        element.removeChild(element.firstChild);
				    }
				};
				
				exports.setText = function(element, text) {
				    exports.clear(element);
				    element.appendChild(document.createTextNode(text));
				};
				
				exports.handleEvent = function(element, name, handler) {
					if (element.on) {
						element.on(name, function(ev) {
					        if (handler(ev) === false) {
					            ev.preventDefault();
					        }
					    });
					} else {
					    element.addEventListener(name, function(ev) {
					        if (handler(ev) === false) {
					            ev.preventDefault();
					        }
					    });
					}
				};
				
				exports.handleMouseEvent = function(element, name, handler) {
				    exports.handleEvent(element, name, function(ev) {
				        var rect = element.getBoundingClientRect();
				        return handler(ev, ev.clientX - rect.left, ev.clientY - rect.top);
				    });
				};
				
				exports.effectiveStyle = function(element, name) {
				    return document.defaultView.getComputedStyle(element).getPropertyValue(name);
				};
			},
			"editor.js": function (exports, module, require) {
				var per = require('per');
				var carotaDoc = require('./doc');
				var dom = require('./dom');
				
				setInterval(function() {
				    var editors = document.querySelectorAll('.carotaEditorCanvas');
				
				    var ev = document.createEvent('Event');
				    ev.initEvent('carotaEditorSharedTimer', true, true);
				
				    // not in IE, apparently:
				    // var ev = new CustomEvent('carotaEditorSharedTimer');
				
				    for (var n = 0; n < editors.length; n++) {
				        editors[n].dispatchEvent(ev);
				    }
				}, 200);
				
				exports.create = function(element, settings) {
				
				    // We need the host element to be a container:
				    if (dom.effectiveStyle(element, 'position') !== 'absolute') {
				        element.style.position = 'relative';
				    }

				    var canvas,
				    	mouseEventer,
				        textAreaDiv,
				        textArea,
				        doc,
				        keyboardSelect,
				        keyboardX,
				        hoverChar,
				        selectDragStart,
				        focusChar,
				        textAreaContent;

				    element.innerHTML =
					        '<canvas width="100" height="100" class="carotaEditorCanvas"></canvas>' +
					        '<div style="overflow: hidden; position: absolute; height: 0;">' +
					            '<textarea autocorrect="off" autocapitalize="off" spellcheck="false" tabindex="0" ' +
					            'style="position: absolute; padding: 0px; width: 1000px; height: 1em; ' +
					            'outline: none; font-size: 4px;"></textarea>'
					    
					        '</div>';
					canvas = element.querySelector('canvas');
					textAreaDiv = element.querySelector('div');
				    textArea = element.querySelector('textarea');

				    if (settings === undefined) {
						mouseEventer = canvas;
				    } else {
				    	mouseEventer = settings.mouseEventer;
				    }
				
				   	doc = carotaDoc();
			        keyboardSelect = 0;
			        keyboardX = null;
			        hoverChar;
			        selectDragStart = null;
			        focusChar = null;
			        textAreaContent = '';
				
				    var toggles = {
				        66: 'bold',
				        73: 'italic',
				        85: 'underline',
				        83: 'strikeout'
				    };
				
				    dom.handleEvent(textArea, 'keydown', function(ev) {
				        var start = doc.selection.start,
				            end = doc.selection.end,
				            length = doc.length();
				
				        var key = ev.keyCode;
				        var selecting = !!ev.shiftKey;
				        var handled = false;
				
				        if (!selecting) {
				            keyboardSelect = 0;
				        } else if (!keyboardSelect) {
				            switch (key) {
				                case 37: // left arrow
				                case 38: // up - find character above
				                case 36: // start of line
				                case 33: // page up
				                    keyboardSelect = -1;
				                    break;
				                case 39: // right arrow
				                case 40: // down arrow - find character below
				                case 35: // end of line
				                case 34: // page down
				                    keyboardSelect = 1;
				                    break;
				            }
				        }
				
				        var ordinal = keyboardSelect === 1 ? end : start;
				
				        var changeLine = function(direction, limit) {
				            var char = doc.characterByOrdinal(ordinal);
				            if (char) {
				                if (keyboardX === null) {
				                    var charBounds = char.bounds();
				                    keyboardX = charBounds.l + (charBounds.w / 2);
				                }
				                keyboardX = Math.min(Math.max(keyboardX, 0), doc.width() - 1);
				
				                var nextLine = char.parent().parent()[direction]();
				                if (!nextLine) {
				                    ordinal = limit;
				                } else {
				                    var lineBounds = nextLine.bounds();
				                    var y = lineBounds.t + (lineBounds.h / 2);
				                    var hit = doc.characterByCoordinate(keyboardX, y);
				                    if (hit) {
				                        if (ordinal === hit.ordinal) {
				                            ordinal += (direction === 'next' ? 1 : -1);
				                        } else {
				                            ordinal = hit.ordinal;
				                        }
				                    }
				                }
				            }
				        };
				
				        var changingCaret = false;
				        switch (ev.which) {
				            case 37: // left arrow
				                if (!selecting && start != end) {
				                    ordinal = start;
				                } else {
				                    if (ordinal > 0) {
				                        if (ev.ctrlKey) {
				                            var c = doc.characterByOrdinal(ordinal);
				                            if (c.ordinal === c.word.ordinal) {
				                                ordinal = c.word.previous().ordinal;
				                            } else {
				                                ordinal = c.word.ordinal;
				                            }
				                        } else {
				                            ordinal--;
				                        }
				                    }
				                }
				                keyboardX = null;
				                changingCaret = true;
				                break;
				            case 39: // right arrow
				                if (!selecting && start != end) {
				                    ordinal = end;
				                } else {
				                    if (ordinal < length) {
				                        if (ev.ctrlKey) {
				                            ordinal = doc.characterByOrdinal(ordinal).word.next().ordinal;
				                        } else {
				                            ordinal++;
				                        }
				                    }
				                }
				                keyboardX = null;
				                changingCaret = true;
				                break;
				            case 40: // down arrow - find character below
				                changeLine('next', length);
				                changingCaret = true;
				                break;
				            case 38: // up - find character above
				                changeLine('previous', 0);
				                changingCaret = true;
				                break;
				            case 36: // start of line
				                ordinal = doc.characterByOrdinal(ordinal).word.line.ordinal;
				                changingCaret = true;
				                break;
				            case 35: // end of line
				                ordinal = doc.characterByOrdinal(ordinal).word.line.last().last().ordinal;
				                changingCaret = true;
				                break;
				            case 33: // page up
				                ordinal = 0;
				                changingCaret = true;
				                break;
				            case 34: // page down
				                ordinal = doc.length();
				                changingCaret = true;
				                break;
				            case 8: // backspace
				                if (start === end && start > 0) {
				                    doc.range(start - 1, start).clear();
				                    focusChar = start - 1;
				                    doc.select(focusChar, focusChar);
				                    handled = true;
				                }
				                break;
				            case 46: // del
				                if (start === end && start < length) {
				                    doc.range(start, start + 1).clear();
				                    handled = true;
				                }
				                break;
				            case 90: // Z undo
				                if (ev.ctrlKey) {
				                    handled = true;
				                    doc.performUndo();
				                }
				                break;
				            case 89: // Y undo
				                if (ev.ctrlKey) {
				                    handled = true;
				                    doc.performUndo(true);
				                }
				                break;
				            case 65: // A select all
				                if (ev.ctrlKey) {
				                    handled = true;
				                    doc.select(0, doc.length());
				                }
				                break;
				        }
				
				        var toggle = toggles[ev.which];
				        if (ev.ctrlKey && toggle) {
				            var selRange = doc.selectedRange();
				            selRange.setFormatting(toggle, selRange.getFormatting()[toggle] !== true);
				            paint();
				            handled = true;
				        }
				
				        if (changingCaret) {
				            switch (keyboardSelect) {
				                case 0:
				                    start = end = ordinal;
				                    break;
				                case -1:
				                    start = ordinal;
				                    break;
				                case 1:
				                    end = ordinal;
				                    break;
				            }
				
				            if (start === end) {
				                keyboardSelect = 0;
				            } else {
				                if (start > end) {
				                    keyboardSelect = -keyboardSelect;
				                    var t = end;
				                    end = start;
				                    start = t;
				                }
				            }
				            focusChar = ordinal;
				            doc.select(start, end);
				            handled = true;
				        }
				
				        if (handled) {
				            return false;
				        }
				        console.log(ev.which);
				    });
				
				    var paint = function() {
						
				        if (doc.width() !== element.clientWidth) {
				            doc.width(element.clientWidth);
				        }
				
				        canvas.width = element.clientWidth;
				        canvas.height = Math.max(doc.height, element.clientHeight);
				        if (doc.height < element.clientHeight) {
				            element.style.overflow = 'hidden';
				        } else {
				            element.style.overflow = 'auto';
				        }
				        if (element.clientWidth < canvas.width) {
				            doc.width(element.clientWidth);
				        }
				
				        var ctx = canvas.getContext('2d');
				        ctx.clearRect(0, 0, canvas.width, canvas.height);
				
				        doc.draw(ctx);
				        doc.drawSelection(ctx, selectDragStart || (document.activeElement === textArea));

				        carota.trigger("paint", element, canvas);
				        $(element).trigger("paint", canvas);
				    };
				
				    dom.handleEvent(textArea, 'input', function() {
				        var newText = textArea.value;
				        if (textAreaContent != newText) {
				            textAreaContent = '';
				            textArea.value = '';
				            doc.insert(newText);
				        }
				    });
				
				    var updateTextArea = function() {
				        focusChar = focusChar === null ? doc.selection.end : focusChar;
				        var endChar = doc.characterByOrdinal(focusChar);
				        focusChar = null;
				        if (endChar) {
				            var bounds = endChar.bounds();
				            textAreaDiv.style.left = bounds.l + 'px';
				            textAreaDiv.style.top = bounds.t + 'px';
				            textArea.focus();
				            var scrollDownBy = Math.max(0, bounds.t + bounds.h -
				                    (element.scrollTop + element.clientHeight));
				            if (scrollDownBy) {
				                element.scrollTop += scrollDownBy;
				            }
				            var scrollUpBy = Math.max(0, element.scrollTop - bounds.t);
				            if (scrollUpBy) {
				                element.scrollTop -= scrollUpBy;
				            }
				        }
				        textAreaContent = doc.selectedRange().plainText();
				        textArea.value = textAreaContent;
				        textArea.select();
				
				        setTimeout(function() {
				            textArea.focus();
				        }, 10);
				    };
				
				    doc.selectionChanged(function() {
				        paint();
				        if (!selectDragStart) {
				            updateTextArea();
				        }
				    });
				
				    dom.handleMouseEvent(mouseEventer, 'mousedown', function(ev, x, y) {
				        var char = doc.characterByCoordinate(x, y);
				        selectDragStart = char.ordinal;
				        doc.select(char.ordinal, char.ordinal);
				    });
				
				    dom.handleMouseEvent(mouseEventer, 'dblclick', function(ev, x, y) {
				        var char = doc.characterByCoordinate(x, y);
				        doc.select(char.word.ordinal, char.word.ordinal + char.word.word.text.length);
				    });
				
				    var areCharsEqual = function(a, b) {
				        return a ? (b && a.ordinal == b.ordinal) : !b;
				    };
				
				    dom.handleMouseEvent(mouseEventer, 'mousemove', function(ev, x, y) {
				        if (selectDragStart !== null) {
				            var newHoverChar = doc.characterByCoordinate(x, y, true);
				            if (!areCharsEqual(hoverChar, newHoverChar)) {
				                hoverChar = newHoverChar;
				                if (hoverChar) {
				                    focusChar = hoverChar.ordinal;
				                    if (selectDragStart > hoverChar.ordinal) {
				                        doc.select(hoverChar.ordinal, selectDragStart);
				                    } else {
				                        doc.select(selectDragStart, hoverChar.ordinal);
				                    }
				                }
				            }
				        }
				    });
				
				    dom.handleMouseEvent(mouseEventer, 'mouseup', function(ev, x, y) {
				        selectDragStart = null;
				        keyboardX = null;
				        updateTextArea();
				        textArea.focus();
				    });
				
				    var nextCaretToggle = new Date().getTime(),
				        focused = false,
				        cachedWidth = element.clientWidth,
				        cachedHeight = element.clientHeight;
				
				    var update = function() {
				        var requirePaint = false;
				        var newFocused = document.activeElement === textArea;
				        if (focused !== newFocused) {
				            focused = newFocused;
				            requirePaint = true;
				        }
				
				        var now = new Date().getTime();
				        if (now > nextCaretToggle) {
				            nextCaretToggle = now + 500;
				            if (doc.toggleCaret()) {
				                requirePaint = true;
				            }
				        }
				
				        if (element.clientWidth !== cachedWidth ||
				            element.clientHeight !== cachedHeight) {
				            requirePaint = true;
				            cachedWidth =element.clientWidth;
				            cachedHeight = element.clientHeight;
				        }
				
				        if (requirePaint) {
				            paint();
				        }
				    };
				
				    dom.handleEvent(canvas, 'carotaEditorSharedTimer', update);
				    update();
				
				    doc.canvas = canvas;

				    return doc;
				};
			},
			"html.js": function (exports, module, require) {
				var runs = require('./runs');
				var measure = require('./measure');
				var per = require('per');
				
				var tag = function(name, formattingProperty) {
				    return function(node, formatting) {
				        if (node.nodeName === name) {
				            formatting[formattingProperty] = true;
				        }
				    };
				};
				
				var value = function(type, styleProperty, formattingProperty, transformValue) {
				    return function(node, formatting) {
				        var val = node[type] && node[type][styleProperty];
				        if (val) {
				            if (transformValue) {
				                val = transformValue(val);
				            }
				            formatting[formattingProperty] = val;
				        }
				    };
				};
				
				var attrValue = function(styleProperty, formattingProperty, transformValue) {
				    return value('attributes', styleProperty, formattingProperty, transformValue);
				};
				
				var styleValue = function(styleProperty, formattingProperty, transformValue) {
				    return value('style', styleProperty, formattingProperty, transformValue);
				};
				
				var styleFlag = function(styleProperty, styleValue, formattingProperty) {
				    return function(node, formatting) {
				        if (node.style && node.style[styleProperty] === styleValue) {
				            formatting[formattingProperty] = true;
				        }
				    };
				};
				
				var obsoleteFontSizes = [ 6, 7, 9, 10, 12, 16, 20, 30 ];
				
				var aligns = { left: true, center: true, right: true, justify: true };
				
				var checkAlign = function(value) {
				    return aligns[value] ? value : 'left';
				};
				
				var fontName = function(name) {
				    var s = name.split(/\s*,\s*/g);
				    if (s.length == 0) {
				        return name;
				    }
				    name = s[0]
				    var raw = name.match(/^"(.*)"$/);
				    if (raw) {
				        return raw[1].trim();
				    }
				    raw = name.match(/^'(.*)'$/);
				    if (raw) {
				        return raw[1].trim();
				    }
				    return name;
				};
				
				var headings = {
				    H1: 30,
				    H2: 20,
				    H3: 16,
				    H4: 14,
				    H5: 12
				};
				
				var handlers = [
				    tag('B', 'bold'),
				    tag('STRONG', 'bold'),
				    tag('I', 'italic'),
				    tag('EM', 'italic'),
				    tag('U', 'underline'),
				    tag('S', 'strikeout'),
				    tag('STRIKE', 'strikeout'),
				    tag('DEL', 'strikeout'),
				    styleFlag('fontWeight', 'bold', 'bold'),
				    styleFlag('fontStyle', 'italic', 'italic'),
				    styleFlag('textDecoration', 'underline', 'underline'),
				    styleFlag('textDecoration', 'line-through', 'strikeout'),
				    styleValue('color', 'color'),
				    styleValue('fontFamily', 'font', fontName),
				    styleValue('fontSize', 'size', function(size) {
				        var m = size.match(/^([\d\.]+)pt$/);
				        return m ? parseFloat(m[1]) : 10
				    }),
				    styleValue('textAlign', 'align', checkAlign),
				    function(node, formatting) {
				        if (node.nodeName === 'SUB') {
				            formatting.script = 'sub';
				        }
				    },
				    function(node, formatting) {
				        if (node.nodeName === 'SUPER') {
				            formatting.script = 'super';
				        }
				    },
				    function(node, formatting) {
				        if (node.nodeName === 'CODE') {
				            formatting.font = 'monospace';
				        }
				    },
				    function(node, formatting) {
				        var size = headings[node.nodeName];
				        if (size) {
				            formatting.size = size;
				        }
				    },
				    attrValue('color', 'color'),
				    attrValue('face', 'font', fontName),
				    attrValue('align', 'align', checkAlign),
				    attrValue('size', 'size', function(size) {
				        return obsoleteFontSizes[size] || 10;
				    })
				];
				
				var newLines = [ 'BR', 'P', 'H1', 'H2', 'H3', 'H4', 'H5' ];
				var isNewLine = {};
				newLines.forEach(function(name) {
				    isNewLine[name] = true;
				});
				
				exports.parse = function(html, classes) {
				    var root = html;
				    if (typeof root === 'string') {
				        root = document.createElement('div');
				        root.innerHTML = html;
				    }
				
				    var result = [], inSpace = true;
				    var cons = per(runs.consolidate()).into(result);
				    var emit = function(text, formatting) {
				        cons.submit(Object.create(formatting, {
				            text: { value: text }
				        }));
				    };
				    var dealWithSpaces = function(text, formatting) {
				        text = text.replace(/\n+\s*/g, ' ');
				        var fullLength = text.length;
				        text = text.replace(/^\s+/, '');
				        if (inSpace) {
				            inSpace = false;
				        } else if (fullLength !== text.length) {
				            text = ' ' + text;
				        }
				        fullLength = text.length;
				        text = text.replace(/\s+$/, '');
				        if (fullLength !== text.length) {
				            inSpace = true;
				            text += ' ';
				        }
				        emit(text, formatting);
				    };
				
				    function recurse(node, formatting) {
				        if (node.nodeType == 3) {
				            dealWithSpaces(node.nodeValue, formatting);
				        } else {
				            formatting = Object.create(formatting);
				
				            var classNames = node.attributes['class'];
				            if (classNames) {
				                classNames.value.split(' ').forEach(function(cls) {
				                    cls = classes[cls];
				                    if (cls) {
				                        Object.keys(cls).forEach(function(key) {
				                            formatting[key] = cls[key];
				                        });
				                    }
				                })
				            }
				
				            handlers.forEach(function(handler) {
				                handler(node, formatting);
				            });
				            if (node.childNodes) {
				                for (var n = 0; n < node.childNodes.length; n++) {
				                    recurse(node.childNodes[n], formatting);
				                }
				            }
				            if (isNewLine[node.nodeName]) {
				                emit('\n', formatting);
				                inSpace = true;
				            }
				        }
				    }
				    recurse(root, {});
				    return result;
				};
				
			},
			"line.js": function (exports, module, require) {
				var positionedWord = require('./positionedword');
				var rect = require('./rect');
				var node = require('./node');
				var runs = require('./runs');
				
				/*  A Line is returned by the wrap function. It contains an array of PositionedWord objects that are
				    all on the same physical line in the wrapped text.
				
				     It has a width (which is actually the same for all lines returned by the same wrap). It also has
				     coordinates for baseline, ascent and descent. The ascent and descent have the maximum values of
				     the individual words' ascent and descent coordinates.
				
				    It has methods:
				
				        draw(ctx, x, y)
				                  - Draw all the words in the line applying the specified (x, y) offset.
				        bounds()
				                  - Returns a Rect for the bounding box.
				 */
				
				var prototype = node.derive({
				    draw: function(ctx) {
				        this.positionedWords.forEach(function(word) {
				            word.draw(ctx);
				        });
				    },
				    bounds: function(minimal) {
				        if (minimal) {
				            var firstWord = this.first().bounds(),
				                lastWord = this.last().bounds();
				            return rect(
				                firstWord.l,
				                this.baseline - this.ascent,
				                lastWord.l + lastWord.w,
				                this.ascent + this.descent);
				        }
				        return rect(0, this.baseline - this.ascent,
				            this.width, this.ascent + this.descent);
				    },
				    characterByOrdinal: function(index) {
				        if (index >= this.ordinal && index < this.ordinal + this.length) {
				            var result = null;
				            if (this.positionedWords.some(function(word) {
				                result = word.characterByOrdinal(index);
				                if (result) {
				                    return true;
				                }
				            })) {
				                return result;
				            }
				        }
				    },
				    plainText: function() {
				        return this.positionedWords.map(function(pw) {
				            return pw.plainText();
				        }).join('');
				    },
				    getFormatting: function() {
				        return this.positionedWords.reduce(runs.merge);
				    },
				    runs: function(emit) {
				        this.positionedWords.forEach(function(word) {
				            word.runs(emit);
				        });
				    },
				    parent: function() {
				        return this.doc;
				    },
				    children: function() {
				        return this.positionedWords;
				    },
				    type: 'line'
				});
				
				module.exports = function(doc, width, baseline, ascent, descent, words, ordinal) {
				
				    var align = words[0].align();
				
				    var line = Object.create(prototype, {
				        doc: { value: doc },
				        width: { value: width },
				        baseline: { value: baseline },
				        ascent: { value: ascent },
				        descent: { value: descent },
				        ordinal: { value: ordinal },
				        align: { value: align }
				    });
				
				    var x = 0, spacing = 0, actualWidth = function() {
				        var total = 0;
				        words.forEach(function(word) {
				            total += word.width;
				        });
				        return total - words[words.length - 1].space.width;
				    };
				
				    switch (align) {
				        case 'right':
				            x = width - actualWidth();
				            break;
				        case 'center':
				            x = (width - actualWidth()) / 2;
				            break;
				        case 'justify':
				            if (!words[words.length - 1].isNewLine()) {
				                spacing = (width - actualWidth()) / words.length;
				            }
				            break;
				    }
				
				    Object.defineProperty(line, 'positionedWords', {
				        value: words.map(function(word) {
				            var left = x;
				            x += (word.width + spacing);
				            var wordOrdinal = ordinal;
				            ordinal += (word.text.length + word.space.length);
				            return positionedWord(word, line, left, wordOrdinal, word.width + spacing);
				        })
				    });
				
				    Object.defineProperty(line, 'length', { value: ordinal - line.ordinal });
				    return line;
				};
			},
			"measure.js": function (exports, module, require) {
				var runs = require('./runs');
				
				/*  Returns a font CSS/Canvas string based on the settings in a run
				 */
				var getFontString = exports.getFontString = function(run) {
				
				    var size = (run && run.size) || runs.defaultFormatting.size;
				
				    if (run) {
				        switch (run.script) {
				            case 'super':
				            case 'sub':
				                size *= 0.8;
				                break;
				        }
				    }
				
				    return (run && run.italic ? 'italic ' : '') +
				           (run && run.bold ? 'bold ' : '') + ' ' +
				            size + 'pt ' +
				          ((run && run.font) || runs.defaultFormatting.font);
				};
				
				/*  Applies the style of a run to the canvas context
				 */
				exports.applyRunStyle = function(ctx, run) {
				    ctx.fillStyle = (run && run.color) || runs.defaultFormatting.color;
				    ctx.font = getFontString(run);
				};
				
				exports.prepareContext = function(ctx) {
				    ctx.textAlign = 'left';
				    ctx.textBaseline = 'alphabetic';
				};
				
				/* Generates the value for a CSS style attribute
				 */
				exports.getRunStyle = function(run) {
				    var parts = [
				        'font: ', getFontString(run),
				      '; color: ', ((run && run.color) || runs.defaultFormatting.color)
				    ];
				
				    if (run) {
				        switch (run.script) {
				            case 'super':
				                parts.push('; vertical-align: super');
				                break;
				            case 'sub':
				                parts.push('; vertical-align: sub');
				                break;
				        }
				    }
				
				    return parts.join('');
				};
				
				var nbsp = exports.nbsp = String.fromCharCode(160);
				var enter = exports.enter = nbsp; // String.fromCharCode(9166);
				
				/*  Returns width, height, ascent, descent in pixels for the specified text and font.
				    The ascent and descent are measured from the baseline. Note that we add/remove
				    all the DOM elements used for a measurement each time - this is not a significant
				    part of the cost, and if we left the hidden measuring node in the DOM then it
				    would affect the dimensions of the whole page.
				 */
				var measureText = exports.measureText = function(text, style) {
				    var span, block, div;
				
				    span = document.createElement('span');
				    block = document.createElement('div');
				    div = document.createElement('div');
				
				    block.style.display = 'inline-block';
				    block.style.width = '1px';
				    block.style.height = '0';
				
				    div.style.visibility = 'hidden';
				    div.style.position = 'absolute';
				    div.style.top = '0';
				    div.style.left = '0';
				    div.style.width = '500px';
				    div.style.height = '200px';
				
				    div.appendChild(span);
				    div.appendChild(block);
				    document.body.appendChild(div);
				    try {
				        span.setAttribute('style', style);
				
				        span.innerHTML = '';
				        span.appendChild(document.createTextNode(text.replace(/\s/g, nbsp)));
				
				        var result = {};
				        block.style.verticalAlign = 'baseline';
				        result.ascent = (block.offsetTop - span.offsetTop);
				        block.style.verticalAlign = 'bottom';
				        result.height = (block.offsetTop - span.offsetTop);
				        result.descent = result.height - result.ascent;
				        result.width = span.offsetWidth;
				    } finally {
				        div.parentNode.removeChild(div);
				        div = null;
				    }
				    return result;
				};
				
				/*  Create a function that works like measureText except it caches every result for every
				    unique combination of (text, style) - that is, it memoizes measureText.
				
				    So for example:
				
				        var measure = cachedMeasureText();
				
				    Then you can repeatedly do lots of separate calls to measure, e.g.:
				
				        var m = measure('Hello, world', 'font: 12pt Arial');
				        console.log(m.ascent, m.descent, m.width);
				
				    A cache may grow without limit if the text varies a lot. However, during normal interactive
				    editing the growth rate will be slow. If memory consumption becomes a problem, the cache
				    can be occasionally discarded, although of course this will cause a slow down as the cache
				    has to build up again (text measuring is by far the most costly operation we have to do).
				*/
				var createCachedMeasureText = exports.createCachedMeasureText = function() {
				    var cache = {};
				    return function(text, style) {
				        var key = style + '<>!&%' + text;
				        var result = cache[key];
				        if (!result) {
				            cache[key] = result = measureText(text, style);
				        }
				        return result;
				    };
				};
				
				exports.cachedMeasureText = createCachedMeasureText();
			},
			"node.js": function (exports, module, require) {
				var per = require('per');
				var runs = require('./runs');
				
				var prototype = {
				    children: function() {
				        return [];
				    },
				    parent: function() {
				        return null;
				    },
				    first: function() {
				        return this.children()[0];
				    },
				    last: function() {
				        return this.children()[this.children().length - 1];
				    },
				    next: function() {
				        var parent = this.parent();
				        if (!parent) {
				            return null;
				        }
				        var siblings = parent.children();
				        var next = siblings[siblings.indexOf(this) + 1];
				        if (next) {
				            return next;
				        }
				        var nextParent = parent.next();
				        return !nextParent ? null : nextParent.first();
				    },
				    previous: function() {
				        var parent = this.parent();
				        if (!parent) {
				            return null;
				        }
				        var siblings = parent.children();
				        var prev = siblings[siblings.indexOf(this) - 1];
				        if (prev) {
				            return prev;
				        }
				        var prevParent = parent.previous();
				        return !prevParent ? null : prevParent.last();
				    },
				    getFormatting: function() {
				        per(this.runs, this).reduce(runs.merge).last();
				    },
				    save: function() {
				        return per(this.runs, this).per(runs.consolidate()).all();
				    }
				};
				
				exports.derive = function(methods) {
				    var properties = {};
				    Object.keys(methods).forEach(function(name) {
				        properties[name] = { value: methods[name] };
				    });
				    return Object.create(prototype, properties);
				};
			},
			"part.js": function (exports, module, require) {
				var measure = require('./measure');
				
				var defaultInline = {
				    measure: function() {
				        return {
				            width: 20,
				            ascent: 20,
				            descent: 0
				        };
				    },
				    draw: function(ctx, x, y, width, ascent, descent) {
				        ctx.fillStyle = 'silver';
				        ctx.fillRect(x, y - ascent, width, ascent + descent);
				    }
				};
				
				/*  A Part is a section of a word with its own run, because a Word can span the
				    boundaries between runs, so it may have several parts in its text or space
				    arrays.
				
				        run           - Run being measured.
				        isNewLine     - True if this part only contain a newline (\n). This will be
				                        the only Part in the Word, and this is the only way newlines
				                        ever occur.
				        width         - Width of the run
				        ascent        - Distance from baseline to top
				        descent       - Distance from baseline to bottom
				
				    And methods:
				
				        draw(ctx, x, y)
				                      - Draws the Word at x, y on the canvas context ctx. The y
				                        coordinate is assumed to be the baseline. The call
				                        prepareContext(ctx) will set the canvas up appropriately.
				 */
				var prototype = {
				    draw: function(ctx, x, y) {
				        measure.applyRunStyle(ctx, this.run);
				        if (typeof this.run.text === 'string') {
				            switch (this.run.script) {
				                case 'super':
				                    y -= (this.ascent * (1/3));
				                    break;
				                case 'sub':
				                    y += (this.descent / 2);
				                    break;
				            }
				            ctx.fillText(this.isNewLine ? measure.enter : this.run.text, x, y);
				            if (this.run.underline) {
				                ctx.fillRect(x, 1 + y, this.width, 1);
				            }
				            if (this.run.strikeout) {
				                ctx.fillRect(x, 1 + y - (this.ascent/2), this.width, 1);
				            }
				        } else if (this.inline) {
				            ctx.save();
				            this.inline.draw(ctx, x, y, this.width, this.ascent, this.descent);
				            ctx.restore();
				        }
				    }
				};
				
				module.exports = function(run, inlines) {
				
				    var m, isNewLine, inline;
				    if (typeof run.text === 'string') {
				        isNewLine = (run.text.length === 1) && (run.text[0] === '\n');
				        m = measure.cachedMeasureText(
				                isNewLine ? measure.nbsp : run.text,
				                measure.getRunStyle(run));
				    } else {
				        inline = inlines(run.text) || defaultInline;
				        m = inline.measure(function(str) {
				            return measure.cachedMeasureText(str, measure.getRunStyle(run));
				        });
				    }
				
				    var part = Object.create(prototype, {
				        run: { value: run },
				        isNewLine: { value: isNewLine },
				        width: { value: isNewLine ? 0 : m.width },
				        ascent: { value: m.ascent },
				        descent: { value: m.descent }
				    });
				    if (inline) {
				        Object.defineProperty(part, 'inline', { value: inline });
				    }
				    return part;
				};
			},
			"positionedword.js": function (exports, module, require) {
				var per = require('per');
				var rect = require('./rect');
				var part = require('./part');
				var measure = require('./measure');
				var node = require('./node');
				var split = require('./split');
				var word = require('./word');
				var runs = require('./runs');
				var characters = require('./characters');
				
				var newLineWidth = function(run) {
				    return measure.cachedMeasureText(measure.enter, measure.getFontString(run)).width;
				};
				
				var positionedChar = node.derive({
				    bounds: function() {
				        var wb = this.word.bounds();
				        var width = this.word.word.isNewLine()
				            ? newLineWidth(this.word.word.run)
				            : this.width || this.part.width;
				        return rect(wb.l + this.left, wb.t, width, wb.h);
				    },
				    plainText: function() {
				        return this.part.run.text;
				    },
				    runs: function(emit) {
				        emit(this.part.run);
				    },
				    parent: function() {
				        return this.word;
				    },
				    type: 'character'
				});
				
				/*  A positionedWord is just a realised Word plus a reference back to the containing Line and
				    the left coordinate (x coordinate of the left edge of the word).
				
				    It has methods:
				
				        draw(ctx, x, y)
				                  - Draw the word within its containing line, applying the specified (x, y)
				                    offset.
				        bounds()
				                  - Returns a rect for the bounding box.
				 */
				var prototype = node.derive({
				    draw: function(ctx) {
				        this.word.draw(ctx, this.left, this.line.baseline);
				
				        // Handy for showing how word boundaries work
				        // var b = this.bounds();
				        // ctx.strokeRect(b.l, b.t, b.w, b.h);
				    },
				    bounds: function() {
				        return rect(
				            this.left,
				            this.line.baseline - this.line.ascent,
				            this.word.isNewLine() ? newLineWidth(this.word.run) : this.width,
				            this.line.ascent + this.line.descent);
				    },
				    parts: function(eachPart) {
				        this.word.text.parts.some(eachPart) ||
				        this.word.space.parts.some(eachPart);
				    },
				    characterByOrdinal: function(index) {
				        if (index >= this.ordinal && index < this.ordinal + this.length) {
				            return this.children()[index - this.ordinal];
				        }
				    },
				    runs: function(emit) {
				        this.parts(function(part) {
				            emit(part.run);
				        });
				    },
				    realiseCharacters: function() {
				        if (!this._characters) {
				            var cache = [];
				            var x = 0, self = this, ordinal = this.ordinal,
				                inlines = this.line.doc.inlines;
				            this.parts(function(wordPart) {
				                runs.pieceCharacters(function(char) {
				                    var charRun = Object.create(wordPart.run);
				                    charRun.text = char;
				                    var p = part(charRun, inlines);
				                    cache.push(Object.create(positionedChar, {
				                        left: { value: x },
				                        part: { value: p },
				                        word: { value: self },
				                        ordinal: { value: ordinal },
				                        length: { value: 1 }
				                    }));
				                    x += p.width;
				                    ordinal++;
				                }, wordPart.run.text);
				            });
				            // Last character is artificially widened to match the length of the
				            // word taking into account (align === 'justify')
				            var lastChar = cache[cache.length - 1];
				            if (lastChar) {
				                Object.defineProperty(lastChar, 'width',
				                    { value: this.width - lastChar.left });
				            }
				            this._characters = cache;
				        }
				    },
				    children: function() {
				        this.realiseCharacters();
				        return this._characters;
				    },
				    plainText: function() {
				        return this.word.plainText();
				    },
				    parent: function() {
				        return this.line;
				    },
				    type: 'word'
				});
				
				module.exports = function(word, line, left, ordinal, width) {
				    return Object.create(prototype, {
				        word: { value: word },
				        line: { value: line },
				        left: { value: left },
				        width: { value: width }, // can be different to word.width if (align == 'justify')
				        ordinal: { value: ordinal },
				        length: { value: word.text.length + word.space.length }
				    });
				};
			},
			"range.js": function (exports, module, require) {
				var per = require('per');
				var runs = require('./runs');
				
				function Range(doc, start, end) {
				    this.doc = doc;
				    this.start = start;
				    this.end = end;
				}
				
				Range.prototype.parts = function(emit, list) {
				    list = list || this.doc.lines;
				    var self = this;
				
				    list.some(function(item) {
				        if (item.ordinal + item.length <= self.start) {
				            return false;
				        }
				        if (item.ordinal >= self.end) {
				            return true;
				        }
				        if (item.ordinal >= self.start &&
				            item.ordinal + item.length <= self.end) {
				            emit(item);
				        } else {
				            self.parts(emit, item.children());
				        }
				    });
				};
				
				Range.prototype.plainText = function() {
				    return per(this.parts, this).map('x.plainText()').all().join('');
				};
				
				Range.prototype.clear = function() {
				    return this.setText([]);
				};
				
				Range.prototype.setText = function(text) {
				    return this.doc.splice(this.start, this.end, text);
				};
				
				Range.prototype.runs = function(emit) {
				    this.parts(function(part) { part.runs(emit); });
				};
				
				Range.prototype.save = function() {
				    return per(this.runs, this).per(runs.consolidate()).all();
				};
				
				Range.prototype.getFormatting = function() {
				    if (this.start === this.end) {
				        var pos = this.start;
				        // take formatting of character before, if any, because that's
				        // where plain text picks up formatting when inserted
				        if (pos > 0) {
				            pos--;
				        }
				        var ch = this.doc.characterByOrdinal(pos);
				        return Object.create(!ch ? runs.defaultFormatting : ch.part.run);
				    }
				    return per(this.runs, this).reduce(runs.merge).last();
				};
				
				Range.prototype.setFormatting = function(attribute, value) {
				    var range = this;
				    if (attribute === 'align') {
				        // Special case: expand selection to surrounding paragraphs
				        range = range.doc.paragraphRange(range.start, range.end);
				    }
				    if (range.start === range.end) {
				        // should update a "next insert" default style in the document
				    } else {
				        var saved = range.save();
				        var template = {};
				        template[attribute] = value;
				        runs.format(saved, template);
				        range.setText(saved);
				    }
				};
				
				module.exports = function(doc, start, end) {
				    return new Range(doc, start, end);
				};
			},
			"rect.js": function (exports, module, require) {
				
				var prototype = {
				    contains: function(x, y) {
				        return x >= this.l && x < (this.l + this.w) &&
				            y >= this.t && y < (this.t + this.h);
				
				    },
				    drawPath: function(ctx) {
				        ctx.beginPath();
				        ctx.moveTo(this.l, this.t);
				        ctx.lineTo(this.l + this.w, this.t);
				        ctx.lineTo(this.l + this.w, this.t + this.h);
				        ctx.lineTo(this.l, this.t + this.h);
				        ctx.closePath();
				    },
				    offset: function(x, y) {
				        return rect(this.l + x, this.t + y, this.w, this.h);
				    },
				    equals: function(other) {
				        return this.l === other.l && this.t === other.t &&
				               this.w === other.w && this.h === other.h;
				    }
				};
				
				var rect = module.exports = function(l, t, w, h) {
				    return Object.create(prototype, {
				        l: { value: l },
				        t: { value: t },
				        w: { value: w },
				        h: { value: h }
				    });
				};
			},
			"runs.js": function (exports, module, require) {
				exports.formattingKeys = [ 'bold', 'italic', 'underline', 'strikeout', 'color', 'font', 'size', 'align', 'script' ];
				
				exports.defaultFormatting = {
				    size: 10,
				    font: 'sans-serif',
				    color: 'black',
				    bold: false,
				    italic: false,
				    underline: false,
				    strikeout: false,
				    align: 'left',
				    script: 'normal'
				};
				
				exports.sameFormatting = function(run1, run2) {
				    return exports.formattingKeys.every(function(key) {
				        return run1[key] === run2[key];
				    })
				};
				
				exports.clone = function(run) {
				    var result = { text: run.text };
				    exports.formattingKeys.forEach(function(key) {
				        var val = run[key];
				        if (val && val != exports.defaultFormatting[key]) {
				            result[key] = val;
				        }
				    });
				    return result;
				};
				
				exports.multipleValues = {};
				
				exports.merge = function(run1, run2) {
				    if (arguments.length === 1) {
				        return Array.isArray(run1) ? run1.reduce(exports.merge) : run1;
				    }
				    if (arguments.length > 2) {
				        return exports.merge(Array.prototype.slice.call(arguments, 0));
				    }
				    var merged = {};
				    exports.formattingKeys.forEach(function(key) {
				        if (key in run1 || key in run2) {
				            if (run1[key] === run2[key]) {
				                merged[key] = run1[key];
				            } else {
				                merged[key] = exports.multipleValues;
				            }
				        }
				    });
				    return merged;
				};
				
				exports.format = function(run, template) {
				    if (Array.isArray(run)) {
				        run.forEach(function(r) {
				            exports.format(r, template);
				        });
				    } else {
				        Object.keys(template).forEach(function(key) {
				            if (template[key] !== exports.multipleValues) {
				                run[key] = template[key];
				            }
				        });
				    }
				};
				
				exports.consolidate = function() {
				    var current;
				    return function (emit, run) {
				        if (!current || !exports.sameFormatting(current, run) ||
				            (typeof current.text != 'string') ||
				            (typeof run.text != 'string')) {
				            current = exports.clone(run);
				            emit(current);
				        } else {
				            current.text += run.text;
				        }
				    };
				};
				
				/*  The text property of a run can be an ordinary string, or a "character object",
				 or it can be an array containing strings and "character objects".
				
				 A character object is not a string, but is treated as a single character.
				
				 We abstract over this to provide the same string-like operations regardless.
				 */
				exports.getPieceLength = function(piece) {
				    return piece.length || 1; // either a string or something like a character
				};
				
				exports.getPiecePlainText = function(piece) {
				    return piece.length ? piece : '_';
				};
				
				exports.getTextLength = function(text) {
				    if (typeof text === 'string') {
				        return text.length;
				    }
				    if (Array.isArray(text)) {
				        var length = 0;
				        text.forEach(function(piece) {
				            length += exports.getPieceLength(piece);
				        });
				        return length;
				    }
				    return 1;
				};
				
				exports.getSubText = function(emit, text, start, count) {
				    if (count === 0) {
				        return;
				    }
				    if (typeof text === 'string') {
				        emit(text.substr(start, count));
				        return;
				    }
				    if (Array.isArray(text)) {
				        var pos = 0;
				        text.some(function(piece) {
				            if (count <= 0) {
				                return true;
				            }
				            var pieceLength = exports.getPieceLength(piece);
				            if (pos + pieceLength > start) {
				                if (pieceLength === 1) {
				                    emit(piece);
				                    count -= 1;
				                } else {
				                    var str = piece.substr(Math.max(0, start - pos), count);
				                    emit(str);
				                    count -= str.length;
				                }
				            }
				            pos += pieceLength;
				        });
				        return;
				    }
				    emit(text);
				};
				
				exports.getTextChar = function(text, offset) {
				    var result;
				    exports.getSubText(function(c) { result = c }, text, offset, 1);
				    return result;
				};
				
				exports.pieceCharacters = function(each, piece) {
				    if (typeof piece === 'string') {
				        for (var c = 0; c < piece.length; c++) {
				            each(piece[c]);
				        }
				    } else {
				        each(piece);
				    }
				};
			},
			"split.js": function (exports, module, require) {
				/*  Creates a stateful transformer function that consumes Characters and produces "word coordinate"
				    objects, which are triplets of Characters representing the first characters of:
				
				         start   - the word itself
				         end     - any trailing whitespace
				         next    - the subsequent word, or end of document.
				
				     Newline characters are NOT whitespace. They are always emitted as separate single-character
				     words.
				
				    If start.equals(end) then the "word" only contains whitespace and so must represent spaces
				    at the start of a line. So even in this case, whitespace is always treated as "trailing
				    after" a word - even if that word happens to be zero characters long!
				 */
				
				module.exports = function() {
				
				    var word = null, trailingSpaces = null, newLine = true;
				
				    return function(emit, inputChar) {
				
				        var endOfWord;
				        if (inputChar.char === null) {
				            endOfWord = true;
				        } else {
				            if (newLine) {
				                endOfWord = true;
				                newLine = false;
				            }
				            switch (inputChar.char) {
				                case ' ':
				                    if (!trailingSpaces) {
				                        trailingSpaces = inputChar;
				                    }
				                    break;
				                case '\n':
				                    endOfWord = true;
				                    newLine = true;
				                    break;
				                default:
				                    if (trailingSpaces) {
				                        endOfWord = true;
				                    }
				            }
				        }
				        if (endOfWord) {
				            if (word && !word.equals(inputChar)) {
				                if (emit({
				                    text: word,
				                    spaces: trailingSpaces || inputChar,
				                    end: inputChar
				                }) === false) {
				                    return false;
				                }
				                trailingSpaces = null;
				            }
				            if (inputChar.char === null) {
				                emit(null); // Indicate end of stream
				            }
				
				            word = inputChar;
				        }
				    };
				};
			},
			"util.js": function (exports, module, require) {
				exports.event = function() {
				    var handlers = [];
				
				    var subscribe = function(handler) {
				        handlers.push(handler);
				    };
				
				    subscribe.fire = function() {
				        var args = Array.prototype.slice.call(arguments, 0);
				        handlers.forEach(function(handler) {
				            handler.apply(null, args);
				        });
				    };
				
				    return subscribe;
				};
			},
			"word.js": function (exports, module, require) {
				var per = require('per');
				var part = require('./part');
				var runs = require('./runs');
				
				/*  A Word has the following properties:
				
				        text      - Section (see below) for non-space portion of word.
				        space     - Section for trailing space portion of word.
				        ascent    - Ascent (distance from baseline to top) for whole word
				        descent   - Descent (distance from baseline to bottom) for whole word
				        width     - Width of the whole word (including trailing space)
				
				    It has methods:
				
				        isNewLine()
				                  - Returns true if the Word represents a newline. Newlines are
				                    always represented by separate words.
				
				        draw(ctx, x, y)
				                  - Draws the Word at x, y on the canvas context ctx.
				
				    Note: a section (i.e. text and space) is an object containing:
				
				        parts     - array of Parts
				        ascent    - Ascent (distance from baseline to top) for whole section
				        descent   - Descent (distance from baseline to bottom) for whole section
				        width     - Width of the whole section
				 */
				
				var prototype = {
				    isNewLine: function() {
				        return this.text.parts.length == 1 && this.text.parts[0].isNewLine;
				    },
				    draw: function(ctx, x, y) {
				        per(this.text.parts).concat(this.space.parts).forEach(function(part) {
				            part.draw(ctx, x, y);
				            x += part.width;
				        });
				    },
				    plainText: function() {
				        return this.text.plainText + this.space.plainText;
				    },
				    align: function() {
				        var first = this.text.parts[0];
				        return first ? first.run.align : 'left';
				    }
				};
				
				var section = function(runArray, inlines) {
				    var s = {
				        parts: per(runArray).map(function(p) {
				            return part(p, inlines);
				        }).all(),
				        ascent: 0,
				        descent: 0,
				        width: 0,
				        length: 0,
				        plainText: ''
				    };
				    s.parts.forEach(function(p) {
				        s.ascent = Math.max(s.ascent, p.ascent);
				        s.descent = Math.max(s.descent, p.descent);
				        s.width += p.width;
				        s.length += runs.getPieceLength(p.run.text);
				        s.plainText += runs.getPiecePlainText(p.run.text);
				    });
				    return s;
				};
				
				module.exports = function(coords, inlines) {
				    var text, space;
				    if (!coords) {
				        // special end-of-document marker, mostly like a newline with no formatting
				        text = [{ text: '\n' }];
				        space = [];
				    } else {
				        text = coords.text.cut(coords.spaces);
				        space = coords.spaces.cut(coords.end);
				    }
				    text = section(text, inlines);
				    space = section(space, inlines);
				    var word = Object.create(prototype, {
				        text: { value: text },
				        space: { value: space },
				        ascent: { value: Math.max(text.ascent, space.ascent) },
				        descent: { value: Math.max(text.descent, space.descent) },
				        width: { value: text.width + space.width, configurable: true }
				    });
				    if (!coords) {
				        Object.defineProperty(word, 'eof', { value: true });
				    }
				    return word;
				};
			},
			"wrap.js": function (exports, module, require) {
				var line = require('./line');
				
				/*  A stateful transformer function that accepts words and emits lines. If the first word
				    is too wide, it will overhang; if width is zero or negative, there will be one word on
				    each line.
				
				    The y-coordinate is the top of the first line, not the baseline.
				
				    Returns a stream of line objects, each containing an array of positionedWord objects.
				 */
				
				module.exports = function(width, doc) {
				
				    var lineBuffer = [],
				        lineWidth = 0,
				        maxAscent = 0,
				        maxDescent = 0,
				        y = 0,
				        ordinal = 0,
				        quit;
				
				    var store = function(word, emit) {
				        lineBuffer.push(word);
				        lineWidth += word.width;
				        maxAscent = Math.max(maxAscent, word.ascent);
				        maxDescent = Math.max(maxDescent, word.descent);
				        if (word.isNewLine()) {
				            send(emit);
				        }
				    };
				
				    var send = function(emit) {
				        if (quit) {
				            return;
				        }
				        var l = line(doc, width, y + maxAscent, maxAscent, maxDescent, lineBuffer, ordinal);
				        ordinal += l.length;
				        quit = emit(l);
				        y += (maxAscent + maxDescent);
				        lineBuffer.length = 0;
				        lineWidth = maxAscent = maxDescent = 0;
				    };
				
				    return function(emit, inputWord) {
				        if (inputWord.eof) {
				            store(inputWord, emit);
				        } else {
				            if (!lineBuffer.length) {
				                store(inputWord, emit);
				            } else {
				                if (lineWidth + inputWord.text.width > width) {
				                    send(emit);
				                }
				                store(inputWord, emit);
				            }
				        }
				        return quit;
				    };
				};
			}
		}
	},
	"per": {
		":mainpath:": "per.js",
		"per.js": function (exports, module, require) {
			
			(function(exportFunction) {
			
			    function toFunc(valOrFunc, bindThis) {
			        if (typeof valOrFunc !== 'function') {
			            return Array.isArray(valOrFunc)
			                ? function(emit) {
			                    return valOrFunc.some(emit);
			                } : function(emit) {
			                    return emit(valOrFunc);
			                };
			        }
			        if (bindThis) {
			            return function(emit, value) {
			                valOrFunc.call(bindThis, emit, value);
			            }
			        }
			        return valOrFunc;
			    }
			
			    function Per(valOrFunc, bindThis) {
			        this.forEach = toFunc(valOrFunc, bindThis);
			    }
			
			    function blank(emit, value) {
			        emit(value);
			    }
			
			    function create(valOrFunc, bindThis) {
			        if (arguments.length === 0) {
			            return new Per(blank);
			        }
			        if (valOrFunc && valOrFunc instanceof Per) {
			            return valOrFunc;
			        }
			        return new Per(valOrFunc, bindThis)
			    }
			
			    Per.prototype.per = function(valOrFunc, bindThis) {
			        var first = this.forEach;
			        var second = toFunc(valOrFunc && valOrFunc.forEach || valOrFunc, bindThis);
			        return create(function(emit, value) {
			            return first(function(firstVal) {
			                return second(emit, firstVal);
			            }, value);
			        });
			    };
			
			    function lambda(expression) {
			        return typeof expression === 'string'
			            ? new Function('x', 'return ' + expression)
			            : expression;
			    }
			
			    Per.prototype.map = function(mapFunc) {
			        mapFunc = lambda(mapFunc);
			        return this.per(function(emit, value) {
			            return emit(mapFunc(value));
			        });
			    };
			
			    Per.prototype.filter = function(predicate) {
			        predicate = lambda(predicate);
			        return this.per(function(emit, value) {
			            if (predicate(value)) {
			                return emit(value);
			            }
			        });
			    };
			
			    Per.prototype.concat = function(second, secondThis) {        
			        if (second instanceof Per) {
			            second = second.forEach;
			        } else {
			            second = toFunc(second, secondThis);
			        }
			        var first = this.forEach;
			        return create(function(emit, value) {
			            first(emit, value);
			            second(emit, value);			
			        });
			    };
			
			    Per.prototype.skip = function(count) {
			        return this.per(function(emit, value) {
			            if (count > 0) {
			                count--;
			                return false;
			            }
			            return emit(value);
			        });
			    };
			
			    Per.prototype.take = function(count) {
			        return this.per(function(emit, value) {
			            if (count <= 0) {
			                return true;
			            }
			            count--;
			            return emit(value);
			        });
			    };
			
			    Per.prototype.listen = function(untilFunc) {
			        return this.per(function(emit, value) {
			            if (untilFunc(value)) {
			                return true;
			            }
			            return emit(value);
			        });
			    };
			
			    Per.prototype.flatten = function() {
			        return this.per(function(emit, array) {
			            return !Array.isArray(array)
			                ? emit(array)
			                : array.some(function(value) {
			                    return emit(value);
			                });
			        });
			    };
			
			    Per.prototype.reduce = function(reducer, seed) {
			        var result = seed, started = arguments.length == 2;
			        return this.per(function(emit, value) {
			            result = started ? reducer(result, value) : value;
			            emit(result);
			            started = true;
			        });
			    };
			
			    Per.prototype.multicast = function(destinations) {
			        if (arguments.length !== 1) {
			            destinations = Array.prototype.slice.call(arguments, 0);
			        }
			        destinations = destinations.map(function(destination) {
			            return typeof destination === 'function' ? destination :
			                   destination instanceof Per ? destination.forEach :
			                   ignore;
			        });
			        return this.listen(function(value) {
			            var quit = true;
			            destinations.forEach(function(destination) {
			                if (!destination(ignore, value)) {
			                    quit = false;
			                }
			            });
			            return quit;
			        });
			    };
			
			    function optionalLimit(limit) {
			        return typeof limit != 'number' ? Number.MAX_VALUE : limit;
			    }
			
			    /*  A passive observer - gathers results into the specified array, but
			        otherwise has no effect on the stream of values
			     */
			    Per.prototype.into = function(ar, limit) {
			        if (!Array.isArray(ar)) {
			            throw new Error("into expects an array");
			        }
			        limit = optionalLimit(limit);
			        return this.listen(function(value) {
			            if (limit <= 0) {
			                return true;
			            }
			            ar.push(value);
			            limit--;
			        });
			    };
			
			    function setOrCall(obj, name) {
			        var prop = obj[name];
			        if (typeof prop === 'function') {
			            return prop;
			        }
			        return function(val) {
			            obj[name] = val;
			        }
			    }
			
			    /*  Tracks first, last and count for the values as they go past,
			        up to an optional limit (see 'first' and 'last' methods).
			     */
			    Per.prototype.monitor = function(data) {
			        var n = 0;
			        var count = setOrCall(data, 'count'),
			            first = setOrCall(data, 'first'),
			            last = setOrCall(data, 'last'),
			            limit = data.limit;
			        if (typeof limit != 'number') {
			            limit = Number.MAX_VALUE;
			        }
			        if (limit < 1) {
			            return this;
			        }
			        return this.listen(function(value) {
			            if (n === 0) {
			                first(value);
			            }
			            n++;
			            count(n);
			            last(value);
			            if (n >= limit) {
			                return true;
			            }
			        });
			    };
			
			    /*  Send a value into the pipeline without caring what emerges
			        (only useful if you set up monitors and/or intos, or
			        similar stateful observers).
			     */
			    function ignore() { }
			    Per.prototype.submit = function(value) {
			        return this.forEach(ignore, value);
			    };
			
			    Per.prototype.all = function() {
			        var results = [];
			        this.into(results).submit();
			        return results;
			    };
			
			    Per.prototype.first = function() {
			        var results = { limit: 1 };
			        this.monitor(results).submit();
			        return results.count > 0 ? results.first : (void 0);
			    };
			
			    Per.prototype.last = function() {
			        var results = {};
			        this.monitor(results).submit();
			        return results.count > 0 ? results.last : (void 0);
			    };
			
			    function truthy(value) { return !!value; }
			    Per.prototype.truthy = function() { return this.filter(truthy); };
			
			    function min(l, r) { return Math.min(l, r); }
			    Per.prototype.min = function() { return this.reduce(min, Number.MAX_VALUE); };
			
			    function max(l, r) { return Math.max(l, r); }
			    Per.prototype.max = function() { return this.reduce(max, Number.MIN_VALUE); };
			
			    function sum(l, r) { return l + r }
			    Per.prototype.sum = function() { return this.reduce(sum, 0); };
			
			    function and(l, r) { return !!(l && r) }
			    Per.prototype.and = function() { return this.reduce(and, true); };
			
			    function or(l, r) { return !!(l || r) }
			    Per.prototype.or = function() { return this.reduce(or, false); };
			
			    function not(v) { return !v }
			    Per.prototype.not = function() { return this.map(not); };
			
			    create.pulse = function(ms) {
			        var counter = 0;
			        return create(function(emit) {
			            function step() {
			                if (emit(counter++) !== true) {
			                    setTimeout(step, ms);
			                }
			            }
			            step();
			        });
			    };
			
			    exportFunction(create);
			
			})(function(per) {
			    if (typeof exports === 'undefined') {
			        this['per'] = per;
			    } else {
			        module.exports = per;
			    }
			});
		}
	}
})("carota/src/carota");

_.extend(carota, Backbone.Events);