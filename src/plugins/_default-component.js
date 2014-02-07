define(function (require, exports, module) {
  var ComponentPlugin = require("ide-component-plugin");
  var HtmlComponent = HtmlComponent || ComponentPlugin.extend({
    init: function (options) {
      this._super(options);
      return this;
    },
    _blockOfText: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac blandit erat. Curabitur velit libero, lacinia sit amet dolor a, tincidunt varius nisi. Integer ac magna bibendum, dignissim quam sed, commodo mauris. Aenean consequat ullamcorper felis ut sagittis. Quisque at magna a purus egestas suscipit. In vulputate tincidunt arcu non pulvinar. Pellentesque vitae leo et justo fringilla adipiscing sit amet eget lacus.",
    _lineOfText: "Lorem Ipsum Dolor Sit Amet",
    _getTextElementMarkup: function(tagName, forCode, singleLine, id) {
      return "<" + tagName + this._getContentEditable(forCode) + " id=\"" + id + "\">" + (singleLine ? this._lineOfText : this._blockOfText) +  "</" + tagName + ">"; 
    },
    _getContentEditable: function(forCode) {
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
    _getIndentTabs: function(descriptor) {
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
      return {codeString: snippet, lineCount: 1};
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
    updateComponent: function (descriptor) {

    }
  });
return HtmlComponent;
});