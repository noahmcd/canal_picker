//////////////////////////////////////////////////////
//VARIABLE NAMES NOT CHECKED FOR MATCHING OTHER CODE//
//////////////////////////////////////////////////////

//build dropdown selection list
var parameters = ["pH", "salinity", "temperature"];
/*d3.select(".dropdown-menu").selectAll(".dropdown-item")
    .data(parameters).enter()
    .append("a")
    .attr('class', 'dropdown-item')
    .attr('href', '#')
    .text(function(d) { return d });*/
//filter data by user-selected param

var mapboxTiles = L.tileLayer('https://api.mapbox.com/styles/v1/senseable/cjhjetajy1zjs2sphedz7fmaj/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1Ijoic2Vuc2VhYmxlIiwiYSI6ImxSNC1wc28ifQ.hst-boAjFCngpjzrbXrShw', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    //    maxZoom: 18,
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoic2Vuc2VhYmxlIiwiYSI6ImxSNC1wc28ifQ.hst-boAjFCngpjzrbXrShw'
})

var map = L.map('map', {
    center: [52.3681408,4.860336],
    layers: [mapboxTiles],
    zoom: 12
});

var queue = d3.queue()
    .defer(d3.csv, "polyline_test.csv", parseData)
    .await(drawMap);

function drawMap(err, data) {
    //build polyline
    var polylinePoints = [];
    var canal = []
    //build canal data
    var  allCanalsData = [];
    var canalData = [];
    //load canals into polyline
    for (var i=0; i<data.length; i++) {
        canal.push([data[i].lat, data[i].lon]);
        //this will need to be changed to accomodate flexible numbers of deployments, possibly needing tree structure
        canalData.push({val1: data[i].val1,
                        val2: data[i].val2,
                        val3: data[i].val3,});
        try {
            if (Math.abs(data[i].lat - data[i+1].lat) > .0005 || Math.abs(data[i].lon - data[i+1].lon) > .0005) {
                polylinePoints.push(canal);
                canal = [];
                allCanalsData.push(canalData);
                canalData = [];
            }
        }
        catch (er) {
            break;
        }
    }
    
    var polylineOptions = {
       color: 'blue',
       weight: 3,
       opacity: 0.6
    };
    
    var polyline = new L.Polyline(polylinePoints, polylineOptions);
    map.addLayer(polyline); 
    //map.fitBounds(polyline.getBounds());

    var mapCanal = null;
    polyline.on("click", function(e){
        try {
            map.removeLayer(mapCanal);
        }
        catch (er){}
       
        var selectedCanal = getCanalIndex(e.latlng, polylinePoints);
        mapCanal = new L.Polyline(polylinePoints[selectedCanal], {color: 'red', weight: 6, opacity: 0.9});
        map.addLayer(mapCanal);
        
        plotCanal(allCanalsData[selectedCanal]);
    });
    
}


//dimensions, margins
var margin = {
    t: 10,
    r: 0,
    b: 30,
    l: 30,
};

var width = d3.select('#plot').node().clientWidth - margin.r - margin.l,
    height = d3.select('#plot').node().clientHeight - margin.t - margin.b;

//plot container
var svgPlot = d3.select('#plot')
    .append('svg')
    .attr('width', width + margin.r + margin.l)
    .attr('height', height + margin.t + margin.b);

var boxPlot = svgPlot.append('g')
    .attr('class', 'graph')
    .attr('transform', 'translate(' + margin.l + ',' + margin.t + ')');

//scales
var scaleX = d3.scaleLinear().range([0, width]).nice(),
    scaleY = d3.scaleLinear().range([height, 0]).nice(),
    formatTime = d3.timeFormat('%e %b');

//axes
var axisX = d3.axisBottom().tickFormat(formatTime).scale(scaleX).ticks(),
    axisY = d3.axisLeft().scale(scaleY).tickPadding([5]).ticks();

boxPlot.append('g')
    .attr("class", "axis-x")
    .attr('transform', 'translate(' + 0 + ',' + height + ')')
    /*.call(axisX)*/;

boxPlot.append('g')
    .attr("class", "axis-y")
    /*.call(axisY)*/;


