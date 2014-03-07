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
					return "<div class=\"containerElement\"" + this._getContentEditable(false) + " id=\"" + descriptor.id + "\"></div>";
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
			var snippet = "\t" + this._getIndentTabs(descriptor) + this.getMarkup(descriptor, true) + "\n";
			return { codeString: snippet, lineCount: 1 };
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
			var value = descriptor.placeholder[0].getAttribute(descriptor.propName),
				isBool = (descriptor.propType === "bool" || descriptor.propType === "boolean"),
				isEnum = descriptor.valueOptions !== undefined && descriptor.valueOptions.length > 1;
			if (isBool) {
				return (value === "true") ? true : false;
			}
			if (isEnum && value === null) {
				return descriptor.defaultValue;
			}
			return value;
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
			var markers, markerPos, propValue;

			// Update the element in the designer
			descriptor.placeholder[0].setAttribute(descriptor.propName, descriptor.propValue);
			// Update the element in the code view
			propValue = this.getPropValue(descriptor);
			if (propValue === undefined || propValue === null) {
				return;
			}
			if (descriptor.propName === "innerHTML") {
				this.updateInnerHTML(descriptor);
				return;
			}
			if (descriptor.propName === "tagName" || descriptor.propName === "headingLevel") {
				this.updateTag(descriptor);
				return;
			}
			markers = descriptor.comp.htmlMarker.extraMarkers;
			markerPos = markers[descriptor.propName];
			if (markerPos) { // attribute already exist
				this.updateAttrCode(descriptor);
			} else { // attribute needs to be added
				this.addAttrCode(descriptor);
			}
		},
		getPropPosition: function (descriptor) {
			var pos, markers, markerPos;

			markers = descriptor.component.htmlMarker.extraMarkers;
			markerPos = markers[descriptor.propName];
			if (markerPos) { // marker already exist
				pos = markerPos;
			} else { // attribute needs to be added
				pos = this.getAttrPosition(descriptor);
			}
			return pos;
		},
		getAttrPosition: function (descriptor) {
			var marker = this.addAttrValue(descriptor, "");

			descriptor.comp = descriptor.component;
			return { position: marker, selectionRange: marker };
		},
		addAttrCode: function (descriptor) {
			this.addAttrValue(descriptor, this.getPropValue(descriptor));
		},
		addAttrValue: function (descriptor, propValue) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.comp.htmlMarker,
				pos = htmlMarker,
				markers = htmlMarker.extraMarkers,
				isBool = (descriptor.propType === "bool" || descriptor.propType === "boolean"),
				attrStr, newRow, newCol, markerPos;

			if (isBool && propValue === false) {
				return;
			}
			attrStr = (isBool && propValue === true) ? " " + descriptor.propName : " " + descriptor.propName + "=\"" + propValue + "\"";
			markerPos = ide.editor.find({
				needle: ">",
				start: htmlMarker.range.start
			});
			if (!markerPos) { // unary, such as <input />
				markerPos = ide.editor.find({
					needle: "/>",
					start: htmlMarker.range.start
				});
			}
			if (markerPos) {
				newRow = markerPos.start.row;
				newCol = markerPos.start.column;
				ide.session.insert({ row: newRow, column: newCol }, attrStr);
				pos = markers[descriptor.propName] = ide.createAndAddMarker(
					newRow,
					newCol + 1,
					newRow,
					newCol + attrStr.length
				);
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
				attrStr = toRemoveBoolAttr ? "" : "" + attrName + "=\"" + newValue + "\"",
				startRow, startCol, endRow, endColumn;

			startRow = currMarker.start.row;
			startCol = currMarker.start.column;
			endRow = currMarker.end.row;
			endColumn = currMarker.start.column + attrName.length + newValue.length + 3;
			ide.session.replace(currMarker, attrStr);
			//Reattach the marker
			ide.session.removeMarker(currMarker.id);
			if (!toRemoveBoolAttr) {
				markers[attrName] = pos = ide.createAndAddMarker(startRow, startCol, endRow, endColumn);
			}
		},
		updateInnerHTML: function (descriptor) {
			var ide = this.settings.ide,
				htmlMarker = descriptor.comp.htmlMarker,
				markers = htmlMarker.extraMarkers,
				propValue = this.getPropValue(descriptor),
				innerMarker = markers[descriptor.propName],
				startRow, startCol, endRow, endCol, startPos;

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
				propValue = this.getPropValue(descriptor),
				nodeName = descriptor.placeholder[0].nodeName.toLowerCase(),
				startRow = htmlMarker.range.start.row,
				startCol = htmlMarker.range.start.col,
				endRow = htmlMarker.range.end.row,
				endCol = htmlMarker.range.end.col + (propValue.length - nodeName.length) * 2,
				domElem = window.frames[0].$(descriptor.placeholder),
				attrs = {},
				newNodeHTML;
			
			// Update Node in DOM
			$.each(domElem[0].attributes, function (index, currAttr) {
				attrs[currAttr.nodeName] = currAttr.nodeValue;
			});
			domElem.replaceWith(function () {
				return $("<" + propValue + " />", attrs).append($(this).contents());
			});
			// Update Node HTML in Code Editor
			newNodeHTML = ide.session.getTextRange(htmlMarker.range);
			newNodeHTML = newNodeHTML.replace("<" + nodeName, "<" + propValue);
			newNodeHTML = newNodeHTML.replace("</" + nodeName, "</" + propValue);
			ide.session.replace(htmlMarker.range, newNodeHTML);
			ide.session.removeMarker(htmlMarker.id);
			descriptor.comp.htmlMarker.range = ide.createAndAddMarker(startRow, startCol, endRow, endCol);
			descriptor.comp.htmlMarker.extraMarkers = markers;
		}
	});
	return HtmlComponent;
});