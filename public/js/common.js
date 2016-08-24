/**
 * Created by karthik on 8/3/16.
 */

var Feedback = {

    addProgressBar: function (divID, context) {

        var _self = context;

        var progressHeight = 20;

        _self.progressCurrentDiv = d3.select('#' + divID).append("div")
            .attr("id", "progressDivCurrent")
            .style("background-color", progressColor)
            .style("height", progressHeight + "px")
            .style("width", "0%")
            .style("display", "inline-block")
            .style("vertical-align", "middle")
            .attr("align", "right");

        _self.progressCurrentDiv.append("span")
            .style("font-size", function () {
                return getFontSize(this, $("#" + divID).width());
            })
            .style("position", "relative")
            .style("margin-right", "3px");

        _self.progressTotalDiv = d3.select('#' + divID).append("div")
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

        _self.tweetContentDiv = d3.select('#' + divID).append("div")
            .attr("id", "content" + divID)
            .style("background-color", "white")
            .style("height", ($('#' + divID).height() - progressHeight - 2) + "px")
            .style("width", "100%")
            .style("display", "inline-block")
            .style("overflow", "hidden")
            .style("position", "relative");

        return "content" + divID;
    },

    addControlMinimize: function (divID, context, expandhandler) {

        var _self = context;

        var progressHeight = 20;

        _self.miniControlDiv = d3.select('#' + divID).append("div")
            .attr("id", "minicontrol" + divID)
            .style("background-color", "transparent")
            .style("height", progressHeight + "px")
            .style("display", "inline-block")
            .style("position", "absolute")
            .style("top", "1%")
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

        _self.expanded = false;

        _self.miniControlDiv.append("div")
            .attr("id", "expand")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/expand.png")')
            .on("click", function () {

                if (!_self.expanded) {
                    $("#" + divID).animate({height: '+=200'});
                    _self.expanded = true;

                    Feedback.addControlMaximize(divID, _self);

                } else {
                    $("#" + divID).animate({height: '-=200'});
                    _self.expanded = false;

                    _self.maxControlDiv.style("display", "none");
                }
            });

    },

    addControlMaximize: function (divID, context, measures, options) {

        var _self = context;

        if (d3.select('#' + divID).select("#maxcontrol" + divID).empty()) {

            _self.maxControlDiv = d3.select('#' + divID).append("div")
                .attr("id", "maxcontrol" + divID)
                .style("background-color", "transparent")
                .style("width", "100%")
                .style("height", "200px")
                .style("display", "inline-block");

            _self.measureControlDiv = _self.maxControlDiv.append("div")
                .attr("id", "measurecontrol" + divID)
                .style("background-color", "lightblue")
                .style("width", "50%")
                .style("height", "200px")
                .style("display", "inline-block");

            _self.optionsControlDiv = _self.maxControlDiv.append("div")
                .attr("id", "optionscontrol" + divID)
                .style("background-color", "pink")
                .style("width", "50%")
                .style("height", "200px")
                .style("display", "inline-block");

        } else {

            _self.maxControlDiv.style("display", "inline-block");

        }


        //Add sliders for measures array -- each measure definition has a range and a default value
        measures.forEach(function (measure) {

            // for each measure create a slider


        });

        //Add dropdowns for each option menus array -- each option definition has a list of options and a default
        options.forEach(function (option) {

            //for each options menu create a dropdown

        });



    }
}

function getFontSize(element, width) {
    return 11 + "px";
    return Math.min(width, (width - 8) / element.getComputedTextLength() * 24) + "px";
}