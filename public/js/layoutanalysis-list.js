/**
 * Created by karthik on 8/3/16.
 */

function List(options) {

    var _self = this;

    var parentDiv = _self.parentDiv = "content-left";

    var contentDiv = _self.contentDiv = Feedback.addProgressBar(parentDiv, _self);

    Feedback.addControlMinimize(parentDiv, _self);

    _self.tweetContentDiv = d3.select('#'+contentDiv);

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

    tweetChunk.forEach(function (tweetData, i) {

        // Adding tweet to the list
        var tweetId = ((cache.id - 1) * tweetChunk.length + i);

        _self.tweetContentDiv.append("div")
            .style("background-color",
                "rgba(" + colors[parseInt(tweetData["sentiment"]) - 1] + ",0.5)")
            .style("margin", "2px")
            .append("div")
            .style("margin-left", "10px")
            .style("padding-left", "2px")
            .style("background-color", "white")
            .text((tweetId + 1) + ": " + tweetData["content"]);


    });

    // Automatially scroll to the bottom as new tweets are added
    var elem = document.getElementById(_self.contentDiv);
    elem.scrollTop = elem.scrollHeight;
}
