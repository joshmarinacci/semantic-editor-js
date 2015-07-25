/**
 * Created by josh on 7/25/15.
 */
var utils = {
    getJSON: function(url,cb) {
        var url = "http://localhost:39865"+url;
        console.log("loading posts from",url);
        var xml = new XMLHttpRequest();
        var self = this;
        xml.onreadystatechange = function(e) {
            if(this.readyState == 4 && this.status == 200) {
                cb(xml.response);
            }
        };
        xml.responseType = 'json';
        xml.open("GET",url);
        xml.send();
    },
    postJSON: function(url,cb) {
        var url = "http://localhost:39865"+url;
        console.log("loading posts from",url);
        var xml = new XMLHttpRequest();
        var self = this;
        xml.onreadystatechange = function(e) {
            if(this.readyState == 4 && this.status == 200) {
                cb(xml.response);
            }
        };
        xml.responseType = 'json';
        xml.open("POST",url);
        xml.send();
    },
    toClass:function(def, cond) {
        var str = def.join(" ");
        for(var name in cond) {
            if(cond[name] === true) {
                str += " " + name
            }
        }
        return str;
    }
};
module.exports = utils;