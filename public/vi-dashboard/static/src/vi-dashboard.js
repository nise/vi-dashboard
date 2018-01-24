var mainColor = '#5f89ad';

/*
 * Pivots two dimensions of the given chart object
 */
function pivotDimensions(obj, first, second) {
    var tmp = obj.dim[first];
    obj.dim[first] = obj.dim[second];
    obj.dim[second] = tmp;
    tmp = obj.keys[first];
    obj.keys[first] = obj.keys[second];
    obj.keys[second] = tmp;
    tmp = obj.labels[first];
    obj.labels[first] = obj.labels[second];
    obj.labels[second] = tmp;

    for (var i = 0; i < obj.filters.length; i++) {
        if (obj.filters[i].indepVar === obj.dim[first]) { //alert( obj.filters[i].indepVar)
            obj.filters[i].colors = d3.scale.ordinal().domain([0]).range([mainColor]);
        } else if (obj.filters[i].indepVar === obj.dim[second]) {
            obj.filters[i].colors = d3.scale.ordinal().domain(obj.keys[second]).range(color_range);
        } else {
            obj.filters[i].colors = d3.scale.ordinal().domain([0]).range([mainColor]);
        }
    }
}


/*
 * chartType, selector, indepVar, depVar, colors, margins
 */
function addFilterChart(obj, ndx) {
    var
        dimension = ndx.dimension(function (d) { return d[obj.indepVar]; }),
        group = dimension.group().reduceSum(function (d) { return +d[obj.depVar]; }),
        margins = obj.margins === undefined ? { top: 0, right: 5, bottom: 20, left: 2 } : obj.margins,
        colors = obj.colors === undefined ? filterSingleColors : obj.colors,
        chart = undefined
        ;
    switch (obj.chartType) {
        case 'rowChart':
            chart = dc.rowChart(obj.selector);
            chart.xAxis().ticks(4);
            chart.margins(margins)
                .height(filterChartHeight);
            break;
        case 'pieChart':
            chart = dc.pieChart(obj.selector);
            chart.innerRadius(20)
                .height(filterChartHeight - 30); // xxx, need to be abstracted
            break;
    }
    chart

        .dimension(dimension)
        .group(group)
        .colors(colors)
        .title(function (p) {
            return obj.indepVar.charAt(0).toUpperCase() + obj.indepVar.slice(1, obj.indepVar.length) + ': ' + p.key + '\n' + 'Value: ' + p.value;
        })
        .label(function (d) { //if(obj.indepVar === 'g'){alert(d.key)}
            return obj.keys[d.key] || d.key;
        })
        ;
    observer.register(chart);
}


/*
 * Resets all charts
 */
function Observer() {

    this.charts = [];

    this.register = function (chart) {
        this.charts.push(chart);
    };

    this.resetCharts = function () {
        for (var i = 0; i < this.charts.length; i++) {
            this.charts[i].filterAll();
        }
        dc.redrawAll();
    };


};

/*
 * Select filter
 **/
function select_filter(obj, select_all) {
    var
        sel = [],
        out = '',
        name = obj.selector.replace(/#./g, '') + '-group',
        yAxisLabel = 'views'
        ;
    select_all = select_all === undefined || null ? false : select_all;
    $.each(obj.items, function (i, val) {
        var label = (obj.labels === undefined ? obj.items[i] : obj.labels[i])
        sel = [
            '<label>',
            '<input type="' + (obj.type === "radio" ? "radio" : "checkbox") + '" name="' + name + '" value="' + obj.items[i] + '" ' + (i === 0 || select_all ? "checked" : "") + ' />',
            label,
            '</label>',
            '<br />'
        ];
        out += sel.join('');
    });
    $(obj.selector).html($(out));

    $(function () {
        //if you have any radio selected by default
        lastSelected[obj.dim] = $('[name="' + name + '"]:checked').val();
    });
    $(document).on('click', '[name="' + name + '"]', function () {
        if (obj.type === 'radio' && lastSelected[obj.dim] != $(this).val() && typeof lastSelected[obj.dim] != "undefined") {
            lastSelected[obj.dim] = $(this).val();
            yAxisLabel = obj.dim === 'scope' ? obj.ylabel[obj.items.indexOf($(this).val())] : yAxisLabel;
            loadData(obj, lastSelected, yAxisLabel);
        } else if (obj.type === 'checkbox') {
            var values = [];
            $.each($("input[name='" + name + "']:checked"), function () {
                values.push($(this).val());
            });
            lastSelected[obj.dim] = values.toString();
            loadData(obj, lastSelected, yAxisLabel);
        }

    });
}


$(document).ready(function () {
    var i18init = i18next
        .use(i18nextXHRBackend)
        .init({
            lng: "en",
            fallbackLng: 'en',
            debug: true,
            ns: ['special', 'common'],
            defaultNS: 'special',
            backend: {
              // load from i18next-gitbook repo
              loadPath: '/static/locales/{{lng}}/translation.json',
              crossDomain: true
            }
        }, function (err, t) {
            $(".title").localize();
            $("#mainGroup").localize();
            $("#chartPeaks").localize();
            $("#chartCordtra").localize();
            
        });

    jqueryI18next.init(i18init, $, {
        tName: 't', // --> appends $.t = i18next.t
        i18nName: 'i18n', // --> appends $.i18n = i18next
        handleName: 'localize', // --> appends $(selector).localize(opts);
        selectorAttr: 'data-i18n', // selector for translating elements
        targetAttr: 'i18n-target', // data-() attribute to grab target element to translate (if diffrent then itself)
        optionsAttr: 'i18n-options', // data-() attribute that contains options, will load/set if useOptionsAttr = true
        useOptionsAttr: false, // see optionsAttr
        parseDefaultValueFromContent: true // parses default values from content ele.val or ele.text
    });

    
});