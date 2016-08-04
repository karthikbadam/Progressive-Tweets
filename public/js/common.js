/**
 * Created by karthik on 8/3/16.
 */

var Feedback = {

    addProgressBar: function (divID, context) {

        var _self = context;

        var progressHeight = 20;

        _self.progressCurrentDiv = d3.select('#'+divID).append("div")
            .attr("id", "progressDivCurrent")
            .style("background-color", progressColor)
            .style("height", progressHeight + "px")
            .style("width", "0%")
            .style("display", "inline-block")
            .style("vertical-align", "middle")
            .attr("align", "right");

        _self.progressCurrentDiv.append("span")
            .style("font-size", "11px")
            .style("position", "relative")
            .style("margin-right", "3px");

        _self.progressTotalDiv = d3.select('#'+divID).append("div")
            .attr("id", "progressDivTotal")
            .style("background-color", "white")
            .style("height", progressHeight + "px")
            .style("width", "100%")
            .style("display", "inline-block")
            .style("vertical-align", "middle")
            .style("vertical-align", "middle")
            .style("overflow", "hidden")
            .attr("align", "right");

        _self.progressTotalDiv.append("span")
            .style("font-size", "11px")
            .style("position", "relative");

        _self.tweetContentDiv = d3.select('#'+divID).append("div")
            .attr("id", "content"+divID)
            .style("background-color", "white")
            .style("height", ($('#'+divID).height() - progressHeight) + "px")
            .style("width", "100%")
            .style("display", "inline-block")
            .style("overflow", "hidden")
            .style("position", "relative");

        return "content"+divID;
    },

    addControlMinimize: function (divID, context, expandhandler) {

        var _self = context;

        _self.miniControlDiv = d3.select('#'+divID).append("div")
            .attr("id", "minicontrol"+divID)
            .style("background-color", "transparent")
            .style("height", "30px")
            .style("display", "inline-block")
            .style("position", "absolute")
            .style("bottom", "1%")
            .style("right", "0")
            .style("margin", "5px");

        _self.miniControlDiv.append("div")
            .attr("id", "rewind")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/rewind.png")');

        // _self.miniControlDiv.append("div")
        //     .attr("id", "play")
        //     .style("background-image", 'url("/images/play.png")')
        //     .attr("class", "minicontrol");

        _self.miniControlDiv.append("div")
            .attr("id", "pause")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/pause.png")');

        _self.miniControlDiv.append("div")
            .attr("id", "forward")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/forward.png")');

        _self.miniControlDiv.append("div")
            .attr("id", "stop")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/stop.png")');

        _self.miniControlDiv.append("div")
            .attr("id", "expand")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/expand.png")')
            .on("click", expandhandler);

    },

}