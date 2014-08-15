define(function (require, exports, module) {
	var ComponentPlugin = require("ide-component-plugin"),
		HtmlComponent = HtmlComponent || ComponentPlugin.extend({
		init: function (options) {
			this._super(options);
			return this;
		},
		_blockOfText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac blandit erat. Curabitur velit libero, lacinia sit amet dolor a, tincidunt varius nisi. Integer ac magna bibendum, dignissim quam sed, commodo mauris. Aenean consequat ullamcorper felis ut sagittis. Quisque at magna a purus egestas suscipit. In vulputate tincidunt arcu non pulvinar. Pellentesque vitae leo et justo fringilla adipiscing sit amet eget lacus.",
		_lineOfText: "Lorem Ipsum Dolor Sit Amet",
		_getTextElementMarkup: function (tagName, singleLine, id) {
			return "<" + tagName + " id=\"" + id + "\">" + (singleLine ? this._lineOfText : this._blockOfText) + "</" + tagName + ">";
		},
		isContentEditable: function (type) {
			if (type === "heading" || type === "text" || type === "textarea" || type === "link" || type === "list" || type === "container" || type === "button" || type === "input") {
				return true;
			} else {
				return false;
			}
		},
		getMarkup: function (descriptor, forCode) {
			switch (descriptor.type) {
			case "heading":
				return this._getTextElementMarkup("h1", true, descriptor.id);
			case "text":
				return this._getTextElementMarkup("p", false, descriptor.id);
			case "textarea":
				return this._getTextElementMarkup("textarea", false, descriptor.id);
			case "link":
				return this._getTextElementMarkup("a", true, descriptor.id);
			case "image":
				return "<img id=\"" + descriptor.id + "\" />";
			case "list":
				return "<ul" + " id=\"" + descriptor.id + "\"><li>Item 1</li><li>Item 2</li></ul>";
			case "container":
				if (forCode) {
					return "<div id=\"" + descriptor.id + "\"></div>";
				} else {
					return "<div " + " id=\"" + descriptor.id + "\"" + (forCode ? " style=\"min-width: 400px; min-height: 100px;\"" : "") + " data-droppablechild=\"true\"></div>";
				}
			case "button":
				return "<button" + " id=\"" + descriptor.id + "\">Button</button>";
			case "input":
				return "<input" + " id=\"" + descriptor.id + "\"/>";
			default:
				console.log("Unknown HTML element added: " + descriptor.type);
				return "";
			}
		},
		getCodeEditorMarkupSnippet: function (descriptor) {
			var snippet, lineCount, extraMarkers;
			if (descriptor.type === "container") {
				snippet = this.settings.ide._tabStr(descriptor.extraIndent + 1) + "<div id=\"" + descriptor.id + "\">\n\t" + this.settings.ide._tabStr(descriptor.extraIndent + 1) + "</div>\n";
				lineCount = 2;
				extraMarkers = [
					{ rowOffset: 0, colOffset: 0, rowCount: 2, colCount: 0 }
				];
			} else {
				snippet = this.settings.ide._tabStr(descriptor.extraIndent + 1) + this.getMarkup(descriptor, true) + "\n";
				lineCount = 1;
			}
			
			return { codeString: snippet, lineCount: lineCount, extraMarkers: extraMarkers };
		},
		isContainer: function (descriptor) {
			if (typeof (descriptor) === "undefined" || descriptor === null) {
				return false;
			}
			switch (descriptor.type) {
			case "heading":
			case "text":
			case "container":
			case "button":
			case "link":
				return true;
			case "input":
			case "textarea":
			case "list":
			case "image":
				return false;
			default:
				console.log("Unknown HTML element added.");
				return false;
			}
		},
		getPropValue: function (descriptor) {
			var isBool = (descriptor.propType === "bool" || descriptor.propType === "boolean"),
				value;
			switch (descriptor.propName) {
			case "innerHTML":
				value = descriptor.placeholder.html();
				value = value.replace(/</g, "&lt;");
				value = value.replace(/>/g, "&gt;");
				value = value.replace(/"/g, "'");
				return value;
			case "tagName":
				return descriptor.placeholder[0].tagName.toLowerCase();
			default:
				value = window.frames[0].$(descriptor.placeholder).attr(descriptor.propName);
				if (isBool) {
					return (value && value !== "false") ? true : false;
				} else {
					return value !== null && value !== undefined ? value : descriptor.defaultValue;
				}
			}
		},
		isDroppableChild: function (descriptor) {
			if (typeof (descriptor) === "undefined" || descriptor === null) {
				return false;
			}
			if (descriptor.nodeName && $(descriptor).attr("data-droppablechild") === "true") {
				return true;
			} else {
				return this.isContainer(descriptor);
			}
			return false;
		},
		hasDroppableChildren: function (descriptor) {
			if (typeof (descriptor) === "undefined" || descriptor === null) {
				return false;
			}
			if (descriptor.nodeName && $(descriptor).attr("data-hasdroppables") === "true") {
				return true;
			}
		},
		getDroppableChildren: function (descriptor) {
			if (typeof (descriptor) === "undefined" || descriptor === null) {
				return $();
			} else if (descriptor.nodeName) {
				return $(descriptor).find("div[data-droppablechild]");
			}
			return $();
		},
		update: function (descriptor) {
			if (descriptor.propType === "event") {
				this.udpateEvent(descriptor);
				return;
			}
			switch (descriptor.propName) {
			case "innerHTML":
				this.updateInnerHTML(descriptor);
				return;
			case "tagName":
				this.updateTag(descriptor);
				return;
			default:
				this.updateAttr(descriptor);
				return;
			}
		},
		updateAttr: function (descriptor) {
			var markers, markerPos;

			descriptor.component = descriptor.comp;
			// Update DOM
			window.frames[0].$(descriptor.placeholder).attr(descriptor.propName, descriptor.propValue);
			if (descriptor.propName === "reversed" || descriptor.propName === "checked") {
				// Bug in jQuery attr() with OL reversed option and checked
				window.frames[0].$(descriptor.placeholder)[0][descriptor.propName] = descriptor.propValue;
			} 
			// Update Code Editor
			markers = descriptor.comp.htmlMarker.extraMarkers;
			markerPos = markers[descriptor.propName];
			if (markerPos) { // attribute already exist
				if (markerPos.start.row === markerPos.end.row && markerPos.start.column === markerPos.end.column) {
					// If the marker is empty, it is deleted
					this.settings.ide.session.removeMarker(markerPos.id);
					delete markers[descriptor.propName];
					this.addAttrValue(descriptor);
				} else {
					this.updateAttrCode(descriptor);
				}
			} else { // attribute needs to be added
				this.addAttrValue(descriptor);
			}
		},
		updateInnerHTML: function (descriptor) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.comp.htmlMarker,
				markers = htmlMarker.extraMarkers,
				propValue = descriptor.propValue,
				innerMarker = markers[descriptor.propName],
				startRow, startCol, endMarker, endRow, endCol, startPos;

			// Update DOM
			descriptor.placeholder.html(propValue);

			// Update Code Editor
			if (!innerMarker) {
				// If the innerHTML marker doesn't exist, we create it
				startPos = ide.editor.find({
					needle: ">",
					range: htmlMarker.range,
					start: htmlMarker.range.start
				});
				startRow = startPos.start.row;
				startCol = startPos.start.column + 1;
				endMarker = ide.editor.find({
					needle: "</",
					range: htmlMarker.range,
					start: htmlMarker.range.start
				});
				this._fixFind();
				endRow = endMarker.start.row;
				endCol = startCol + propValue.length;
				if (descriptor.type === "container") {
					propValue = "\t" + propValue;
					ide.session.insert({ row: startRow + 1, column: 2 }, propValue);
					innerMarker = ide.createAndAddMarker(startRow + 1, 2, startRow + 1, 2 + propValue.length);
				} else {
					innerMarker = ide.createAndAddMarker(startRow, startCol, endRow, endMarker.start.column);
					ide.session.replace(innerMarker, propValue);
					ide.session.removeMarker(innerMarker.id);
					innerMarker = ide.createAndAddMarker(startRow, startCol, endRow, startCol + propValue.length);
				}
			} else {
				startRow = innerMarker.start.row;
				startCol = innerMarker.start.column;
				endRow = innerMarker.end.row;
				if (descriptor.type === "container") {
					propValue = "\t" + propValue;
				}
				endCol = startCol + propValue.length;
				ide.session.replace(innerMarker, propValue);
				ide.session.removeMarker(innerMarker.id);
				innerMarker = ide.createAndAddMarker(startRow, startCol, endRow, endCol);
			}
			markers[descriptor.propName] = innerMarker;
		},
		updateTag: function (descriptor) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.comp.htmlMarker,
				markers = htmlMarker.extraMarkers,
				propValue = descriptor.propValue,
				nodeName = descriptor.placeholder[0].nodeName.toLowerCase(),
				tagMargin = propValue.length - nodeName.length,
				startRow = htmlMarker.range.start.row,
				endRow = htmlMarker.range.end.row,
				endCol = htmlMarker.range.end.column + (propValue.length - nodeName.length) * 2,
				domElem = window.frames[0].$(descriptor.placeholder),
				attrs = {},
				newNodeHTML, newElem, start, end, extraMarkersRanges, newExtraMarkers;
			
			// Update DOM
			$.each(domElem[0].attributes, function (index, currAttr) {
				attrs[currAttr.nodeName] = currAttr.nodeValue;
			});
			domElem.replaceWith(function () {
				newElem = $("<" + propValue + " />", attrs).append($(this).contents());
				return newElem;
			});
			this.settings.ide._selectComponent(newElem[0]);
			extraMarkersRanges = this._saveHTMLExtraMarkersRanges(markers, tagMargin);
			// Update Code Editor
			newNodeHTML = ide.session.getTextRange(htmlMarker.range);
			newNodeHTML = newNodeHTML.replace("<" + nodeName, "<" + propValue);
			newNodeHTML = newNodeHTML.replace("</" + nodeName, "</" + propValue);
			ide.session.replace(htmlMarker.range, newNodeHTML);
			ide.session.removeMarker(htmlMarker.id);
			descriptor.comp.htmlMarker.range = ide.createAndAddMarker(startRow, 0, endRow, endCol);
			descriptor.comp.htmlMarker.extraMarkers = this._updateHTMLExtraMarkers(extraMarkersRanges);
			start = ide.editor.find({
				needle: "<",
				range: htmlMarker.range,
				start: htmlMarker.range.start
			}).start;
			end = ide.editor.find({
				needle: ">",
				backwards: true,
				range: htmlMarker.range,
				start: htmlMarker.range.start
			}).end;
			this._fixFind();
			ide.editor.selection.setSelectionRange({ start: start, end: end }, false);
		},
		_saveHTMLExtraMarkersRanges: function (markers, tagMargin) {
			var ranges = {},
				marker, markerName;
			for (markerName in markers) {
				marker = markers[markerName];
				if (marker && marker.start) {
					ranges[markerName] = { id: marker.id, sr: marker.start.row, sc: marker.start.column + tagMargin, er: marker.end.row, ec: marker.end.column + tagMargin }
				} else {
					ranges[markerName] = markers[markerName];
				}
			}
			return ranges;
		},
		_updateHTMLExtraMarkers: function (ranges) {
			var ide = this.settings.ide,
				newMarkers = {},
				range, rangeName;
			for (rangeName in ranges) {
				range = ranges[rangeName];
				if (range && range.sr) {
					newMarkers[rangeName] = ide.createAndAddMarker(range.sr, range.sc, range.er, range.ec);
					ide.session.removeMarker(range.id);
				} else {
					newMarkers[rangeName] = ranges[rangeName];
				}
			}
			return newMarkers;
		},
		udpateEvent: function (descriptor) {
			var ide = this.settings.ide,
				component = ide.componentById(descriptor.id),
				evtName = descriptor.propName,
				eventString, handlerMarker, funcMarker, codeRange, offset;

			evtName = evtName.toLowerCase();
			if (!component.eventMarkers || !component.eventMarkers[descriptor.propName]) {
				if (ide._findEventMarkerComponent()) {
					codeRange = this._getLastEventMarker(ide._findEventMarkerComponent().eventMarkers);
					offset = codeRange.end.row;
				} else if (ide._findCodeMarkerComponent()) {
					codeRange = ide._findCodeMarkerComponent().codeMarker.range;
					offset = codeRange.end.row;
				} else {
					codeRange = ide.editor.find("$(document).ready(function () {\n");
					offset = codeRange.end.row;
				}

				eventString = "\t\t\t\t$(\"#" + descriptor.id + "\").on(\"" + evtName + "\", function (event, args) {\n\t\t\t\t\t\n\t\t\t\t});\n";
				ide.session.insert({ row: offset, column: 0 }, eventString);
				handlerMarker = new ide.RangeClass(offset, 0, offset + 3, 0);
				funcMarker = new ide.RangeClass(offset + 2, 0, offset + 2, 5);
				ide.addMarker(handlerMarker);
				ide.addMarker(funcMarker);
				if (!component.eventMarkers) {
					component.eventMarkers = {};
				}
				component.eventMarkers[descriptor.propName] = {
					"handlerMarker": handlerMarker,
					"functionBodyMarker": funcMarker
				};
			} else {
				funcMarker = component.eventMarkers[descriptor.propName].functionBodyMarker;
			}
			ide._deselectComponent();
			ide.element.find(".code-button").click();
			ide.editor.clearSelection();
			ide.editor.gotoLine(funcMarker.end.row, 8, true);
		},
		getPropPosition: function (descriptor) {
			var ide = this.settings.ide,
				pos = descriptor.component.htmlMarker.range,
				isBool = (descriptor.propType === "bool" || descriptor.propType === "boolean"),
				marker, markers, markerPos, selRange;

			if (descriptor.propName === "tagName") {
				return { preserveSelection: true };
			}
			markers = descriptor.component.htmlMarker.extraMarkers;
			markerPos = markers[descriptor.propName];
			if (markerPos) { // marker already exist
				pos.row = markerPos.end.row;
				pos.column = markerPos.end.column;
			} else { // attribute needs to be added
				marker = this.addAttrValue(descriptor);
				pos.row = marker.end.row;
				pos.column = marker.end.column;
			}
			if (descriptor.defaultValue === "") {
				pos.column -= 1;
			} else {
				selRange = ide.editor.find({
					needle: isBool ? descriptor.propName + "" : descriptor.defaultValue + "",
					start: markerPos.start
				});
			}
			return { position: pos, selectionRange: selRange };
		},
		universalPropertyModified: function (descriptor) {
			var ide = this.settings.ide,
				event, result;
			if (descriptor.propName === "id") {
				//var comp = descriptor.ide.componentById(descriptor.oldPropValue);
				var events = descriptor.comp.eventMarkers;
				if (events) {
					for (event in events) {
						if (events.hasOwnProperty(event)) {
							result = ide.editor.find({
								needle: /\$\("#(.*)?"\)/,
								start: events[event].handlerMarker.start,
								$isMultiLine: false
							});
							if (result) {
								this.settings.ide.session.replace(result, "$(\"#" + descriptor.propValue + "\")");
							}
						}
					}
				}
				descriptor.comp.id = descriptor.propValue;
				window.frames[0].$(descriptor.placeholder).attr("id", descriptor.propValue);
			} else if (descriptor.propName === "class") {
				window.frames[0].$(descriptor.placeholder).removeClass(descriptor.oldPropValue).addClass(descriptor.propValue);
			}
		},
		addAttrValue: function (descriptor) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.component.htmlMarker,
				pos = htmlMarker.range,
				markers = htmlMarker.extraMarkers,
				isBool = (descriptor.propType === "bool" || descriptor.propType === "boolean"),
				propValue = descriptor.propValue,
				attrStr, newRow, newCol, openTagStart, openTagEnd, closeTagStart, closeTagEnd;

			if (isBool && propValue === false) {
				return pos;
			}
			attrStr = (isBool && propValue === true) ? " " + descriptor.propName : " " + descriptor.propName + "=\"" + propValue + "\"";
			openTagEnd = ide.editor.find({ // unary, such as <input />
				needle: "/>",
				range: htmlMarker.range,
				start: htmlMarker.range.start
			});
			if (!openTagEnd) { 
				openTagEnd = closeTagEnd = ide.editor.find({
					needle: ">",
					range: htmlMarker.range,
					start: htmlMarker.range.start
				});
			}
			if (openTagEnd) {
				newRow = openTagEnd.start.row;
				newCol = openTagEnd.start.column;
				ide.session.insert({ row: newRow, column: newCol }, attrStr);
				pos = markers[descriptor.propName] = ide.createAndAddMarker(
					newRow,
					newCol,
					newRow,
					newCol + attrStr.length - 1
				);
				openTagStart = ide.editor.find({
					needle: "<",
					range: htmlMarker.range,
					start: htmlMarker.range.start
				});
				closeTagEnd = ide.editor.find({
					needle: ">",
					backwards: true,
					range: htmlMarker.range,
					start: htmlMarker.range.end
				});
				ide.editor.selection.setSelectionRange({ start: openTagStart.start, end: closeTagEnd.end }, false);
			}
			this._fixFind();
			return pos;
		},
		updateAttrCode: function (descriptor) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.comp.htmlMarker,
				markers = htmlMarker.extraMarkers,
				currMarker = markers[descriptor.propName],
				pos = currMarker,
				attrName = descriptor.propName,
				newValue = descriptor.propValue,
				propValue = this.getPropValue(descriptor),
				isBool = (descriptor.propType === "bool" || descriptor.propType === "boolean"),
				toRemoveBoolAttr = (isBool && propValue === false),
				attrStr = isBool ? toRemoveBoolAttr ? "" : " " + attrName : " " + attrName + "=\"" + newValue + "\"",
				startRow, startCol, endRow, endColumn;

			startRow = currMarker.start.row;
			startCol = currMarker.start.column;
			endRow = currMarker.end.row;
			endColumn = currMarker.start.column + attrStr.length;
			currMarker.end.column += 1; // hack
			ide.session.replace(currMarker, attrStr);
			//Reattach the marker
			ide.session.removeMarker(currMarker.id);
			if (!toRemoveBoolAttr) {
				markers[attrName] = pos = ide.createAndAddMarker(startRow, startCol, endRow, endColumn - 1);
			} else {
				delete markers[attrName];
			}
		},
		_getLastEventMarker: function (eventMarkers) {
			var lastEventMarker = null, event;
			for (event in eventMarkers) {
				if (lastEventMarker === null) {
					lastEventMarker = eventMarkers[event].handlerMarker;
				} else {
					if (eventMarkers[event].handlerMarker.end.row > lastEventMarker.end.row) {
						lastEventMarker = eventMarkers[event].handlerMarker;
					}
				}
			}
			return lastEventMarker;
		},
		_fixFind: function () {
			this.settings.ide.editor.$search.set({ backwards: false, range: undefined });
		}
	});
	return HtmlComponent;
});