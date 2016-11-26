let express = require('express'),
    app = express(),
    _ = require('lodash')
;

const createRandomData = (type) => {
  let arr = _.range(0, _.random(10, 100));
  return arr.map( (i) => ({x: i, y: _.random(0, 100), z: _.random(0, 10)}) );
};

// parses URL-encoded color
const parseColor = (rawColor) => {
  return rawColor ||
          ['#dfc27d', '#bf812d', '#80cdc1', '#d53e4f', '#f46d43', '#fdae61',
          '#abdda4', '#66c2a5', '#3288bd', '#35978f'][_.random(0,9)]
  ;
};

// converts URL-encoded data ("[1,2,3,4]") into an array of data applicable to MG chart ([{x, y, z}, ...])
// rawData is a string
const parseData = (rawData) => {
  return parseEncodedUrlData(rawData, 'x', 'y', 'z');
};


// converts URL-encoded rawData ("1,2,3,4") into an array of data applicable to MG chart ([{x, y, z}, ...])
// rawData is a string, eg: "1,2,3,4" or "[1, 20], [2, 59], [3, 44]"
// params is a list of params the data needs to be mapped to, eg: ['x', 'y', 'z']
const parseEncodedUrlData = (rawData, ...params) => {
  if (!rawData || !params.length)
    return [];

  // ready-for-charts data
  let result = [],
      parsed
  ;

  // parse rawData
  try {
    // strings are represented by a single quote (eg: [1, 'hello']), but
    // JSON.parse() expects double quotes around the strings
    // replace single quote with a double quote
    rawData = rawData.replace(/'/g, '"');
    parsed = JSON.parse('[' + rawData + ']');
  }
  catch(e) {
    // console.log('error parsing data', rawData);
    // not able to parse rawData (bad format, etc)
    return [];
  }

  // raw data should be an array
  if (Array.isArray(parsed) && parsed.length > 0) {
    // transform raw items into [{x, y, z},...] format
    result = parsed.map( (rawItem, index) => {
      let item = {};
      // initialize parameters
      params.forEach( (p, _i) => {
        // the first param's default value is index (typically, X), set other params (Y, Z) to zero
        item[p] = _i === 0 ? index : 0;
      });

      if (Array.isArray(rawItem)) {
        // rawItem is an array, represents [x, y, z]
        switch (rawItem.length){
          // single value, use it as Y
          case 1: item[params[1]] = rawItem[0]; break;
          // two values, use as X and Y
          case 2: item[params[0]] = rawItem[0]; item[params[1]] = rawItem[1]; break;
          // three values, use as X, Y and Z
          case 3: item[params[0]] = rawItem[0]; item[params[1]] = rawItem[1]; item[params[2]] = rawItem[2]; break;
        }
      }
      // value is a number, it belongs to params[1]
      else if (typeof rawItem === 'number') {
        item[params[1]] = rawItem;
      }
      // value is a string, it belongs to params[1]
      else if (typeof rawItem === 'string') {
        item[params[1]] = rawItem;
      }
      return item;
    });
  }
  return result;
};

// finds series data, colors and legends from URL params
const getSeriesData = (type, series, urlParams) => {
  // initialize data arrays
  let data = [],    // data is an array of series data, eg: [series1Array, series2Array, ...]
      colors = [],  // list of colors each series, eg: ['red', 'green', ...], where 'red' corresponds to series1
      legend = [];  // list of legends for each series, eg: ['expenses', 'revenue', ...], where 'expenses' corresponds to series1

  series.forEach( (s, i) => {
    // suffix of the series, eg: "line-1"s suffix is "-1",
    // we would use this suffix for color (eg. "color-1") and other params
    let suffix = s.substr(type.length);
    let d = parseData(urlParams[s]);
    if (!d || !d.length)
      d = createRandomData(type);

    data.push(d);
    colors.push(parseColor(urlParams['color' + suffix]));
    legend.push(urlParams['legend' + suffix] || '');
  });

  return {data, colors, legend};
}


// support these params: chart type, colors, legends, baselines, markers
// /chart.png -> line chart with random data
// /chart.png?line -> line chart with random data
// /chart?line=40,60,30,50,60
// /chart?line=[1,40],[2,60],[3,30],[4,50],[5,60]
// /chart?line=[Mon,40],[Tue,60][Wed,30],[Thu,50][Fri,60]
// /chart?line1=[Mon,40],[Tue,60][Wed,30],[Thu,50][Fri,60]&legend1=Expenses&line2=[Mon,40],[Fri,40]&legend2=Max spending

const parseParams = (params) => {

  // set chart config defaults
  let config = {
    width: params.width || 400,
    height: params.height || 250,
    // vertical marker
    markers: parseEncodedUrlData(params.markers, 'x', 'label'),
    // horizontal marker
    baselines: parseEncodedUrlData(params.baselines, 'value', 'label'), //[{value: 16, label: 'a baseline'}],
    // interpolate: 'linear',

    x_accessor: 'x',
    y_accessor: 'y',
    size_accessor:'z',
    area: true,
    y_rug: false,
    x_rug: false,

    data: [],
    colors: [],
    legend: [],
  };

  const keys = Object.keys(params);
  let seriesObject;

  // check if any series for chart type are defined
  for (let type of ['line', /*'bar' too many issues in MG bar, skip for now*/, 'point']) {
    // name of series defined for chart type, eg: line-1, line-2
    const seriesNames = keys.filter( k => k.indexOf(type) === 0);
    if (seriesNames.length) {
      // the series are defined for this chart type
      // find series data, legends and colors from URL string
      seriesObject = getSeriesData(type, seriesNames, params);

      // join config and series
      Object.assign(config, seriesObject, {chart_type: type});
      // do not proceed: we only draw one chart type
      break;
    }
  }

  // if no chart type is defined, create random data for line chart
  if (!seriesObject) {
    Object.assign(config, {data: createRandomData('line'), chart_type: 'line'});
  }

  // leave space for legend text
  if (config.legend.length)
    config.right = 70;

  return config;
}


// init metrics graphics
const MG = require('metrics-graphics');
MG.init_virtual_window(require('jsdom'));

// use "public" directory to serve static content
app.use(express.static('public'));

// intercept /chart.svg requests
app.get('/chart.svg/', function(req, res) {

  // set response content-type
  res.set('Content-type', 'image/svg+xml');

  // SVG
  let chart = MG.render_markup(function(target) {
    let conf = _.extend({target: target, show_tooltips: false}, parseParams(req.query));
    MG.data_graphic(conf);
  });

  // CSS style of a standard metrics-graphics chart
  let style = '<style>.mg-active-datapoint{fill:#000;font-size:.9rem;font-weight:400;opacity:.8}.mg-area1-color{fill:#00f}.mg-area2-color{fill:#05b378}.mg-area3-color{fill:#db4437}.mg-area4-color{fill:#f8b128}.mg-area5-color{fill:#5c5c5c}text.mg-barplot-group-label{font-weight:900}.mg-barplot rect.mg-bar{shape-rendering:auto}.mg-barplot rect.mg-bar.default-bar{fill:#b6b6fc}.mg-barplot rect.mg-bar.default-active{fill:#9e9efc}.mg-barplot .mg-bar-prediction{fill:#5b5b5b}.mg-barplot .mg-bar-baseline{stroke:#5b5b5b;stroke-width:2}.mg-bar-target-element{font-size:11px;padding-left:5px;padding-right:5px;font-weight:300}.mg-baselines line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-baselines text{fill:#000;font-size:.9rem;opacity:.6;stroke:none}.mg-baselines-small text{font-size:.6rem}.mg-category-guides line{stroke:#b3b2b2}.mg-header{cursor:default;font-size:1.2rem}.mg-header .mg-chart-description,.mg-header .mg-warning{fill:#ccc;font-family:FontAwesome;font-size:1.2rem}.mg-points circle{opacity:.65}.mg-popover{font-size:.95rem}.mg-popover-content{cursor:auto;line-height:17px}.mg-data-table{margin-top:30px}.mg-data-table thead tr th{border-bottom:1px solid #a9a9a9;cursor:default;font-size:1.1rem;font-weight:400;padding:5px 5px 8px;text-align:right}.mg-data-table thead tr th .fa{color:#ccc;padding-left:4px}.mg-data-table thead tr th .popover{font-size:1rem;font-weight:400}.mg-data-table .secondary-title{color:#a9a9a9}.mg-data-table tbody tr td{margin:2px;padding:5px;vertical-align:top}.mg-data-table tbody tr td.table-text{opacity:.8;padding-left:30px}.mg-x-axis line.mg-extended-xax-ticks,.mg-y-axis line.mg-extended-yax-ticks{opacity:.4}.mg-histogram .axis line,.mg-histogram .axis path{fill:none;opacity:.7;shape-rendering:auto;stroke:#ccc}tspan.hist-symbol{fill:#9e9efc}.mg-histogram .mg-bar rect{fill:#b6b6fc;shape-rendering:auto}.mg-histogram .mg-bar rect.active{fill:#9e9efc}.mg-least-squares-line{stroke:red;stroke-width:1px}.mg-lowess-line{fill:none;stroke:red}.mg-line1-color{stroke:#4040e8}.mg-hover-line1-color{fill:#4040e8}.mg-line2-color{stroke:#05b378}.mg-hover-line2-color{fill:#05b378}.mg-line3-color{stroke:#db4437}.mg-hover-line3-color{fill:#db4437}.mg-line4-color{stroke:#f8b128}.mg-hover-line4-color{fill:#f8b128}.mg-line5-color{stroke:#5c5c5c}.mg-hover-line5-color{fill:#5c5c5c}.mg-line-legend text{font-size:.9rem;font-weight:300;stroke:none}.mg-line1-legend-color{color:#4040e8;fill:#4040e8}.mg-line2-legend-color{color:#05b378;fill:#05b378}.mg-line3-legend-color{color:#db4437;fill:#db4437}.mg-line4-legend-color{color:#f8b128;fill:#f8b128}.mg-line5-legend-color{color:#5c5c5c;fill:#5c5c5c}.mg-main-area-solid svg .mg-main-area{fill:#ccf;opacity:1}.mg-markers line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-markers text{fill:#000;font-size:.8rem;opacity:.6}.mg-missing-text{opacity:.9}.mg-missing-background{stroke:#00f;fill:none;stroke-dasharray:10,5;stroke-opacity:.05;stroke-width:2}.mg-missing .mg-main-line{opacity:.1}.mg-missing .mg-main-area{opacity:.03}path.mg-main-area{opacity:.2;stroke:none}path.mg-confidence-band{fill:#ccc;opacity:.4;stroke:none}path.mg-main-line{fill:none;opacity:.8;stroke-width:1.1px}.mg-points circle{fill-opacity:.4;stroke-opacity:1}circle.mg-points-mono,tspan.mg-points-mono{fill:#00f;stroke:#00f}.mg-points circle.selected{fill-opacity:1;stroke-opacity:1}.mg-voronoi path{fill:none;pointer-events:all;stroke:none;stroke-opacity:.1}.mg-x-rug-mono,.mg-y-rug-mono{stroke:#000}.mg-x-axis line,.mg-y-axis line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-histogram .axis text,.mg-x-axis text,.mg-y-axis text{fill:#000;font-size:.9rem;opacity:.6}.mg-axis .label,.mg-x-axis .label,.mg-y-axis .label{font-size:.8rem;text-transform:uppercase;font-weight:400}.mg-active-datapoint-small,.mg-x-axis-small text,.mg-y-axis-small text{font-size:.6rem}.mg-x-axis-small .label,.mg-y-axis-small .label{font-size:.65rem}.mg-year-marker text{fill:#000;font-size:.7rem;opacity:.6}.mg-year-marker line{opacity:1;shape-rendering:auto;stroke:#b3b2b2;stroke-width:1px}.mg-year-marker-small text{font-size:.6rem}</style> ';

  // TODO: either append to DOM or use regex
  // add xmlns="http://www.w3.org/2000/svg to svg tag
  chart = chart.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  // TODO: either append to DOM or use regex
  // add CSS style right after the svg tag
  chart = chart.replace('>', '> ' + style);
  // return chart
  res.end(chart);
});
app.listen(process.env.NODE_PORT || 3000, process.env.NODE_IP || 'localhost', function () {
  console.log(`Application worker ${process.pid} started...`);
});
