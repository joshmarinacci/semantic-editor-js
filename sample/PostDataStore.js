/**
 * Created by josh on 8/12/15.
 */
var Model = require('../src/model');
var Editor = require('../src/editor');

var editor = Editor.makeEditor();
var model = editor.getModel();
var block1 = model.makeBlock();
var text1 = model.makeText("This is a document header");
block1.append(text1);
block1.style = 'header';
model.append(block1);

var block2 = model.makeBlock();
block2.append(model.makeText("This is a paragraph of text. It can have plain text or styled text. "));
var span1 = model.makeSpan();
span1.style = 'strong';
span1.append(model.makeText("This is some strong text (also called 'bold'). "));
block2.append(span1);
var span2 = model.makeSpan();
span2.style = 'emphasis';
span2.append(model.makeText("This is some emphasized text (also called 'italic'). "));
block2.append(span2);
var span3 = model.makeSpan();
span3.style = 'inline-code';
span3.append(model.makeText("And this is some inline code. "));
block2.append(span3);

block2.append(model.makeText("And now we are back to some regular plain body text. "));
block2.append(model.makeText("You can select some text and use the inline dropdown to change it's style. "))
block2.append(model.makeText("Notice how each block has a type along the right edge. This lets you know what block type you are editing. "));
model.append(block2);

var block2a = model.makeBlock();
block2a.append(model.makeText(
    "Use the toolbar to switch from semantic mode to visual mode, or invent your own mode. "
    +"Note that in visual mode you are still editing semantically, it just looks different."
));
model.append(block2a);


var block3 = model.makeBlock();
block3.style = 'subheader';
block3.append(model.makeText("Custom Actions"));
model.append(block3);

var block4 = model.makeBlock();
block4.style = 'body';
block4.append(model.makeText("You can change the keybindings or add new actions. For example, you could treat the 'enter' key differently in different kinds of blocks. "));
block4.append(model.makeText("In a regular body block the 'enter' key will create a new paragraph. Try it now. "));
model.append(block4);

var block5 = model.makeBlock();

block5.style="block-code";
block5.append(model.makeText("console.log('However; a code block is special.');\n"+
    "//It contains actual newlines\n"
    +"//that are rendered as line breaks.\n"
    +"//if you press the 'enter' it will insert a newline\n\n"
    +"but.not.make(a.new.Block);\n"
));
model.append(block5);

var block6 = model.makeBlock();
block6.style = 'block-quote';
block6.append(model.makeText("This is a block quote. I'm pretty sure that somebody really, really famous wrote it."));
model.append(block6);

var block7 = model.makeBlock();
block7.style = 'subheader';
block7.append(model.makeText("Custom Styles"));
model.append(block7);

var block8 = model.makeBlock();
block8.append(model.makeText("The default styles are just that: a default. You can add or remove any style you choose. "));
block8.append(model.makeText("Use whatever styles make sense for your application. They don't have to be HTML 5 styles. "));
block8.append(model.makeText("Use whatever you want then export it to JSON or semantic HTML as you wish. "));
model.append(block8);




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