define(function (require, exports, module) {
	var ComponentPlugin = require("ide-component-plugin"),
		HtmlComponent = HtmlComponent || ComponentPlugin.extend({
		init: function (options) {
			this._super(options);
			return this;
		},
		_blockOfText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac blandit erat. Curabitur velit libero, lacinia sit amet dolor a, tincidunt varius nisi. Integer ac magna bibendum, dignissim quam sed, commodo mauris. Aenean consequat ullamcorper felis ut sagittis. Quisque at magna a purus egestas suscipit. In vulputate tincidunt arcu non pulvinar. Pellentesque vitae leo et justo fringilla adipiscing sit amet eget lacus.",
		_lineOfText: "Lorem Ipsum Dolor Sit Amet",
		_getTextElementMarkup: function (tagName, forCode, singleLine, id) {
			return "<" + tagName + this._getContentEditable(forCode) + " id=\"" + id + "\">" + (singleLine ? this._lineOfText : this._blockOfText) + "</" + tagName + ">";
		},
		_getContentEditable: function (forCode) {
			return (forCode ? "" : " contenteditable=\"true\" spellcheck=\"false\"");
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
				return this._getTextElementMarkup("h1", forCode, true, descriptor.id);
			case "text":
				return this._getTextElementMarkup("p", forCode, false, descriptor.id);
			case "textarea":
				return this._getTextElementMarkup("textarea", forCode, false, descriptor.id);
			case "link":
				return this._getTextElementMarkup("a", forCode, true, descriptor.id);
			case "list":
				return "<ul" + this._getContentEditable(forCode) + " id=\"" + descriptor.id + "\"><li>Item 1</li><li>Item 2</li></ul>";
			case "container":
				if (forCode) {
					return "<div id=\"" + descriptor.id + "\"></div>";
				} else {
					return "<div " + this._getContentEditable(false) + " id=\"" + descriptor.id + "\"" + (forCode ? " style=\"min-width: 400px; min-height: 100px;\"" : "") + " data-droppablechild=\"true\"></div>";
				}
			case "button":
				return "<button" + this._getContentEditable(forCode) + " id=\"" + descriptor.id + "\">Button</button>";
			case "input":
				return "<input" + this._getContentEditable(forCode) + " id=\"" + descriptor.id + "\"/>";
			default:
				console.log("Unknown HTML element added: " + descriptor.type);
				return "";
			}
		},
		_getIndentTabs: function (descriptor) {
			var extraIndentStr = "", i = 0;
			if (descriptor.extraIndent) {
				for (i = 0; i < descriptor.extraIndent; i++) {
					extraIndentStr += "\t";
				}
			}
			return extraIndentStr;
		},
		getCodeEditorMarkupSnippet: function (descriptor) {
			var snippet, lineCount, extraMarkers;
			if (descriptor.type === "container") {
				snippet = "\t" + this._getIndentTabs(descriptor) + "<div id=\"" + descriptor.id + "\">\n\t" + this._getIndentTabs(descriptor) + "</div>\n";
				lineCount = 2;
				extraMarkers = [
					{ rowOffset: 0, colOffset: 1, rowCount: 2, colCount: 0 }
				];
			} else {
				snippet = "\t" + this._getIndentTabs(descriptor) + this.getMarkup(descriptor, true) + "\n";
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
			case "list":
				return true;
			case "input":
			case "textarea":
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
					return (value === "true") ? true : false;
				} else {
					return value !== null && value !== undefined ? value : "";
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

			// Update DOM
			window.frames[0].$(descriptor.placeholder).attr(descriptor.propName, descriptor.propValue);
			// Update Code Editor
			markers = descriptor.comp.htmlMarker.extraMarkers;
			markerPos = markers[descriptor.propName];
			if (markerPos) { // attribute already exist
				this.updateAttrCode(descriptor);
			} else { // attribute needs to be added
				descriptor.component = descriptor.comp;
				this.addAttrValue(descriptor);
			}
		},
		updateInnerHTML: function (descriptor) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.comp.htmlMarker,
				markers = htmlMarker.extraMarkers,
				propValue = descriptor.propValue,
				innerMarker = markers[descriptor.propName],
				startRow, startCol, endRow, endCol, startPos;

			// Update DOM
			descriptor.placeholder.html(propValue);

			// Update Code Editor
			if (!innerMarker) {
				// If the innerHTML marker doesn't exist, we create it
				startPos = ide.editor.find({
					needle: ">",
					start: htmlMarker.range.start
				});
				startRow = endRow = startPos.start.row;
				startCol = startPos.start.column + 1;
				endCol = ide.editor.find({
					needle: "</",
					start: htmlMarker.range.start
				}).start.column;
				innerMarker = ide.createAndAddMarker(startRow, startCol, endRow, endCol);
			} else {
				startRow = endRow = innerMarker.start.row;
				startCol = innerMarker.start.column;
			}
			ide.session.replace(innerMarker, propValue);
			ide.session.removeMarker(innerMarker.id);
			endCol = startCol + propValue.length;
			markers[descriptor.propName] = ide.createAndAddMarker(startRow, startCol, endRow, endCol);
		},
		updateTag: function (descriptor) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.comp.htmlMarker,
				markers = htmlMarker.extraMarkers,
				propValue = descriptor.propValue,
				nodeName = descriptor.placeholder[0].nodeName.toLowerCase(),
				startRow = htmlMarker.range.start.row,
				endRow = htmlMarker.range.end.row,
				endCol = htmlMarker.range.end.column + (propValue.length - nodeName.length) * 2,
				domElem = window.frames[0].$(descriptor.placeholder),
				attrs = {},
				newNodeHTML, newElem, start, end;
			
			// Update DOM
			$.each(domElem[0].attributes, function (index, currAttr) {
				attrs[currAttr.nodeName] = currAttr.nodeValue;
			});
			domElem.replaceWith(function () {
				newElem = $("<" + propValue + " />", attrs).append($(this).contents());
				return newElem;
			});
			this.settings.ide._selectComponent(newElem[0]);
			// Update Code Editor
			newNodeHTML = ide.session.getTextRange(htmlMarker.range);
			newNodeHTML = newNodeHTML.replace("<" + nodeName, "<" + propValue);
			newNodeHTML = newNodeHTML.replace("</" + nodeName, "</" + propValue);
			ide.session.replace(htmlMarker.range, newNodeHTML);
			ide.session.removeMarker(htmlMarker.id);
			descriptor.comp.htmlMarker.range = ide.createAndAddMarker(startRow, 0, endRow, endCol);
			descriptor.comp.htmlMarker.extraMarkers = markers;
			start = ide.editor.find({
				needle: "<",
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
		udpateEvent: function (descriptor) {
			var ide = this.settings.ide,
				component = ide.componentById(descriptor.id),
				evtName = descriptor.propName,
				eventString, handlerMarker, funcMarker, codeRange, offset;

			evtName = evtName.toLowerCase();
			if (!component.eventMarkers || !component.eventMarkers[descriptor.propName]) {
				if (ide._findEventMarkerComponent()) {
					codeRange = this._getLastEventMarker(ide._findEventMarkerComponent().eventMarkers);
					offset = codeRange.end.row + 1;
				} else if (ide._findCodeMarkerComponent()) {
					codeRange = ide._findCodeMarkerComponent().codeMarker.range;
					offset = codeRange.end.row;
				} else {
					codeRange = ide.editor.find("$(document).ready(function () {\n");
					offset = codeRange.end.row;
				}

				eventString = "\t\t\t\t$(\"#" + descriptor.id + "\").on(\"" + evtName + "\", function (event, args) {\n\t\t\t\t\t\n\t\t\t\t});\n";
				ide.session.insert({ row: offset, column: 0 }, eventString);
				handlerMarker = new ide.RangeClass(offset, 0, offset + 2, 3);
				funcMarker = new ide.RangeClass(offset, 0, offset + 2, 3);
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
			if (descriptor.propName === "id") {
				var comp = descriptor.ide.componentById(descriptor.oldPropValue);
				comp.id = descriptor.propValue;
				descriptor.placeholder.attr("id", descriptor.propValue);
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
			openTagEnd = ide.editor.find({
				needle: ">",
				start: htmlMarker.range.start
			});
			if (!openTagEnd) { // unary, such as <input />
				openTagEnd = closeTagEnd = ide.editor.find({
					needle: "/>",
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
					start: htmlMarker.range.start
				});
				closeTagEnd = ide.editor.find({
					needle: ">",
					backwards: true,
					start: htmlMarker.range.end
				});
				this._fixFind();
				ide.editor.selection.setSelectionRange({ start: openTagStart.start, end: closeTagEnd.end }, false);
			}
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
			var lastEventMarker = null;
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