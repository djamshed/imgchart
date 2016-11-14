let express = require('express'),
    app = express(),
    _ = require('lodash')
    ;

const createData = () => {
  let arr = _.range(0, _.random(10, 100));
  return arr.map( (i) => ({x: i, y: _.random(0, 100)}) );
};

const parseParams = (params) => {
  let color = ['#dfc27d', '#bf812d', '#80cdc1', '#d53e4f', '#f46d43',
                '#fdae61', '#abdda4', '#66c2a5', '#3288bd', '#35978f'][_.random(0,9)]
                ;
  let data = /*params.data ||*/ createData();
  return {
    type: ['line', 'bar', 'point'].indexOf(params.type) > -1 ? params.type : 'line',
    color: params.color || color,
    data: data,
    markers: params.markers || (Math.random() < .5 ? [] : [{'x': _.random(1, data.length - 1), 'label': 'Something important happened here'}]),
    x_accessor: "x",
    y_accessor: "y",
    width: params.width || 400,
    height: params.height || 250,
    area: params.area || (Math.random() > .5),
  };
}

// init metrics graphics
const MG = require('metrics-graphics');
MG.init_virtual_window(require('jsdom'));

// use "public" directory to serve static content
app.use(express.static('public'));

// intercept /chart.svg requests
app.get('/chart.svg/', function(req, res) {

  res.set('Content-type', 'image/svg+xml');

  // SVG
  let chart = MG.render_markup(function(target) {
    let conf = _.extend({target: target, show_tooltips: false}, parseParams(req.query));
    MG.data_graphic(conf);
  });

  // style
  let style = '<style>.mg-active-datapoint{fill:#000;font-size:.9rem;font-weight:400;opacity:.8}.mg-area1-color{fill:#00f}.mg-area2-color{fill:#05b378}.mg-area3-color{fill:#db4437}.mg-area4-color{fill:#f8b128}.mg-area5-color{fill:#5c5c5c}text.mg-barplot-group-label{font-weight:900}.mg-barplot rect.mg-bar{shape-rendering:auto}.mg-barplot rect.mg-bar.default-bar{fill:#b6b6fc}.mg-barplot rect.mg-bar.default-active{fill:#9e9efc}.mg-barplot .mg-bar-prediction{fill:#5b5b5b}.mg-barplot .mg-bar-baseline{stroke:#5b5b5b;stroke-width:2}.mg-bar-target-element{font-size:11px;padding-left:5px;padding-right:5px;font-weight:300}.mg-baselines line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-baselines text{fill:#000;font-size:.9rem;opacity:.6;stroke:none}.mg-baselines-small text{font-size:.6rem}.mg-category-guides line{stroke:#b3b2b2}.mg-header{cursor:default;font-size:1.2rem}.mg-header .mg-chart-description,.mg-header .mg-warning{fill:#ccc;font-family:FontAwesome;font-size:1.2rem}.mg-points circle{opacity:.65}.mg-popover{font-size:.95rem}.mg-popover-content{cursor:auto;line-height:17px}.mg-data-table{margin-top:30px}.mg-data-table thead tr th{border-bottom:1px solid #a9a9a9;cursor:default;font-size:1.1rem;font-weight:400;padding:5px 5px 8px;text-align:right}.mg-data-table thead tr th .fa{color:#ccc;padding-left:4px}.mg-data-table thead tr th .popover{font-size:1rem;font-weight:400}.mg-data-table .secondary-title{color:#a9a9a9}.mg-data-table tbody tr td{margin:2px;padding:5px;vertical-align:top}.mg-data-table tbody tr td.table-text{opacity:.8;padding-left:30px}.mg-x-axis line.mg-extended-xax-ticks,.mg-y-axis line.mg-extended-yax-ticks{opacity:.4}.mg-histogram .axis line,.mg-histogram .axis path{fill:none;opacity:.7;shape-rendering:auto;stroke:#ccc}tspan.hist-symbol{fill:#9e9efc}.mg-histogram .mg-bar rect{fill:#b6b6fc;shape-rendering:auto}.mg-histogram .mg-bar rect.active{fill:#9e9efc}.mg-least-squares-line{stroke:red;stroke-width:1px}.mg-lowess-line{fill:none;stroke:red}.mg-line1-color{stroke:#4040e8}.mg-hover-line1-color{fill:#4040e8}.mg-line2-color{stroke:#05b378}.mg-hover-line2-color{fill:#05b378}.mg-line3-color{stroke:#db4437}.mg-hover-line3-color{fill:#db4437}.mg-line4-color{stroke:#f8b128}.mg-hover-line4-color{fill:#f8b128}.mg-line5-color{stroke:#5c5c5c}.mg-hover-line5-color{fill:#5c5c5c}.mg-line-legend text{font-size:.9rem;font-weight:300;stroke:none}.mg-line1-legend-color{color:#4040e8;fill:#4040e8}.mg-line2-legend-color{color:#05b378;fill:#05b378}.mg-line3-legend-color{color:#db4437;fill:#db4437}.mg-line4-legend-color{color:#f8b128;fill:#f8b128}.mg-line5-legend-color{color:#5c5c5c;fill:#5c5c5c}.mg-main-area-solid svg .mg-main-area{fill:#ccf;opacity:1}.mg-markers line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-markers text{fill:#000;font-size:.8rem;opacity:.6}.mg-missing-text{opacity:.9}.mg-missing-background{stroke:#00f;fill:none;stroke-dasharray:10,5;stroke-opacity:.05;stroke-width:2}.mg-missing .mg-main-line{opacity:.1}.mg-missing .mg-main-area{opacity:.03}path.mg-main-area{opacity:.2;stroke:none}path.mg-confidence-band{fill:#ccc;opacity:.4;stroke:none}path.mg-main-line{fill:none;opacity:.8;stroke-width:1.1px}.mg-points circle{fill-opacity:.4;stroke-opacity:1}circle.mg-points-mono,tspan.mg-points-mono{fill:#00f;stroke:#00f}.mg-points circle.selected{fill-opacity:1;stroke-opacity:1}.mg-voronoi path{fill:none;pointer-events:all;stroke:none;stroke-opacity:.1}.mg-x-rug-mono,.mg-y-rug-mono{stroke:#000}.mg-x-axis line,.mg-y-axis line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-histogram .axis text,.mg-x-axis text,.mg-y-axis text{fill:#000;font-size:.9rem;opacity:.6}.mg-axis .label,.mg-x-axis .label,.mg-y-axis .label{font-size:.8rem;text-transform:uppercase;font-weight:400}.mg-active-datapoint-small,.mg-x-axis-small text,.mg-y-axis-small text{font-size:.6rem}.mg-x-axis-small .label,.mg-y-axis-small .label{font-size:.65rem}.mg-year-marker text{fill:#000;font-size:.7rem;opacity:.6}.mg-year-marker line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-year-marker-small text{font-size:.6rem}</style> ';

  // add xmlns="http://www.w3.org/2000/svg
  chart = chart.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  // add CSS style
  chart = chart.replace('>', '> ' + style);

  res.end(chart);
});
app.listen(process.env.NODE_PORT || 3000, process.env.NODE_IP || 'localhost', function () {
  console.log(`Application worker ${process.pid} started...`);
});
