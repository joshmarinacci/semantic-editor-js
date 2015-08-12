/**
 * Created by josh on 8/12/15.
 */
var Model = require('../src/model');
var Editor = require('../src/editor');

var editor = Editor.makeEditor();
var model = editor.getModel();
var block1 = model.makeBlock();
var text1 = model.makeText("This is an empty post. please create a new one.");
block1.append(text1);
model.append(block1);




var std_styles = {
    block:{
        //name of style : css classname
        header:'header',
        subheader:'subheader',
        body:'body',
        'block-code':'block-code',
        'block-quote':'block-quote'
    },
    inline: {
        strong:'strong',
        emphasis:'emphasis',
        'inline-code':'inline-code',
        link:'link',
        subscript:'subscript',
        superscript:'superscript'
    }
};

model.setStyles(std_styles);
exports.getRealEditor = function() {
    return editor;
}
exports.getModel = function() {
    return model;
};