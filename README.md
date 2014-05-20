flot-funnel
===========

Flotcharts plugin for drawing funnel-like charts.


Options structure:

series: {
	funnel: {
		# begin TODO
		mode: "area" / "height"
		stem: {
			show: true/false,
			height: 0-1 for for the height of the funnel stem (percentage of the funnel's total height),
			width: 0-1 for the width of the funnel stem (percentage of the funnel's max width)
		},
		# end TODO
		
		show: true/false,		
		offset: {
			top: integer value to move the chart up or down,
			left: integer value to move the chart left or right, or 'auto'
		},
		stroke: {
			color: any hexidecimal color value (other formats may or may not work, so best to stick with something like '#FFF'),
			width: integer pixel width of the stroke
		},
		label: {
			show: true/false/"auto",
			formatter:  a user-defined function that modifies the text/style of the label text (html/css),
			background: {
				color: any hexidecimal color value (other formats may or may not work, so best to stick with something like '#000'),
				opacity: 0-1
			},
			threshold: 0-1 for the percentage value at which to hide labels (if they're too small)
		},
		highlight: {
			opacity: 0-1
		}
	}
}