/* 

*********************************************************************
* jquery.flot.funnel.js                                             *
* Flot plugin for rendering Funnel-like charts.                     *
*                                                                   *
* Created by Daniel de Paula e Silva                                *
* daniel.paula@icarotech.com                                        *
*********************************************************************

*********************************************************************
*                           IMPORTANT                               *
* Code based on the Pie Chart plugin for Flot.                      *
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
            show: true/false
            
            //begin TODO
            mode: "area" / "height"
            stem: {
                show: true/false
                height: 0-1 for for the height of the funnel stem (percentage of the funnel's total height)
                width: 0-1 for the width of the funnel stem (percentage of the funnel's max width)
            },
            //end TODO
            
            offset: {
                top: integer value to move the chart up or down
                left: integer value to move the chart left or right, or 'auto'
            },
            stroke: {
                color: any hexidecimal color value (other formats may or may not work, so best to stick with something like '#FFF')
                width: integer pixel width of the stroke
            },
            label: {
                show: true/false, or 'auto'
                formatter:  a user-defined function that modifies the text/style of the label text (html/css)
                background: {
                    color: any hexidecimal color value (other formats may or may not work, so best to stick with something like '#000')
                    opacity: 0-1
                },
                threshold: 0-1 for the percentage value at which to hide labels (if they're too small)
            },
            highlight: {
                opacity: 0-1
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
            centerLeft = null,
            centerTop = null,
            processed = false,
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

                // set labels.show

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
            if (processed) {
                return;
            }
            
            processed = true;
            
            canvas = plot.getCanvas();
            target = $(canvas).parent();
            options = plot.getOptions();
            data = plot.getData();
            
            var total = 0,
                //color = options.series.pie.combine.color,
                newdata = [];
                

            // Fix up the raw data from Flot, ensuring the data is numeric

            for (var i = 0; i < data.length; ++i) {

                var value = data[i].data;

                // If the data is an array, we'll assume that it's a standard
                // Flot x-y pair, and are concerned only with the second value.

                // Note how we use the original array, rather than creating a
                // new one; this is more efficient and preserves any extra data
                // that the user may have stored in higher indexes.

                if ($.isArray(value) && value.length == 1) {
                    value = value[0];
                }

                if ($.isArray(value)) {
                    // Equivalent to $.isNumeric() but compatible with jQuery < 1.7
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

                data[i].data = [value];
            }

            // Sum up all the slices, so we can calculate percentages for each

            for (var i = 0; i < data.length; ++i) {
                total += data[i].data[0][1];
            }


            for (var i = 0; i < data.length; ++i) {
                var value = data[i].data[0][1];
                newdata.push(
                    $.extend(data[i], {     /* extend to allow keeping all other original data values
                                               and using them e.g. in labelFormatter. */
                        data: [[1, value]],
                        color: data[i].color,
                        label: data[i].label,
                        percent: value / (total / 100)
                    })
                );
            }

            plot.setData(newdata);
        }

        function draw(plot, newCtx) {

            if (!target) {
                return; // if no series were passed
            }

            var    legendWidth = target.children().filter(".legend").children().width() || 0;

            ctx = newCtx;
            stemW = ctx.canvas.width / 3;

            // WARNING: HACK! REWRITE THIS CODE AS SOON AS POSSIBLE!

            // When combining smaller slices into an 'other' slice, we need to
            // add a new series.  Since Flot gives plugins no way to modify the
            // list of series, the pie plugin uses a hack where the first call
            // to processDatapoints results in a call to setData with the new
            // list of series, then subsequent processDatapoints do nothing.

            // The plugin-global 'processed' flag is used to control this hack;
            // it starts out false, and is set to true after the first call to
            // processDatapoints.

            // Unfortunately this turns future setData calls into no-ops; they
            // call processDatapoints, the flag is true, and nothing happens.

            // To fix this we'll set the flag back to false here in draw, when
            // all series have been processed, so the next sequence of calls to
            // processDatapoints once again starts out with a slice-combine.
            // This is really a hack; in 0.9 we need to give plugins a proper
            // way to modify series before any processing begins.

            processed = false;

            // calculate maximum radius and center point

            centerY = canvasHeight / 2 + options.series.funnel.offset.top;
            centerX = canvasWidth / 2;

            if (options.series.funnel.offset.left == "auto") {
                if (options.legend.position.match("w")) {
                    centerX += legendWidth / 2;
                } else {
                    centerX -= legendWidth / 2;
                }
            } else {
                centerX += options.series.funnel.offset.left;
            }
            var slices = plot.getData();
            
            // Start drawing funnel
            var totalH = 0;
            ctx.save();
            for (var j = 0; j < slices.length; j++) {
                drawSlice(slices,j,slices[j].color,true);
            }
            ctx.restore();
            
            
            totalH = 0;
            if (options.series.funnel.stroke.width > 0) {
                ctx.save();
                ctx.lineWidth = options.series.funnel.stroke.width;
                for (var j = 0; j < slices.length; j++) {
                    drawSlice(slices,j,options.series.funnel.stroke.color,false);
                }
                ctx.restore();
            }
            
            
            function drawSlice(slices,j,color,fill){
                //var dataHeight,lowWidth,highWidth,lowY;
                var maxHeight = 2*centerY, maxWidth = 2*centerX;
                var lowY, highY = totalH,
                    tan = 2*(maxHeight - stemW/2) / (maxWidth-stemW),
                    
                    slice = slices[j],
                    prevSlice = (j===0) ? null : slices[j-1];
                    
                slice.height = maxHeight * slice.percent / 100;
                slice.highY = highY;
                slice.lowY = highY + slice.height;
                slice.topWidth = (prevSlice!=null) ? prevSlice.bottomWidth : maxWidth;
                
                var bottomWidth = (j==slices.length-1) ? stemW : ( slice.topWidth - ( 2*slice.height / tan ) );
                if (bottomWidth < stemW) bottomWidth = stemW;
                
                slice.bottomWidth = bottomWidth;
                
                if (fill) {
                    ctx.fillStyle = color;
                } else {
                    ctx.strokeStyle = color;
                }
                
                makeSlicePath(ctx, slice.bottomWidth, slice.topWidth, slice.lowY, slice.highY);
                
                if (fill) {
                    ctx.fill();
                } else {
                    ctx.stroke();
                }
                
                totalH += slice.height;
                
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
                    
                    var y = slice.highY+slice.height/2;
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
            maxHeight = 2*centerY;
            ctx.beginPath();
            ctx.moveTo(centerX - topWidth / 2,highY);
            ctx.lineTo(centerX + topWidth / 2,highY);
            if(topWidth>stemW && bottomWidth==stemW){
                ctx.lineTo(centerX + bottomWidth/2, maxHeight-stemW/2);
                ctx.lineTo(centerX + bottomWidth / 2,lowY);
                ctx.lineTo(centerX - bottomWidth / 2,lowY);
                ctx.lineTo(centerX - bottomWidth/2, maxHeight-stemW/2);
            }
            else{
                ctx.lineTo(centerX + bottomWidth / 2,lowY);
                ctx.lineTo(centerX - bottomWidth / 2,lowY);
            }
            ctx.closePath();
        }
        
        
        //-- Additional Interactive related functions --

        function isPointInPoly(poly, pt) {
            for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
                ((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1]< poly[i][1]))
                && (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
                && (c = !c);
            return c;
        }

        function findNearbySlice(mouseX, mouseY) {

            var slices = plot.getData(),
                options = plot.getOptions(),
                x, y;

            for (var i = 0; i < slices.length; ++i) {

                var s = slices[i];

                if (s.funnel.show) {

                    ctx.save();
                    makeSlicePath(ctx, s.bottomWidth, s.topWidth, s.lowY, s.highY);
                    x = mouseX - centerLeft;
                    y = mouseY - centerTop;

                    if (ctx.isPointInPath) {
                        if (ctx.isPointInPath(x, y)) {
                            ctx.restore();
                            return {
                                datapoint: [s.percent, s.data],
                                dataIndex: 0,
                                series: s,
                                seriesIndex: i
                            };
                        }
                    } /*else {
						 
						TODO: add IE support
						
                        // excanvas for IE doesn;t support isPointInPath, this is a workaround.

                        var p1X = radius * Math.cos(s.startAngle),
                            p1Y = radius * Math.sin(s.startAngle),
                            p2X = radius * Math.cos(s.startAngle + s.angle / 4),
                            p2Y = radius * Math.sin(s.startAngle + s.angle / 4),
                            p3X = radius * Math.cos(s.startAngle + s.angle / 2),
                            p3Y = radius * Math.sin(s.startAngle + s.angle / 2),
                            p4X = radius * Math.cos(s.startAngle + s.angle / 1.5),
                            p4Y = radius * Math.sin(s.startAngle + s.angle / 1.5),
                            p5X = radius * Math.cos(s.startAngle + s.angle),
                            p5Y = radius * Math.sin(s.startAngle + s.angle),
                            arrPoly = [[0, 0], [p1X, p1Y], [p2X, p2Y], [p3X, p3Y], [p4X, p4Y], [p5X, p5Y]],
                            arrPoint = [x, y];

                        // TODO: perhaps do some mathmatical trickery here with the Y-coordinate to compensate for funnel tilt?

                        if (isPointInPoly(arrPoly, arrPoint)) {
                            ctx.restore();
                            return {
                                datapoint: [s.percent, s.data],
                                dataIndex: 0,
                                series: s,
                                seriesIndex: i
                            };
                        }
                    }*/

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

            function drawHighlight(series) {

                makeSlicePath(octx, series.bottomWidth, series.topWidth, series.lowY, series.highY);
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
