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

    _self.measureArray = [];
    _self.measures = {};

    //chunk size
    var measure = {
        min: 5,
        max: 200,
        default: 10,
        name: "Chunk Size",
        index: "chunkSize",
        step: 5,
        value: 10
    }
    _self.measureArray.push(measure);
    _self.measures[measure["index"]] = measure;

    //updates
    var measure = {
        min: 1,
        max: 10,
        default: 1,
        name: "Waiting time (Sec)",
        index: "updates",
        step: 1,
        value: 1
    };
    _self.measureArray.push(measure);
    _self.measures[measure["index"]] = measure;

    _self.optionsArray = [];
    _self.options = {};

    var option = {
        name: "Absolute Progress",
        index: "absolute",
        children: [
            {
                name: "Tweets Read",
                index: "lines"
            },
            {
                name: "Bytes Read",
                index: "bytes"
            }
        ]
    }

    _self.optionsArray.push(option);
    _self.options[option["index"]] = option["children"][0]["index"];

    var option = {
        name: "Relative Progress",
        index: "relative",
        children: [
            {
                name: "Keyword Consistency",
                index: "information"
            },
            {
                name: "Speed",
                index: "speed"
            }
        ]
    }

    _self.optionsArray.push(option);
    _self.options[option["index"]] = option["children"][0]["index"];

    if (!controlInterface) {
        Feedback.addControlMinimize(parentDiv, _self);
    }

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
        .style("background-color", "#999")
        .style("border", "0px solid #999")
        .style("opacity", "0.3");

    _self.divHeight = $('#' + contentDiv).height();

    _self.currentHeight = 0;

    _self.lastTextId = 0;

    _self.listIDStack = [];
    _self.listDataStack = [];
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

List.prototype.draw = function (cache, override) {

    var _self = this;

    var chunkId = cache["id"];
    var tweetChunk = cache["content"];

    var t = d3.transition()
        .duration(30);

    tweetChunk = tweetChunk.sort(function(a, b) {
          return (new Date(b["time"])).getTime() - (new Date(a["time"])).getTime();
    });


    if (!_self.pauseFlag || override) {

        _self.removedHeight = 0;

        _self.scrollBar.style("display", "inline-block")
            .style("height", _self.divHeight + "px");

        if (Object.keys(cache).indexOf("progress-histories") >= 0) {

            Feedback.updateProgressBar(_self, cache["absolute-progress"], cache["progress-histories"]);
        }

        if (controlInterface) {
            tweetChunk = tweetChunk.slice(tweetChunk.length - 100, tweetChunk.length);
        }

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

            //simulating time
            var minIndex = "#" + _self.listIDStack[Math.floor(Math.random() * _self.listIDStack.length)];
            var min = 10000000000000;
            _self.listIDStack.forEach(function (l, i) {
                var datum = _self.listDataStack[i];
                var processed = (new Date(datum["time"])).getTime() - (new Date(textData["time"])).getTime();
                if (processed > 0 && processed < min) {
                    min = processed;
                    minIndex = "#" + l;
                }
            });

            //":first-child"
            var currentTextDiv = _self.textContentDiv.insert("div", minIndex + ' + *')
                .attr("id", "list" + textId)
                .style("background-color",
                    "rgba(" + colors[sentiment] + ",0.5)")
                .style("margin", "2px")
                .append("div")
                .attr("class", "textContent")
                .style("margin-left", "10px")
                .style("font-size", "12px")
                .style("padding-left", "2px")
                .style("width", "100%");

            var words = textData["content"].split(" ");
            words.unshift(textData["author"] + ":");

            var textWeight = d3.scaleLinear().range([300, 900]);
            if ("processed" in cache) {
                textWeight.domain(d3.extent(Object.keys(cache["processed"]), function (key) {
                    return cache["processed"][key];
                }))
            }
            words.forEach(function (word, i) {
                currentTextDiv.append("span")
                    .text(word + " ")
                    .style("font-weight", function () {
                        if ("processed" in cache) {
                            var keys = Object.keys(cache["processed"]);
                            tWord = word.replace("@", "").replace("#", "").replace(":", "").toLowerCase();
                            if (keys.indexOf(tWord) >= 0) {
                                var weight = Math.round(textWeight(cache["processed"][tWord]) / 100) * 100;
                                weight = weight == 600 || weight == 800 ? weight + 100 : weight;
                                return 900;
                            } else {
                                return 100;
                            }
                        }
                    });
            });

            _self.listIDStack.push("list" + textId);
            _self.listDataStack.push(textData);

            _self.currentHeight = _self.currentHeight + $("#list" + textId).height();


            //if current height is higher than maximum height then delete elements
            while (_self.currentHeight > _self.divHeight) {

                _self.currentHeight = _self.currentHeight - $("#" + _self.listIDStack[0]).height();

                _self.removedHeight = _self.removedHeight + $("#" + _self.listIDStack[0]).height();

                _self.textContentDiv.select("#" + _self.listIDStack.shift()).remove();

                _self.listDataStack.shift();
            }

        });

        _self.scrollBar.style("display", "inline-block")
            .transition().duration("100")
            .style("height", (_self.divHeight * _self.divHeight / _self.currentHeight + "px"));

        //copied from here

        // _self.scrollBar.style("display", "inline-block")
        //     .transition().duration("100")
        //     .style("height", _self.divHeight * _self.divHeight / _self.currentHeight + "px");

    }
}


List.prototype.highlight = function (cache) {

    var _self = this;

    var chunkId = cache["id"];
    var tweetChunk = cache["content"];

    _self.textContentDiv.selectAll("div").remove();
    _self.currentHeight = 0;
    _self.listIDStack = [];
    _self.listDataStack = [];

    _self.textContentDiv.selectAll(".textContent")
        .style("background-color", "white");

    _self.scrollBar
        .style("display", "none");

    tweetChunk = tweetChunk.sort(function(a, b) {
          return (new Date(b["time"])).getTime() - (new Date(a["time"])).getTime();
    });

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
                "rgba(" + "255, 255, 255" + ",1)")
            .style("margin-left", "10px")
            .style("font-size", "12px")
            .style("padding-left", "2px")
            .style("width", "100%");

        var words = textData["content"].split(" ");
        words.unshift(textData["author"] + ":");

        var textWeight = d3.scaleLinear().range([300, 900]);
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
                            return 900;
                            return Math.round(textWeight(cache["keywords"][tWord]) / 100) * 100;
                        } else {
                            return 100;
                        }
                    }
                });
        });

        _self.listIDStack.push("list" + textId);

        _self.currentHeight = _self.currentHeight + $("#list" + textId).height();

        // //if current height is higher than maximum height then delete elements
        // if (_self.currentHeight > _self.divHeight) {
        //
        //     _self.textContentDiv.select("#" + _self.listIDStack.shift()).remove();
        //
        //     _self.currentHeight = _self.divHeight;
        //
        // }
    });

}