/**
 * Created by karthik on 8/3/16.
 */

function List(options) {

    var _self = this;

    _self.name = options.name;

    var parentDiv = _self.parentDiv = "content-left";

    var contentDiv = _self.contentDiv = Feedback.addProgressBar(parentDiv, _self);

    _self.stopFlag = false;
    _self.pauseFlag = false;

    Feedback.addControlMinimize(parentDiv, _self);

    _self.textContentDiv = d3.select('#' + contentDiv).append("div")
        .style("width", "calc(100% - 10px)")
        .style("height", "100%")
        .style("display", "inline-block")
        .style("padding-right", "2px")
        .style("float", "left");

    _self.scrollBar = d3.select('#' + contentDiv).append("div")
        .style("width", "6px")
        .style("height", "0px")
        .style("display", "none")
        .style("float", "right")
        .style("background-color", "#EEE")
        .style("border", "1px solid #AAA")
        .style("opacity", "0.3");

    _self.divHeight = $('#' + contentDiv).height() - 10;

    _self.currentHeight = 0;

    _self.lastTextId = 0;

    _self.listIDStack = [];
}


List.prototype.pause = function () {
    var _self = this;
    _self.pauseFlag = !_self.pauseFlag;
    socket.send(wrapMessage("pause interface", _self.name));
    if (_self.pauseFlag) {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#pause").style("background-image", 'url("/images/pause.png")');
    }
}

List.prototype.stop = function () {
    var _self = this;
    _self.stopFlag = !_self.stopFlag;
    if (_self.stopFlag) {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/play.png")');
    } else {
        _self.miniControlDiv.select("#stop").style("background-image", 'url("/images/stop.png")');
    }
}

List.prototype.forward = function () {
    var _self = this;

}

List.prototype.rewind = function () {
    var _self = this;

}


List.prototype.requestData = function (cache) {

    var _self = this;

}

List.prototype.draw = function (cache) {

    var _self = this;

    var chunkId = cache["id"];
    var tweetChunk = cache["content"];
    var progress = cache["absolute-progress"];

    if (!_self.pauseFlag) {

        _self.removedHeight = 0;

        _self.scrollBar
            .style("display", "none");

        Feedback.updateProgressBar(_self, progress);

        _self.textContentDiv.selectAll(".textContent")
            .style("background-color", "white");

        tweetChunk.forEach(function (textData, i) {

            // Adding tweet to the list
            var textId = textData["id"];

            if (!isNaN(textData["sentiment"]) && textData["sentiment"] > 0) {

                sentiment = textData["sentiment"] - 1;

            } else if (isNaN(textData["sentiment"]) && emotions.indexOf(textData["sentiment"]) >= 0) {

                //means its a string
                sentiment = emotions.indexOf(textData["sentiment"]);
            }

            var currentTextDiv = _self.textContentDiv.insert("div", ":first-child")
                .attr("id", "list" + textId)
                .style("background-color",
                    "rgba(" + colors[sentiment] + ",0.5)")
                .style("margin", "2px")
                .append("div")
                .attr("class", "textContent")
                .style("background-color",
                    "rgba(" + "240, 240, 240" + ",1)")
                .style("margin-left", "10px")
                .style("font-size", "12px")
                .style("padding-left", "2px")
                .style("width", "100%");

            var words = textData["content"].split(" ");
            words.unshift(textData["author"] + ":");

            var textWeight = d3.scaleLinear().range(500, 900);
            if ("keywords" in cache) {
                textWeight.domain(d3.extent(Object.keys(cache["keywords"]), function (key) {
                    return cache["keywords"][key];
                }))
            }
            words.forEach(function (word, i) {
                currentTextDiv.append("span")
                    .text(word + " ")
                    .style("font-weight", function () {
                        if ("keywords" in cache) {
                            var keys = Object.keys(cache["keywords"]);
                            tWord = word.replace("@", "").replace("#", "").replace(":", "").toLowerCase();
                            if (keys.indexOf(tWord) >= 0) {
                                return textWeight(cache["keywords"][tWord]);
                            } else {
                                return 100;
                            }
                        }
                    });
            });


            _self.listIDStack.push("list" + textId);

            _self.currentHeight = _self.currentHeight + $("#list" + textId).height();

            //if current height is higher than maximum height then delete elements
            while (_self.currentHeight > _self.divHeight) {

                _self.currentHeight = _self.currentHeight - $("#" + _self.listIDStack[0]).height();

                _self.removedHeight = _self.removedHeight + $("#" + _self.listIDStack[0]).height();

                _self.textContentDiv.select("#" + _self.listIDStack.shift()).remove();

            }
        });

        _self.scrollBar.style("display", "inline-block")
            .transition().duration("10")
            .style("height", (_self.divHeight * _self.divHeight / (_self.divHeight + _self.removedHeight)) + "px");

    }
}


List.prototype.highlight = function (cache) {

    var _self = this;

    var chunkId = cache["id"];
    var tweetChunk = cache["content"];

    _self.textContentDiv.selectAll("div").remove();
    _self.currentHeight = 0;
    _self.listIDStack = [];

    _self.textContentDiv.selectAll(".textContent")
        .style("background-color", "white");

    tweetChunk.forEach(function (textData, i) {
        // Adding tweet to the list
        var textId = textData["id"];

        var sentiment = 0;

        if (!isNaN(textData["sentiment"]) && textData["sentiment"] > 0) {

            sentiment = textData["sentiment"] - 1;

        } else if (isNaN(textData["sentiment"]) && emotions.indexOf(textData["sentiment"]) >= 0) {

            //means its a string
            sentiment = emotions.indexOf(textData["sentiment"]);
        }

        var currentTextDiv = _self.textContentDiv.insert("div", ":first-child")
            .attr("id", "list" + textId)
            .style("background-color",
                "rgba(" + colors[sentiment] + ",0.5)")
            .style("margin", "2px")
            .append("div")
            .attr("class", "textContent")
            .style("background-color",
                "rgba(" + "230, 230, 230" + ",1)")
            .style("margin-left", "10px")
            .style("font-size", "12px")
            .style("padding-left", "2px")
            .style("width", "100%");

        var words = textData["content"].split(" ");
        words.unshift(textData["author"] + ":");

        words.forEach(function (word) {
            currentTextDiv.append("span").text(word);
        });

        var textWeight = d3.scaleLinear().range(500, 900);
        if ("keywords" in cache) {
            textWeight.domain(d3.extent(Object.keys(cache["keywords"]), function (key) {
                return cache["keywords"][key];
            }))
        }
        words.forEach(function (word, i) {
            currentTextDiv.append("span")
                .text(word + " ")
                .style("font-weight", function () {
                    if ("keywords" in cache) {
                        var keys = Object.keys(cache["keywords"]);
                        tWord = word.replace("@", "").replace("#", "").replace(":", "").toLowerCase();
                        if (keys.indexOf(tWord) >= 0) {
                            return textWeight(cache["keywords"][tWord]);
                        } else {
                            return 100;
                        }
                    }
                });
        });

        _self.listIDStack.push("list" + textId);

        _self.currentHeight = _self.currentHeight + $("#list" + textId).height();

        //if current height is higher than maximum height then delete elements
        if (_self.currentHeight > _self.divHeight) {

            _self.textContentDiv.select("#" + _self.listIDStack.shift()).remove();

            _self.currentHeight = _self.divHeight;

        }
    });

}