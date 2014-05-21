flot-funnel v0.1
===========

###Description
Flotcharts plugin for drawing funnel-like charts.
###Features / TODO list
- [X] Basic features
	- [X] Labelling
	- [X] Slice highlight on hover
	- [X] Click event support
- [X] "Height" slice mode
- [ ] "Area" slice mode
- [ ] IE support
- [ ] Option to define stem height and width

###Data Structure
The data structure accepted by the plugin is as follows:
```
data = [
	{
		label: <string>,
		data: <number> | [ [ 1, <number> ] ]
	},  
	{	
		label: <string>,
		data: <number> | [ [ 1, <number> ] ]
	},
	...
]

```

###Options Structure
The plugin currently supoorts the following options:
```
series: {
	funnel: {
		show: <boolean>|false, // determines if the chart is to be shown. 
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
```
