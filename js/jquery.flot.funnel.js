/* 

*********************************************************************
* Funnel Chart Plugin for Flot                                      *
*                                                                   *
* Created by Daniel de Paula e Silva                                *
* daniel.paula@icarotech.com                                        *
* Licensed under the MIT license.                                   *
*********************************************************************

*********************************************************************
*                         - IMPORTANT -                             *
*                                                                   *
* This code is based on the Pie Chart plugin for Flot.              *
*                                                                   *
* Pie plugin:                                                       *
*   Source code: http://www.flotcharts.org/flot/jquery.flot.pie.js  *
*   Created by Brian Medendorp                                      *
*   Updated with contributions from btburnett3, Anthony Aragues     * 
*       and Xavi Ivars                                              *
*   Copyright (c) 2007-2014 IOLA and Ole Laursen.                   *
*   Licensed under the MIT license.                                 *
*********************************************************************

The plugin assumes that each series has a single data value, and that each
value is a positive integer or zero.  Negative numbers don't make sense for a
funnel chart, and have unpredictable results.  The values do NOT need to be
passed in as percentages; the plugin will calculate the total percentages 
internally.


The plugin supports these options:

    series: {
        funnel: {
        
            mode: "area" / "height" // TODO
            
            show: <boolean>|false, // determines if the chart is to be shown. 
            stem: {
                height: <float>, // 0-1 for for the height of the funnel stem (percentage of the funnel's total height)
                width: <float> // 0-1 for the width of the funnel stem (percentage of the funnel's max width)
            },
            offset: {
                top: <integer>|0, // value to move the chart up or down,
                left: <integer>|<string>|'auto' // value to move the chart left or right, or 'auto'
            },
            stroke: {
                color: <string>|'fff', // hexidecimal color value (ie.: '#fff'),
                width: <integer>|1 // pixel width of the stroke
            },
            label: {
                show: <boolean>|<string>|false, // boolean or "auto"
                align: <string>|'center', // 'left', 'center', or 'align'
                formatter: <function>, // user-defined function that modifies the text/style of the label text,
                background: {
                    color: <string>|null, // hexidecimal color value (ie.: '#fff'),
                    opacity: <float>|0 // 0-1 for the background opacity level
                },
                threshold: <float>|0 // 0-1 for the percentage value at which to hide labels (if they're too small)
            },
            highlight: {
                opacity: <float>|0.5 // 0-1 for the highlight opacity level
            }
        }
    }

More detail and specific examples can be found in the included HTML file.

*/