function plotCanal(data) {
    /*separate data by deployment, will need to change to reflect data structure*/
    //FILTER ZERO SHOULD CHANGE//
    var deployments = [];
    deployments.push(data
        .map(function(d) { return d.val1 })
        .filter(function(d) { return d > 0 })
        .sort(function (a, b) { return a - b; }));
    
    deployments.push(data
        .map(function(d) { return d.val2 })
        .filter(function(d) { return d > 0 })
        .sort(function (a, b) { return a - b; }));
    
    deployments.push(data
        .map(function(d) { return d.val3 })
        .filter(function(d) { return d > 0 })
        .sort(function (a, b) { return a - b; }));
    
    //[{med, 75%, max, 25%, min}, ...] for each filtered deployment
    var deploymentData = [];
    for(var i=0; i<deployments.length; i++) {
        //for each deployment, create a dictionary containing corresponding values for box plot
        var length = deployments[i].length;
        if(length>0) {
            deploymentData.push({
                date: new Date("2017-09-0" + (i+2) + " 07:33:12"),
                max: d3.max(deployments[i]),
                upperQuart: deployments[i][Math.floor(length * 3/4)],
                median: deployments[i][Math.floor(length / 2)],
                lowerQuart: deployments[i][Math.floor(length / 4)],
                min: d3.min(deployments[i]),
            });
        }
    }
    
    //update scales
    var minDate = d3.min(deploymentData, function(d) {
            return new Date(d.date)}),
        maxDate = d3.max(deploymentData, function(d) {
            return new Date(d.date)}),
        maxValue = d3.max(deploymentData, function(d) {
            return d.max});
    
    //add a buffer of one day to time scale
    minDateBuf = new Date(minDate);
    minDateBuf.setDate(minDate.getDate() - 1);
    maxDateBuf = new Date(maxDate);
    maxDateBuf.setDate(maxDate.getDate() + 1);
    
    scaleX.domain([minDateBuf, maxDateBuf]);
    scaleY.domain([0, maxValue]);
    
    //update axes
    axisX.ticks(deploymentData.length);
    
    boxPlot.select(".axis-x").call(axisX);
    boxPlot.select(".axis-y").call(axisY);

    //clear previous plot
    d3.selectAll(".box").remove();
    d3.selectAll(".median").remove();
    d3.selectAll(".whiskerLo").remove();
    d3.selectAll(".whiskerUp").remove();
    
    //box
    var box = boxPlot.selectAll(".box").data(deploymentData);
    var boxWidth = 10;
    
    box.enter().append("rect")
        .attr("class", "box")
        .attr("x", function(d) { return scaleX(d.date) })
        .attr("y", function(d) { return scaleY(d.upperQuart) })
        .attr("width", boxWidth)
        .attr("height", function(d) { return Math.abs(scaleY(d.lowerQuart) - scaleY(d.upperQuart)) });
    
    //median line
    var median = boxPlot.selectAll(".median").data(deploymentData);
    
    median.enter().append("line")
        .attr("class", "median")
        .attr("x1", function(d) { return scaleX(d.date) })
        .attr("y1", function(d) { return scaleY(d.median) })
        .attr("x2", function(d) { return scaleX(d.date) + boxWidth })
        .attr("y2", function(d) { return scaleY(d.median) });
    
    //upper whisker
    var upperWhisker = boxPlot.selectAll(".whiskerUp").data(deploymentData);
    
    upperWhisker.enter().append("line")
        .attr("class", "whiskerUp")
        .attr("x1", function(d) { return scaleX(d.date) + (boxWidth/2) })
        .attr("y1", function(d) { return scaleY(d.upperQuart) })
        .attr("x2", function(d) { return scaleX(d.date) + (boxWidth/2) })
        .attr("y2", function(d) { return scaleY(d.max) });
    
    upperWhisker.enter().append("line")
        .attr("class", "whiskerUp")
        .attr("x1", function(d) { return scaleX(d.date) })
        .attr("y1", function(d) { return scaleY(d.max) })
        .attr("x2", function(d) { return scaleX(d.date) + boxWidth })
        .attr("y2", function(d) { return scaleY(d.max) });
    
    //lower whisker
    var lowerWhisker = boxPlot.selectAll(".whiskerLo").data(deploymentData);
    
    lowerWhisker.enter().append("line")
        .attr("class", "whiskerLo")
        .attr("x1", function(d) { return scaleX(d.date) + (boxWidth/2) })
        .attr("y1", function(d) { return scaleY(d.lowerQuart) })
        .attr("x2", function(d) { return scaleX(d.date) + (boxWidth/2) })
        .attr("y2", function(d) { return scaleY(d.min) });
    
    lowerWhisker.enter().append("line")
        .attr("class", "whiskerLo")
        .attr("x1", function(d) { return scaleX(d.date) })
        .attr("y1", function(d) { return scaleY(d.min) })
        .attr("x2", function(d) { return scaleX(d.date) + boxWidth })
        .attr("y2", function(d) { return scaleY(d.min) });
   
}

function getCanalIndex(coord, polyline) {
    var canal = false;
    for (var i=0; i<polyline.length; i++) {
        for (var n=0; n<polyline[i].length; n++) {
            //console.log(Math.abs(coord.lat - polyline[i][n][0])+" "+Math.abs(coord.lng - polyline[i][n][1]))
            var tolerance = map.getZoom() < 14 ? .0005 : .0001;
            if (Math.abs(coord.lat - polyline[i][n][0]) < tolerance && Math.abs(coord.lng - polyline[i][n][1]) < tolerance) {
                canal = polyline[i];
                break;
            }
        }
        if (canal) break;
    }
    return i; 
}

function parseData(d) {
    return {
        lat: d.LAT,
        lon: d.LONG,
        val1: +d.DEP_1,
        val2: +d.DEP_2,
        val3: +d.DEP_3,
    }
}