/**
 * Created by karthik on 8/3/16.
 */

function List(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "content-left";

    var contentDiv = _self.contentDiv = Feedback.addProgressBar(parentDiv, _self);

    Feedback.addControlMinimize(parentDiv, _self);

    _self.textContentDiv = d3.select('#'+contentDiv);

    _self.divHeight = $('#'+contentDiv).height();

    _self.currentHeight = 0;

    _self.lastTextId = 0;

}

List.prototype.draw = function (cache) {

    var _self = this;

    var chunkId = cache["id"];
    var tweetChunk = cache["content"];
    var progress = cache["absolute-progress"];

    _self.progressCurrentDiv.style("width", Math.round(progress["current"] * 100 / progress["total"]) + "%");
    _self.progressTotalDiv.style("width", 100 - Math.round(progress["current"] * 100 / progress["total"]) + "%");

    _self.progressCurrentDiv.select("span").text(Math.round(progress["current"]));
    _self.progressTotalDiv.select("span").text(Math.round(progress["total"]));


    tweetChunk.forEach(function (textData, i) {

        // Adding tweet to the list
        var textId = ((cache.id - 1) * tweetChunk.length + i);

        _self.textContentDiv.append("div")
            .attr("id", "list"+textId)
            .style("background-color",
                "rgba(" + colors[parseInt(textData["sentiment"]) - 1] + ",0.5)")
            .style("margin", "2px")
            .append("div")
            .style("margin-left", "10px")
            .style("padding-left", "2px")
            .style("background-color", "white")
            .text((textId + 1) + ": " + textData["content"]);

        _self.currentHeight = _self.currentHeight + $("#list"+textId).height();

        //if current height is higher than maximum height then delete elements
        if (_self.currentHeight > _self.divHeight) {

            _self.textContentDiv.select("#list"+_self.lastTextId).remove();

            _self.lastTextId = _self.lastTextId + 1;

            _self.currentHeight = _self.divHeight;

        } else {



        }

    });

    //get div height and scroll height



    //delete whats outside the window

    // Automatially scroll to the bottom as new texts are added
    var elem = document.getElementById(_self.contentDiv);
    elem.scrollTop = elem.scrollHeight;

}