(function($) {

    function init(plot) {

        var canvas = null,
            target = null,
            options = null,
            ctx = null,
            stemW = null;
            stemH = null;
            
        var canvasWidth = plot.getPlaceholder().width(),
            canvasHeight = plot.getPlaceholder().height();

        // interactive variables

        var highlights = [];

        // add hook to determine if pie plugin in enabled, and then perform necessary operations

        plot.hooks.processOptions.push(function(plot, options) {
            if (options.series.funnel.show) {
                options.grid.show = false;
                if (options.series.funnel.label.show == "auto") {
                    if (options.legend.show) {
                        options.series.funnel.label.show = false;
                    } else {
                        options.series.funnel.label.show = true;
                    }
                }
            }
        });

        plot.hooks.bindEvents.push(function(plot, eventHolder) {
            var options = plot.getOptions();
            if (options.series.funnel.show) {
                if (options.grid.hoverable) {
                    eventHolder.unbind("mousemove").mousemove(onMouseMove);
                }
                if (options.grid.clickable) {
                    eventHolder.unbind("click").click(onClick);
                }
            }
        });

        plot.hooks.processDatapoints.push(function(plot, series, data, datapoints) {
            var options = plot.getOptions();
            if (options.series.funnel.show) {
                processDatapoints(plot, series, data, datapoints);
            }
        });

        plot.hooks.drawOverlay.push(function(plot, octx) {
            var options = plot.getOptions();
            if (options.series.funnel.show) {
                drawOverlay(plot, octx);
            }
        });

        plot.hooks.draw.push(function(plot, newCtx) {
            var options = plot.getOptions();
            if (options.series.funnel.show) {
                draw(plot, newCtx);
            }
        });
        
        
        function processDatapoints(plot, series, datapoints) {
            canvas = plot.getCanvas();
            target = $(canvas).parent();
            options = plot.getOptions();
            value = series.data;
            
            // If the data is an array, we'll assume that it's a standard
            // Flot x-y pair, and are concerned only with the second value.
            
            if ($.isArray(value) && value.length == 1) {
                value = value[0];
            }

            if ($.isArray(value)) {
                if (!isNaN(parseFloat(value[1])) && isFinite(value[1])) {
                    value[1] = +value[1];
                } else {
                    value[1] = 0;
                }
            } else if (!isNaN(parseFloat(value)) && isFinite(value)) {
                value = [1, +value];
            } else {
                value = [1, 0];
            }
            series.data = [value];
            series.value = value[1];
        }
        
        
        function draw(plot, newCtx) {

            if (!target) {
                return; // if no series were passed
            }

            var legendWidth = target.children().filter(".legend").children().width() || 0
                leftOffset = options.series.funnel.offset.left,
                topOffset = options.series.funnel.offset.top,      
                maxHeight = null, 
                maxWidth = null,
                slices = plot.getData(),
                initialY = (topOffset>0) ? topOffset : 0;
                totalValue = 0,
                totalH = initialY;
                
            stemH = canvasHeight * options.series.funnel.stem.height;
            stemW = canvasWidth * options.series.funnel.stem.width;

            centerY = canvasHeight / 2 + topOffset;
            centerX = canvasWidth / 2;
            
            ctx = newCtx;
            
            for (var i = 0; i < slices.length; ++i) {
                totalValue += slices[i].value;
            }
            
            if (leftOffset == "auto") {
                if (options.legend.position.match("w")) {
                    leftOffset = +legendWidth;
                } else {
                    leftOffset = -legendWidth;
                }
            } 
            centerX += leftOffset/2;
            
            maxHeight = canvasHeight - Math.abs(topOffset),
            maxWidth = canvasWidth - Math.abs(leftOffset),                
            
            // Start drawing funnel
            ctx.save();
            for (var j = 0; j < slices.length; j++) {
                drawSlice(slices,j,slices[j].color,true);
            }
            ctx.restore();
            
            if (options.series.funnel.stroke.width > 0) {
                totalH = initialY;
                ctx.save();
                ctx.lineWidth = options.series.funnel.stroke.width;
                for (var j = 0; j < slices.length; j++) {
                    drawSlice(slices,j,options.series.funnel.stroke.color,false);
                }
                ctx.restore();
            }
            console.debug(slices);
            
            function drawSlice(slices,j,color,fill){
                var tan = 2*(maxHeight - stemH) / (maxWidth - stemW),
                    prevSlice = (j===0) ? null : slices[j-1],
                    slice = slices[j];
                    
                slice.percent = 100 * slice.value / totalValue
                slice.draw ={};
                slice.draw.height = maxHeight * slice.percent / 100;
                slice.draw.highY = totalH;
                slice.draw.lowY = slice.draw.highY + slice.draw.height;
                slice.draw.topWidth = (prevSlice!=null) ? prevSlice.draw.bottomWidth : maxWidth;
                
                var bottomWidth = (j==slices.length-1) ? stemW : ( slice.draw.topWidth - ( 2*slice.draw.height / tan ) );
                if (bottomWidth < stemW) bottomWidth = stemW;
                
                slice.draw.bottomWidth = bottomWidth;
                
                if (fill) {
                    ctx.fillStyle = color;
                } else {
                    ctx.strokeStyle = color;
                }
                makeSlicePath(ctx, slice.draw.bottomWidth, slice.draw.topWidth, slice.draw.lowY, slice.draw.highY);
                
                if (fill) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
                
                totalH += slice.draw.height;
                
                if (options.series.funnel.label.show && slice.percent > options.series.funnel.label.threshold*100) {
                    return drawLabel();
                } else return true;
                
                
                function drawLabel() {

                    if (slice.data[0][1] == 0) {
                        return true;
                    }
                    // format label text
                    var lf = options.legend.labelFormatter, text, plf = options.series.funnel.label.formatter;
    
                    if (lf) {
                        text = lf(slice.label, slice);
                    } else {
                        text = slice.label;
                    }
    
                    if (plf) {
                        text = plf(text, slice);
                    }
                    
                    var y = slice.draw.highY + slice.draw.height/2;
                    var x;
                    switch(options.series.funnel.label.align) {
                        case "center":
                            x = centerX;
                            break;
                        case "left":
                            x = 0;
                            break;
                        case "right":
                            x = 2*centerX;
                            break;                                     
                        default:
                            x = centerX;
                    }
    
                    var html = "<span class='funnelLabel' id='funnelLabel" + j + "' style='position:absolute;top:" + y + "px;left:" + x + "px;'>" + text + "</span>";
                    target.append(html);
    
                    var label = target.children("#funnelLabel" + j);
                    var labelTop = (y - label.height() / 2);
                    var labelLeft = (x - label.width() / 2);
                    
                    label.css("top", labelTop);
                    label.css("left", labelLeft);
    
                    // check to make sure that the label is not outside the canvas
    
                    if (0 - labelTop > 0 || 0 - labelLeft > 0 || canvasHeight - (labelTop + label.height()) < 0 || canvasWidth - (labelLeft + label.width()) < 0) {
                        return false;
                    }
    
                    if (options.series.funnel.label.background.opacity != 0) {
    
                        // put in the transparent background separately to avoid blended labels and label boxes
    
                        var c = options.series.funnel.label.background.color;
    
                        if (c == null) {
                            c = slice.color;
                        }
    
                        var pos = "top:" + labelTop + "px;left:" + labelLeft + "px;";
                        $("<div class='funnelLabelBackground' style='position:absolute;width:" + label.width() + "px;height:" + label.height() + "px;" + pos + "background-color:" + c + ";'></div>")
                            .css("opacity", options.series.funnel.label.background.opacity)
                            .insertBefore(label);
                    }
    
                    return true;
                } // end individual label function
            }

            
        }
        
        function makeSlicePath(ctx, bottomWidth, topWidth, lowY, highY){
            maxHeight = canvasHeight - Math.abs(topOffset);
            ctx.beginPath();
            ctx.moveTo(centerX-topWidth/2, highY);
            ctx.lineTo(centerX+topWidth/2, highY);
            if(topWidth > stemW && bottomWidth == stemW){
                var stemTopY = (topOffset>0) ? maxHeight-stemH+topOffset : maxHeight-stemH;
                ctx.lineTo(centerX+bottomWidth/2, stemTopY);
                ctx.lineTo(centerX+bottomWidth/2, lowY);
                ctx.lineTo(centerX-bottomWidth/2, lowY);
                ctx.lineTo(centerX-bottomWidth/2, stemTopY);
            }
            else{
                ctx.lineTo(centerX+bottomWidth/2, lowY);
                ctx.lineTo(centerX-bottomWidth/2, lowY);
            }
            ctx.closePath();
        }
        
        
        //-- Additional Interactive related functions --

        function findNearbySlice(mouseX, mouseY) {

            var slices = plot.getData(),
                options = plot.getOptions(),
                x, y;

            for (var i = 0; i < slices.length; ++i) {

                var slice = slices[i];

                if (slice.funnel.show) {

                    ctx.save();
                    makeSlicePath(ctx, slice.draw.bottomWidth, slice.draw.topWidth, slice.draw.lowY, slice.draw.highY);
                    x = mouseX;
                    y = mouseY;

                    if (ctx.isPointInPath) {
                        if (ctx.isPointInPath(x, y)) {
                            ctx.restore();
                            return {
                                datapoint: [slice.percent, slice.data],
                                dataIndex: 0,
                                series: slice,
                                seriesIndex: i
                            };
                        }
                    }
                    
                    // TODO: check IE compatibility

                    ctx.restore();
                }
            }

            return null;
        }

        function onMouseMove(e) {
            triggerClickHoverEvent("plothover", e);
        }

        function onClick(e) {
            triggerClickHoverEvent("plotclick", e);
        }

        // trigger click or hover event (they send the same parameters so we share their code)

        function triggerClickHoverEvent(eventname, e) {

            var offset = plot.offset();
            var canvasX = parseInt(e.pageX - offset.left);
            var canvasY =  parseInt(e.pageY - offset.top);
            var item = findNearbySlice(canvasX, canvasY);
            

            if (options.grid.autoHighlight) {

                // clear auto-highlights

                for (var i = 0; i < highlights.length; ++i) {
                    var h = highlights[i];
                    if (h.auto == eventname && !(item && h.series == item.series)) {
                        unhighlight(h.series);
                    }
                }
            }

            // highlight the slice

            if (item) {
                highlight(item.series, eventname);
            }

            // trigger any hover bind events

            var pos = { pageX: e.pageX, pageY: e.pageY };
            target.trigger(eventname, [pos, item]);
        }

        function highlight(s, auto) {
            //if (typeof s == "number") {
            //    s = series[s];
            //}

            var i = indexOfHighlight(s);

            if (i == -1) {
                highlights.push({ series: s, auto: auto });
                plot.triggerRedrawOverlay();
            } else if (!auto) {
                highlights[i].auto = false;
            }
        }

        function unhighlight(s) {
            if (s == null) {
                highlights = [];
                plot.triggerRedrawOverlay();
            }

            //if (typeof s == "number") {
            //    s = series[s];
            //}

            var i = indexOfHighlight(s);

            if (i != -1) {
                highlights.splice(i, 1);
                plot.triggerRedrawOverlay();
            }
        }

        function indexOfHighlight(s) {
            for (var i = 0; i < highlights.length; ++i) {
                var h = highlights[i];
                if (h.series == s)
                    return i;
            }
            return -1;
        }

        function drawOverlay(plot, octx) {

            var options = plot.getOptions();

            octx.save();

            for (var i = 0; i < highlights.length; ++i) {
                drawHighlight(highlights[i].series);
            }

            octx.restore();

            function drawHighlight(slice) {
            
                makeSlicePath(octx, slice.draw.bottomWidth, slice.draw.topWidth, slice.draw.lowY, slice.draw.highY);
                //octx.fillStyle = parseColor(options.series.funnel.highlight.color).scale(null, null, null, options.series.funnel.highlight.opacity).toString();
                octx.fillStyle = "rgba(255, 255, 255, " + options.series.funnel.highlight.opacity + ")"; // this is temporary until we have access to parseColor
                octx.fill();
            }
        }
    } // end init (plugin body)

    // define funnel specific options and their default values

    var options = {
        series: {
            funnel: {
                show: false,
                stem:{
                    height: 0.15,
                    width: 0.3
                },
                offset: {
                    top: 0,
                    left: "auto"
                },
                stroke: {
                    color: "#fff",
                    width: 1
                },
                label: {
                    show: false,
					align: "center",
                    formatter: function(label, slice) {
                        return "<div style='font-size:x-small;text-align:center;padding:2px;color:white;'>" + slice.data[0][1] + "</div>";
                    },    // formatter function
                    background: {
                        color: null,
                        opacity: 0
                    },
                    threshold: 0    // percentage at which to hide the label (i.e. the slice is too narrow)
                },
                highlight: {
                    //color: "#fff",        // will add this functionality once parseColor is available
                    opacity: 0.5
                }
            }
        }
    };

    $.plot.plugins.push({
        init: init,
        options: options,
        name: "funnel",
        version: "0.1"
    });

})(jQuery);
