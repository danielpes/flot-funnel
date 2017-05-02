flot-funnel v0.1
============

### Description
Flotcharts plugin for drawing funnel-like charts.

### Features / TODO list
- [X] Basic features
	- [X] Labelling
	- [X] Slice highlight on hover
	- [X] Click event support
- [X] "Height" slice mode
- [X] Option to define stem height and width
- [ ] "Area" slice mode
- [ ] IE support

### Data Structure
The plugin assumes that each series has a single data value, and that each
value is a positive integer or zero.  Negative numbers don't make sense for a
funnel chart, and have unpredictable results.  The values do **not** need to be
passed in as percentages; the plugin will calculate the total percentages
internally.

The data structure accepted by the plugin is as follows:
```
[
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

### Options Structure
The plugin currently supports the following options:

```
series: {
    funnel: {
        show: <boolean>|false, // determines if the chart is to be shown. 
        stem: {
            height: <float>, // 0-1 for for the height of the funnel stem (percentage of the funnel's total height)
            width: <float> // 0-1 for the width of the funnel stem (percentage of the funnel's max width)
        },
        margin: {
            left: <float>|0, // 0-1 (%) for the left margin
            right: <float>|0, // 0-1 (%) for the right margin
            top: <float>|0, // 0-1 (%) for the top margin
            bottom: <float>|0 // 0-1 (%) for the bottom margin
        },
        stroke: {
            color: <string>|'fff', // hexidecimal color value (ie.: '#fff'),
            width: <integer>|1 // pixel width of the stroke
        },
        label: {
            show: <boolean>|<string>|false, // boolean or "auto"
            align: <string>|'center', // 'left', 'center', or 'align'
            formatter: <function>, // user-defined function that modifies the text/style of the label text
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
### Examples
The following screenshot shows some examples of funnels made with this plug-in:

![Examples](/img/examples.png)
