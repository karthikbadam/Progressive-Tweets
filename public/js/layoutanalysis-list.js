/**
 * Created by karthik on 8/3/16.
 */

function List(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "content-left";

    var contentDiv = _self.contentDiv = Feedback.addProgressBar(parentDiv, _self);

    var optionHandlers = _self.optionHandlers = {};

    _self.stopFlag = false;
    _self.pauseFlag = false;

    optionHandlers["stop"] = function () {

        _self.stopFlag = !_self.stopFlag;

    };

    optionHandlers["pause"] = function () {

        _self.pauseFlag = !_self.pauseFlag;

    };

    optionHandlers["rewind"] = function () {

    };

    optionHandlers["forward"] = function () {

    };


    Feedback.addControlMinimize(parentDiv, _self, optionHandlers);

    _self.textContentDiv = d3.select('#' + contentDiv);

    _self.divHeight = $('#' + contentDiv).height();

    _self.currentHeight = 0;

    _self.lastTextId = 0;

}

List.prototype.requestData = function (cache) {

    var _self = this;

}

List.prototype.draw = function (cache) {

    var _self = this;

    var chunkId = cache["id"];
    var tweetChunk = cache["content"];

    var progress = cache["absolute-progress"];

    Feedback.updateProgressBar(_self, progress);

    if (!_self.pauseFlag) {

        tweetChunk.forEach(function (textData, i) {

            // Adding tweet to the list
            var textId = ((cache.id - 1) * tweetChunk.length + i);

            _self.textContentDiv.append("div")
                .attr("id", "list" + textId)
                .style("background-color",
                    "rgba(" + colors[parseInt(textData["sentiment"]) - 1] + ",0.5)")
                .style("margin", "2px")
                .append("div")
                .style("margin-left", "10px")
                .style("padding-left", "2px")
                .style("background-color", "white")
                .text((textId + 1) + ": " + textData["content"]);

            _self.currentHeight = _self.currentHeight + $("#list" + textId).height();

            //if current height is higher than maximum height then delete elements
            if (_self.currentHeight > _self.divHeight) {

                _self.textContentDiv.select("#list" + _self.lastTextId).remove();

                _self.lastTextId = _self.lastTextId + 1;

                _self.currentHeight = _self.divHeight;

            }
        });
    }

    // Automatially scroll to the bottom as new texts are added
    var elem = document.getElementById(_self.contentDiv);
    elem.scrollTop = elem.scrollHeight;

}
