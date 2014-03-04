define(function (require, exports, module) {
	var ComponentPlugin = require("ide-component-plugin");
	var HtmlComponent = HtmlComponent || ComponentPlugin.extend({
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
		getMarkup: function (descriptor, forCode) {
			switch (descriptor.type) {
				case "heading":
					return this._getTextElementMarkup("h1", forCode, true, descriptor.id);
				case "paragraph":
					return this._getTextElementMarkup("p", forCode, false, descriptor.id);
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
				case "paragraph":
				case "container":
				case "button":
				case "link":
				case "list":
					return true;
				case "input":
					return false;
				default:
					console.log("Unknown HTML element added.");
					return false;
			}
		},
		getPropValue: function (descriptor) {
			return descriptor.placeholder[0][descriptor.propName];
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
			// Update the element in the designer
			descriptor.placeholder[0][descriptor.propName] = descriptor.propValue;

			var ide = this.settings.ide;
			var htmlMarker = descriptor.comp.htmlMarker;
			var propStr = "";
			var pos = { row: 0, column: 0 };

			if (descriptor.propName.toLowerCase() === "innerhtml") {
				this.updateInnerHTML();
			} else {
				/*if (true) {
					// propStr += ide._tabStr(1);
					propStr += descriptor.propName + "=\"" + descriptor.propValue + "\"";
					pos.row = htmlMarker.range.start.row;
					pos.column = propStr.length - 1;
					ide.session.insert({ row: pos.row, column: 20 }, propStr);
					ide.createAndAddMarker(pos.row, 0, pos.row + propStr.length - 1, propStr.length - 1);
					// options[descriptor.propName].marker = omarker;

					this.addAttrCode();
				} else {
					this.updateAttrCode();
				}*/
			}
		},
		addAttrCode: function () {

		},
		updateAttrCode: function () {

		},
		getPropPosition: function (descriptor) {
			var pos = { row: 0, column: 0 };
			var ide = this.settings.ide;
			var htmlMarker = descriptor.component.htmlMarker;
			var attrs = htmlMarker.extraMarkers;
			var attrName = " " + descriptor.propName + "=";
			var attrStr = attrName + "\"" + descriptor.propValue + "\"";

			var attrPos = attrs[descriptor.propName];
			if (attrPos) { // attribute already exist

			} else { // attribute needs to be added
				var attrPos = ide.editor.find({
					needle: ">",
					start: htmlMarker.range.start
				});
				if (!attrPos) { // unary, such as <input />
					attrPos = ide.editor.find({
						needle: "/>",
						start: htmlMarker.range.start
					});
				}
				if (attrPos) {
					var newRow = attrPos.start.row;
					var newCol = attrPos.start.column;
					ide.session.insert({ row: newRow, column: newCol }, attrStr);
					attrs[descriptor.propName] = pos = ide.createAndAddMarker(
						newRow,
						newCol + 1,
						newRow,
						newCol + attrStr.length - 1
					);
				}
			}
			return pos;
		}
	});
	return HtmlComponent;
});