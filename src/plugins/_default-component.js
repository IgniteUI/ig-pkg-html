define(function (require, exports, module) {
  var ComponentPlugin = require("ide-component-plugin");
  var HtmlComponent = HtmlComponent || ComponentPlugin.extend({
    init: function (options) {
      this._super(options);
      return this;
    },
    getMarkup: function (descriptor) {
      var code = "", i;
      switch (descriptor.type) {
        case "header":
          return "<h1>Lorem Ipsum Dolor Sit Amet</h1>"
          break;
        case "paragraph":
          return "<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ac blandit erat. Curabitur velit libero, lacinia sit amet dolor a, tincidunt varius nisi. Integer ac magna bibendum, dignissim quam sed, commodo mauris. Aenean consequat ullamcorper felis ut sagittis. Quisque at magna a purus egestas suscipit. In vulputate tincidunt arcu non pulvinar. Pellentesque vitae leo et justo fringilla adipiscing sit amet eget lacus.</p>";
          break;
        default:
          console.log("Unknown HTML element added.");
          return "";
          break;
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
      var snippet = "\t\t" + this._getIndentTabs(descriptor) + this.getMarkup(descriptor) + "\n";
      return {codeString: snippet, lineCount: 1};
    },
    isContainer: function (descriptor) {
      if (typeof (descriptor) === "undefined" || descriptor === null) {
        return false;
      }
      switch (descriptor.type) {
        case "header":
        case "paragraph":
          return true;
          break;
        default:
          console.log("Unknown HTML element added.");
          return false;
          break;
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
    }
  });
  return HtmlComponent;
});