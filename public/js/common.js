/**
 * Created by karthik on 8/3/16.
 */

var Feedback = {

    addProgressBar: function (divID, context) {

        var _self = context;

        var progressHeight = _self.progressHeight = 20;
        var progressWidth = _self.progressWidth = $("#" + divID).width();

        _self.progressCurrentDiv = d3.select('#' + divID).append("div")
            .attr("id", "progressDivCurrent")
            .style("height", progressHeight + "px")
            .style("width", "100%")
            .style("display", "inline-block");

        //create progress svg
        _self.progressCurrentSvg = _self.progressCurrentDiv.append("svg")
            .style("background-color", "white")
            .attr("width", progressWidth)
            .attr("height", progressHeight);

        _self.progressCurrentSvgDefs = _self.progressCurrentSvg.append("defs")
            .append("linearGradient")
            .attr("id", "temperature-gradient" + divID)
            .attr("gradientUnits", "objectBoundingBox");

        _self.progressDrag = d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);

        function dragstarted(d) {
            d3.event.sourceEvent.stopPropagation();
            d3.select(this).classed("dragging", true);
        }

        function dragged(d) {
            d3.select(this).attr("x", d3.event.x - 10);
            _self.playHead.attr("x", d3.event.x);
        }

        function dragended(d) {
            d3.select(this).classed("dragging", false);
            d3.select(this).attr("x", d3.event.x - 10);
            _self.playHead.attr("x", d3.event.x);

            var playHeadIndex = Math.round(d3.event.x * _self.currentProgress["total"] / _self.progressWidth);
            playHeadIndexCopy = playHeadIndex;
            min = 100000;
            minIndex = playHeadIndex;

            //closest progress index
            _self.progressHistories.forEach(function (p) {
                if (Math.abs(playHeadIndexCopy - p["current"]) < min) {
                    min = Math.abs(playHeadIndexCopy - p["current"]);
                    minIndex = p["current"];
                }
            });

            playHeadIndex = minIndex;
            console.log(playHeadIndex);

            socket.send(wrapMessage("change playhead", {
                content: {target: _self.name, value: playHeadIndex}
            }));

            if (Math.abs(_self.currentProgress["current"] - playHeadIndex) < 20) {
                if (_self.pauseFlag) {
                    _self.pause();
                }
            }

            // if (!_self.pauseFlag) {
            //     _self.pause();
            // }

            // if (Math.abs(_self.currentProgress["current"] - playHeadIndex) < 20) {
            //     if (commonButtons.pauseFlag) {
            //         commonButtons.pause(safe = true);
            //     }
            // }
            //
            // if (!commonButtons.pauseFlag) {
            //     commonButtons.pause(safe = true);
            // }
        }

        _self.tweetContentDiv = d3.select('#' + divID).append("div")
            .attr("id", "content" + divID)
            .style("background-color", "white")
            .style("height", ($('#' + divID).height() - progressHeight - 2) + "px")
            .style("width", "100%")
            .style("display", "inline-block")
            .style("overflow", "scroll")
            .style("position", "relative");

        _self.progressHistories = [];

        var flasher = _self.progressCurrentSvg.selectAll(".flasher").data([1]);

        flasher.enter().append("rect").attr("class", "flasher")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", _self.progressWidth * 100 / 13000)
            .attr("height", _self.progressHeight)
            .style("fill", "#EEE")
            .style("fill-opacity", 0.5)
            .style("pointer-events", "none");

        flasher.exit().remove();

        flasher.attr("x", 0)
            .attr("y", 0)
            .attr("width", _self.progressWidth * 100 / 13000)
            .attr("height", _self.progressHeight);


        return "content" + divID;
    },

    updateProgressBar: function (context, progress, progressHistories) {
        var _self = context;

        if (progress == null) {
            return;
        }

        if (progressHistories) {
            _self.progressHistories = progressHistories;
        }

        _self.currentProgress = progress;

        _self.progressHistories.unshift({
            "current": 0,
            "total": _self.progressHistories[0]["total"],
            "relative": _self.progressHistories[0]["relative"]
        });

        d3.select("#pagetitle span").text("Tweet Analytics ("+ (progress["current"] + 1) + " records)");

        _self.progressColorScale = d3.scaleLinear()
            .domain(d3.extent(_self.progressHistories, function (p) {
                return p["relative"];
            })).range(["#c6dbef", "#08306b"]);

        _self.pWidth = _self.progressWidth / progress["total"] < 1 ? 1 : _self.progressWidth / progress["total"];

        _self.progressY = d3.scaleLinear()
            .domain(d3.extent(_self.progressHistories, function (p) {
                return p["relative"];
            })).range([_self.progressHeight - 2, 1]);

        if (_self.progressHistories.length == 2) {
            _self.progressY.domain([0.5 * progress["relative"], 1.5 * progress["relative"]])
        }

        _self.progressline = d3.line()
            .x(function (d) {
                return _self.progressWidth * (d["current"]) / d["total"];
            })
            .y(function (d) {
                return _self.progressY(d["relative"]);
            })
            .curve(d3.curveCardinal.tension(0.75));

        // _self.progressCurrentSvg.select("#gradient-end").remove();
        //
        // var gradientBars = _self.progressCurrentSvg.select("#temperature-gradient" + _self.parentDiv)
        //     .selectAll("stop")
        //     .data(_self.progressHistories);
        //
        // gradientBars.enter().append("stop")
        //     .attr("offset", function (d) {
        //         return d["current"] / d["total"];
        //     })
        //     .attr("stop-color", function (d) {
        //         return _self.progressColorScale(d["relative"]);
        //     });
        //
        // gradientBars.exit().remove();
        //
        // gradientBars
        //     .attr("offset", function (d) {
        //         return d["current"] / d["total"];
        //     })
        //     .attr("stop-color", function (d) {
        //         return _self.progressColorScale(d["relative"]);
        //     });
        //
        // _self.progressCurrentSvg.select("#temperature-gradient" + _self.parentDiv).append("stop")
        //     .attr("id", "gradient-end")
        //     .attr("offset", function (d) {
        //         return (progress["current"] + 10) / progress["total"];
        //     })
        //     .attr("stop-color", function (d) {
        //         return "#EEE";
        //     });

        // _self.progressCurrentSvg.select(".progress")
        //     .attr("width", progress["current"] * _self.progressWidth / progress["total"]);

        if (_self.progressCurrentSvg.select("#" + _self.parentDiv + "progresspath").empty()) {
            _self.progresspath = _self.progressCurrentSvg.append("path")
                .attr("id", _self.parentDiv + "progresspath")
                .attr("class", "progresspath");
        } else {
            _self.progresspath = _self.progressCurrentSvg.select("#" + _self.parentDiv + "progresspath");
        }

        _self.progresspath
            .data([_self.progressHistories])
            .attr("d", _self.progressline)
            .style("fill", "transparent")
            .style("fill-opacity", 1)
            .style("stroke", "#666")
            .style("stroke-width", "1.5px")
            .style("pointer-events", "none");


        if (_self.progressCurrentSvg.selectAll(".progress").empty()) {

            _self.progressCurrentSvg.append("rect")
                .attr("class", "progress")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 1)
                .attr("height", _self.progressHeight)
                .style("fill", "#EEE")
                .style("fill-opacity", function (d) {
                    return 0.5;
                });

            _self.playHead = _self.progressCurrentSvg.append("rect")
                .attr("class", "playhead")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 1)
                .attr("stroke-width", 0)
                .attr("height", _self.progressHeight)
                .style("pointer-events", "none")
                .style("fill", "#666")
                .style("fill-opacity", 1);

            _self.playHeadShadow = _self.progressCurrentSvg.append("rect")
                .attr("class", "playheadshadow")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", 20)
                .attr("height", _self.progressHeight)
                .style("fill", "transparent")
                .style("fill-opacity", 1)
                .style("cursor", "hand")
                .call(_self.progressDrag)
        }

        _self.progressCurrentSvg.select(".progress")
            .attr("width", progress["current"] * _self.progressWidth / progress["total"])
            .attr("height", _self.progressHeight);

        var flasher = _self.progressCurrentSvg.selectAll(".flasher")
            .data([_self.currentProgress["current"]])
            .attr("x", _self.progressWidth * (_self.currentProgress["current"]) / _self.currentProgress["total"] + 1)
            .attr("y", 0)
            .attr("width", function () {
                w = _self.progressWidth * _self.measures["chunkSize"]["value"] / _self.currentProgress["total"];
                return k = w < 10 ? 10 : w;
            })
            .attr("height", _self.progressHeight);

        _self.playHeadShadow
            .attr("x", _self.progressWidth * (progress["current"]) / progress["total"] - 10);

        _self.playHead
            .attr("x", _self.progressWidth * (progress["current"]) / progress["total"]);

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
                    return _self.progressWidth - d.toString().length * 5;
                }
            })
            .attr("fill", function (d, i) {
                return "#222";
            })
            .style("pointer-events", "none")
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
                    return _self.progressWidth - d.toString().length * 5;
                }
            })
            .attr("fill", function (d, i) {
                return "#666";
            })
            .attr("font-size", "9px")
            .style("pointer-events", "none")
            .text(function (d, i) {
                return d;
            })
            .attr("dominant-baseline", "middle");

        progressAnnotations.exit().remove();

    },

    addControlMinimize: function (divID, context) {

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

        // _self.miniControlDiv.append("div")
        //     .attr("id", "rewind")
        //     .attr("class", "minicontrol")
        //     .style("background-image", 'url("/images/rewind.png")')
        //     .on("click", function () {
        //         _self.rewind();
        //     });

        // _self.miniControlDiv.append("div")
        //     .attr("id", "play")
        //     .style("background-image", 'url("/images/play.png")')
        //     .attr("class", "minicontrol");

        _self.miniControlDiv.append("div")
            .attr("id", "pause")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/pause.png")')
            .on("click", function () {
                _self.pause();
            });

        // _self.miniControlDiv.append("div")
        //     .attr("id", "forward")
        //     .attr("class", "minicontrol")
        //     .style("background-image", 'url("/images/forward.png")')
        //     .on("click", function () {
        //         _self.forward();
        //     });

        _self.miniControlDiv.append("div")
            .attr("id", "stop")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/stop.png")')
            .on("click", function () {
                _self.stop();
            });

        _self.expanded = false;

        _self.miniControlDiv.append("div")
            .attr("id", "expand")
            .attr("class", "minicontrol")
            .style("background-image", 'url("/images/expand.png")')
            .on("click", function () {

                if (!_self.expanded) {
                    $("#" + divID).animate({height: '+=170'});
                    _self.expanded = true;
                    Feedback.addControlMaximize(divID, _self);

                } else {
                    $("#" + divID).animate({height: '-=170'});
                    _self.expanded = false;
                    _self.maxControlDiv.style("display", "none");
                }
            });

    },

    addControlMaximize: function (divID, context) {

        var _self = context;

        var measures = _self.measureArray;
        var options = _self.optionsArray;

        if (d3.select('#' + divID).select("#maxcontrol" + divID).empty()) {

            _self.maxControlDiv = d3.select('#' + divID).append("div")
                .attr("id", "maxcontrol" + divID)
                .style("background-color", "transparent")
                .style("width", "100%")
                .style("height", "170px")
                .style("display", "inline-block")
                .style("padding", "5px");

            _self.measureControlDiv = _self.maxControlDiv.append("div")
                .attr("id", "measurecontrol" + divID)
                .style("background-color", "transparent")
                .style("width", "50%")
                .style("height", "170px")
                .style("display", "inline-block");

            _self.optionsControlDiv = _self.maxControlDiv.append("div")
                .attr("id", "optionscontrol" + divID)
                .style("background-color", "transparent")
                .style("width", "50%")
                .style("height", "170px")
                .style("display", "inline-block");

            measures.forEach(function (measure) {

                    var sliderDiv = _self.measureControlDiv.append("div");

                    sliderDiv.append("div")
                        .attr("id", "slider" + divID + measure["index"])
                        .style("width", $("#measurecontrol" + divID).width() + "px")
                        .style("display", "inline-block")
                        .style("font-size", "0.8em")
                        .style("margin", "0px")
                        .style("width", "100%")
                        .text(measure["name"] + ": " + measure["default"]);

                    var sliderContentDiv = sliderDiv.append("div")
                        .style("display", "inline-block")
                        .style("font-size", "0.8em");

                    sliderContentDiv.append("div").style("display", "inline-block").text("" + measure["min"]);

                    sliderContentDiv.append("div")
                        .style("display", "inline-block")
                        .style("font-size", "0.8em")
                        .style("width", "calc(100% - 40px)")
                        .style("margin", "0px")
                        .append("input")
                        .attr("id", "measurecontrolslider" + divID + "-" + measure["index"])
                        .attr("class", "mdl-slider mdl-js-slider")
                        .style("display", "inline-block")
                        .attr("type", "range")
                        .attr("min", "" + measure["min"])
                        .attr("max", "" + measure["max"])
                        .attr("value", "" + measure["default"])
                        .attr("step", "" + measure["step"])
                        .on("change", function () {
                            d3.select("#slider" + divID + measure["index"]).text(measure["name"] + ": " + this.value);
                            _self.measures[measure.index]["value"] = parseInt(this.value);
                            if (measure.index == "updates") {
                                _self.measures[measure.index]["value"] = 1000 / parseInt(this.value);
                            }
                            if (measure.index == "chunkSize") {

                                var flasher = _self.progressCurrentSvg.selectAll(".flasher").data([_self.currentProgress["current"]])
                                    .attr("x", _self.progressWidth * (_self.currentProgress["current"]) / _self.currentProgress["total"] + 1)
                                    .attr("y", 0)
                                    .attr("width", function () {
                                        w = _self.progressWidth * _self.measures["chunkSize"]["value"] / _self.currentProgress["total"];
                                        return k = w < 10 ? 10 : w;
                                    })
                                    .attr("height", _self.progressHeight);

                            }
                        });


                    sliderContentDiv.append("div").style("display", "inline-block").text("" + measure["max"]);
                    componentHandler.upgradeElement(document.getElementById("measurecontrolslider" + divID + "-" + measure["index"]));
                }
            );

            options.forEach(function (option) {


                var optionsDiv = _self.optionsControlDiv.append("div")
                    .attr("id", "optionscontroldiv" + divID + option["index"])
                    .attr("class", "mdl-textfield mdl-js-textfield mdl-textfield--floating-label getmdl-select");

                optionsDiv.append("input")
                    .attr("id", "optionscontrolinput" + divID + option["index"])
                    .attr("class", "mdl-textfield__input")
                    .attr("value", option["children"][0]["name"])
                    .attr("type", "text")
                    .attr("tabIndex", "-1")
                    .attr("data-val", _self.options[option["index"]]);

                optionsDiv.append("label")
                    .attr("class", "mdl-textfield__label")
                    .text(option["name"]);

                var optionsUl = optionsDiv.append("ul")
                    .attr("class", "mdl-menu mdl-menu--bottom-left mdl-js-menu")
                    .attr("for", "optionscontrolinput" + divID + option["index"]);

                option["children"].forEach(function (o) {
                    optionsUl.append("li").attr("class", "mdl-menu__item")
                        .attr("data-val", o["index"])
                        .text(o["name"]);
                })

                getmdlSelect.init("#optionscontroldiv" + divID + option["index"]);

            });


            var optionsDiv = _self.optionsControlDiv.append("div")
                .attr("id", "optionscontroldiv" + divID + "fake")
                .attr("class", "mdl-textfield mdl-js-textfield mdl-textfield--floating-label getmdl-select");

            optionsDiv.append("input")
                .attr("id", "optionscontrolinput" + divID + "fake")
                .attr("class", "mdl-textfield__input")
                .attr("value", "Fake")
                .attr("type", "text")
                .attr("tabIndex", "-1")
                .attr("data-val", "fake");

            optionsDiv.append("label")
                .attr("class", "mdl-textfield__label")
                .text("fake");

            var optionsUl = optionsDiv.append("ul")
                .attr("class", "mdl-menu mdl-menu--bottom-left mdl-js-menu")
                .attr("for", "optionscontrolinput" + divID + "fake");

            getmdlSelect.init("#optionscontroldiv" + divID + "fake");

            d3.select("#optionscontroldiv" + divID + "fake").remove();

            _self.label1 = _self.measureControlDiv.append("label")
                .attr("for", "chkbox1")
                .attr("id", "measureControlCheck-1-" + divID)
                .attr("class", "mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect");

            _self.label1.append("input")
                .attr("type", "checkbox")
                .attr("id", "chkbox1")
                .attr("class", "mdl-checkbox__input");

            _self.label1.append("span")
                .attr("class", "mdl-checkbox__label")
                .style("font-size", "0.8em")
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