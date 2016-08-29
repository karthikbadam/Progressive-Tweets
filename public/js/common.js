/**
 * Created by karthik on 8/3/16.
 */

var Feedback = {

    addProgressBar: function (divID, context) {

        var _self = context;

        var progressHeight = _self.progressHeight = 20;
        var progressWidth = _self.progressWidth = $("#" + divID).width();

        // _self.progressCurrentDiv = d3.select('#' + divID).append("div")
        //     .attr("id", "progressDivCurrent")
        //     .style("background-color", progressColor)
        //     .style("height", progressHeight + "px")
        //     .style("width", "0%")
        //     .style("display", "inline-block")
        //     .style("vertical-align", "middle")
        //     .attr("align", "right");
        //
        // _self.progressCurrentDiv.append("span")
        //     .style("font-size", function () {
        //         return getFontSize(this, $("#" + divID).width());
        //     })
        //     .style("position", "relative")
        //     .style("margin-right", "3px");
        //
        // _self.progressTotalDiv = d3.select('#' + divID).append("div")
        //     .attr("id", "progressDivTotal")
        //     .style("background-color", "white")
        //     .style("height", progressHeight + "px")
        //     .style("width", "100%")
        //     .style("display", "inline-block")
        //     .style("vertical-align", "middle")
        //     .style("vertical-align", "middle")
        //     .style("overflow", "hidden")
        //     .attr("align", "right");

        // _self.progressTotalDiv.append("span")
        //     .style("font-size", "11px")
        //     .style("position", "relative");

        _self.progressCurrentDiv = d3.select('#' + divID).append("div")
            .attr("id", "progressDivCurrent")
            .style("height", progressHeight + "px")
            .style("width", "100%")
            .style("display", "inline-block");

        //create progress svg
        _self.progressCurrentSvg = _self.progressCurrentDiv.append("svg")
            .style("background-color", "#EEE")
            .attr("width", progressWidth)
            .attr("height", progressHeight);

        _self.progressCurrentSvgDefs = _self.progressCurrentSvg.append("defs")
            .append("linearGradient")
            .attr("id", "temperature-gradient")
            .attr("gradientUnits", "userSpaceOnUse");

        _self.tweetContentDiv = d3.select('#' + divID).append("div")
            .attr("id", "content" + divID)
            .style("background-color", "white")
            .style("height", ($('#' + divID).height() - progressHeight - 2) + "px")
            .style("width", "100%")
            .style("display", "inline-block")
            .style("overflow", "hidden")
            .style("position", "relative");

        _self.progressHistories = [];

        return "content" + divID;
    },

    updateProgressBar: function (context, progress) {
        var _self = context;

        // _self.progressCurrentDiv.style("width", Math.round(progress["current"] * 100 / progress["total"]) + "%");
        // _self.progressTotalDiv.style("width", 100 - Math.round(progress["current"] * 100 / progress["total"]) + "%");
        //
        // _self.progressCurrentDiv.select("span").text(Math.round(progress["current"]));
        // _self.progressTotalDiv.select("span").text(Math.round(progress["total"]));

        _self.progressHistories.push(progress);

        _self.progressColorScale = d3.scaleLinear()
            .domain(d3.extent(_self.progressHistories, function (p) {
                return p["relative"];
            })).range(["#fff7fb", "#045a8d"]);

        _self.pWidth = _self.progressWidth / progress["total"] < 1 ? 1 : _self.progressWidth / progress["total"];

        _self.progressCurrentSvg.select("#gradient-end").remove();

        var gradientBars = _self.progressCurrentSvg.select("#temperature-gradient")
            .selectAll("stop")
            .data(_self.progressHistories);

        gradientBars.enter().append("stop")
            .attr("offset", function (d) {
                return d["current"] / d["total"];
            })
            .attr("stop-color", function (d) {
                return _self.progressColorScale(d["relative"]);
            });

        gradientBars.exit().remove();

        gradientBars
            .attr("offset", function (d) {
                return d["current"] / d["total"];
            })
            .attr("stop-color", function (d) {
                return _self.progressColorScale(d["relative"]);
            });

        _self.progressCurrentSvg.select("#temperature-gradient").append("stop")
            .attr("id", "gradient-end")
            .attr("offset", function (d) {
                return (progress["current"] + 10) / progress["total"];
            })
            .attr("stop-color", function (d) {
                return "#EEE";
            });

        if (_self.progressCurrentSvg.selectAll(".progress").empty()) {
            _self.progressCurrentSvg.append("rect")
                .attr("class", "progress")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", _self.progressWidth)
                .attr("height", _self.progressHeight)
                .style("fill", "url(#temperature-gradient)")
                .style("fill-opacity", function (d) {
                    return 0.5;
                });
        }

        // var progressBars = _self.progressCurrentSvg.selectAll(".progress")
        //     .data(_self.progressHistories);
        //
        // progressBars.enter()
        //     .append("rect")
        //     .attr("class", "progress")
        //     .attr("x", function (d, i) {
        //         return d["current"] / d["total"] * _self.progressWidth;
        //     })
        //     .attr("y", 0)
        //     .attr("width", _self.pWidth + 1)
        //     .attr("height", _self.progressHeight)
        //     .style("fill", function (d) {
        //         return _self.progressColorScale(d["relative"]);
        //     })
        //     .style("fill-opacity", function (d) {
        //         return 0.5;
        //     });
        //
        // progressBars
        //     .attr("x", function (d, i) {
        //         return d["current"] / d["total"] * _self.progressWidth;
        //     })
        //     .attr("y", 0)
        //     .attr("width", _self.pWidth)
        //     .attr("height", _self.progressHeight)
        //     .style("fill", function (d) {
        //         return _self.progressColorScale(d["relative"]);
        //     })
        //     .style("fill-opacity", function (d) {
        //         return 0.5;
        //     });
        //
        // progressBars.exit().remove();

        var progressAnnotations = _self.progressCurrentSvg.selectAll(".annotation")
            .data([progress["current"], progress["total"]]);

        progressAnnotations.enter().append("text")
            .attr("class", "annotation")
            .attr("y", function (d, i) {
                if (i == 0) {
                    return _self.progressHeight / 2;
                } else {
                    return 3 * _self.progressHeight / 4;
                }
            })
            .attr("x", function (d, i) {
                if (i == 0) {
                    return progress["current"] / progress["total"] * _self.progressWidth + 2;
                } else {
                    return _self.progressWidth - 20;
                }
            })
            .attr("fill", function (d, i) {
                return "#222";
            })
            .attr("font-size", "9px")
            .text(function (d, i) {
                return d;
            })
            .attr("dominant-baseline", "middle");

        progressAnnotations
            .attr("y", function (d, i) {
                if (i == 0) {
                    return _self.progressHeight / 2;
                } else {
                    return 3 * _self.progressHeight / 4;
                }
            })
            .attr("x", function (d, i) {
                if (i == 0) {
                    return progress["current"] / progress["total"] * _self.progressWidth + 2;
                } else {
                    return _self.progressWidth - 20;
                }
            })
            .attr("fill", function (d, i) {
                return "#222";
            })
            .attr("font-size", "9px")
            .text(function (d, i) {
                return d;
            })
            .attr("dominant-baseline", "middle");

        progressAnnotations.exit().remove();

    },

    addControlMinimize: function (divID, context, optionHandlers) {

        var _self = context;

        var progressHeight = _self.progressHeight;

        _self.miniControlDiv = d3.select('#' + divID).append("div")
            .attr("id", "minicontrol" + divID)
            .style("background-color", "transparent")
            .style("height", progressHeight + "px")
            .style("display", "inline-block")
            .style("position", "absolute")
            .style("top", "0%")
            .style("right", "0")
            .style("margin-left", "5px")
            .style("margin-top", (_self.progressHeight + 3) + "px");

        _self.miniControlDiv.append("div")
            .attr("id", "rewind")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/rewind.png")')
            .on("click", optionHandlers["rewind"]);

        // _self.miniControlDiv.append("div")
        //     .attr("id", "play")
        //     .style("background-image", 'url("/images/play.png")')
        //     .attr("class", "minicontrol");

        _self.miniControlDiv.append("div")
            .attr("id", "pause")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/pause.png")')
            .on("click", function () {

                optionHandlers["pause"]();

                if (context.pauseFlag) {
                    d3.select(this).style("background-image", 'url("/images/play.png")');
                } else {
                    d3.select(this).style("background-image", 'url("/images/pause.png")');
                }

            });

        _self.miniControlDiv.append("div")
            .attr("id", "forward")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/forward.png")')
            .on("click", optionHandlers["forward"]);

        _self.miniControlDiv.append("div")
            .attr("id", "stop")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/stop.png")')
            .on("click", optionHandlers["stop"]);

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
                .style("background-color", "transparent")
                .style("width", "50%")
                .style("height", "200px")
                .style("display", "inline-block");

            _self.optionsControlDiv = _self.maxControlDiv.append("div")
                .attr("id", "optionscontrol" + divID)
                .style("background-color", "transparent")
                .style("width", "50%")
                .style("height", "200px")
                .style("display", "inline-block");

            _self.measureControlDiv.append("p")
                .style("width", $("#measurecontrol" + divID).width() + "px")
                .style("display", "inline")
                .text("Chunk Size")
                .append("input")
                .attr("id", "measureControlSlider-1-" + divID)
                .attr("class", "mdl-slider mdl-js-slider")
                .attr("type", "range")
                .attr("min", "0")
                .attr("max", "1000")
                .attr("value", "10")
                .attr("step", "10");

            componentHandler.upgradeElement(document.getElementById("measureControlSlider-1-" + divID));

            _self.measureControlDiv.append("p")
                .style("width", $("#measurecontrol" + divID).width() + "px")
                .style("display", "inline")
                .text("Updates per second")
                .append("input")
                .attr("id", "measureControlSlider-2-" + divID)
                .attr("class", "mdl-slider mdl-js-slider")
                .attr("type", "range")
                .attr("min", "0")
                .attr("max", "30")
                .attr("value", "5")
                .attr("step", "1");

            componentHandler.upgradeElement(document.getElementById("measureControlSlider-2-" + divID));

            _self.measureControlDiv.append("p")
                .style("width", $("#measurecontrol" + divID).width() + "px")
                .style("display", "inline")
                .text("Quality Threshold")
                .append("input")
                .attr("id", "measureControlSlider-3-" + divID)
                .attr("class", "mdl-slider mdl-js-slider")
                .attr("type", "range")
                .attr("min", "0")
                .attr("max", "16")
                .attr("value", "4")
                .attr("step", "2");

            componentHandler.upgradeElement(document.getElementById("measureControlSlider-3-" + divID));

            _self.label1 = _self.optionsControlDiv.append("label")
                .attr("for", "chkbox1")
                .attr("id", "measureControlCheck-1-" + divID)
                .attr("class", "mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect");

            _self.label1.append("input")
                .attr("type", "checkbox")
                .attr("id", "chkbox1")
                .attr("class", "mdl-checkbox__input");

            _self.label1.append("span")
                .attr("class", "mdl-checkbox__label")
                .text("Run Online");

            componentHandler.upgradeElement(document.getElementById("measureControlCheck-1-" + divID));

            // //Add sliders for measures array -- each measure definition has a range and a default value
            // measures.forEach(function (measure) {
            //
            //     // for each measure create a slider
            //
            //
            // });
            //
            // //Add dropdowns for each option menus array -- each option definition has a list of options and a default
            // options.forEach(function (option) {
            //
            //     //for each options menu create a dropdown
            //
            // });

        } else {

            _self.maxControlDiv.style("display", "inline-block");

        }


    }
}

function getFontSize(element, width) {
    return 11 + "px";
    return Math.min(width, (width - 8) / element.getComputedTextLength() * 24) + "px";
}