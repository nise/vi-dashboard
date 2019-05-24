var mainColor = '#5f89ad'; //blue

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


/**
 * DC.js util to create filter charts. 
 * @param obj (Object) chartType, selector, indepVar, depVar, colors, margins
 * @param ndx 
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


/**
 * Observer
 */
function Observer() {

    this.charts = [];

    this.register = function (chart) {
        this.charts.push(chart);
    };

    this.resetCharts = function () {
        for (var i = 0; i < this.charts.length; i++) {
            console.log(this.charts[i])
            this.charts[i].filterAll();
        }
        dc.redrawAll();
    };


}

/** 
 * Select filter
 * @param obj (Object) See example:
 *  { dim: 'video', type: 'checkbox', items: file_keys, selector: '#video-select' }, true
 *  { dim: 'group', type: 'checkbox', items: group_keys, selector: '#group-select' }, true
 * @param select_all (Boolean) predefined selection of all options
 * @param callback (Function) Callback function that will apply the filter settings
 */
function select_filter(obj, select_all, callback) {
    var
        sel = [],
        out = '',
        // sg korrektur -         name = obj.selector.replace(/#./g, '') + '-group',
        name = obj.selector.replace(/#/g, '') + '-group',
        yAxisLabel = 'views'
        ;
    // console.log("select_filter - name: ", name); // -> Rewatching: group-select-group

    select_all = select_all === undefined || null ? false : select_all; // true
    
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
        //if you have any RADIO OR CHECKBOXES selected by default
        // vorher - lastSelected[obj.dim] = $('[name="' + name + '"]:checked').val();
        // lastSelected[obj.dim] = $("[name='" + name + "']:checked").val();
        // console.log("select_filter - lastSelected[obj.dim] 1a: ", lastSelected[obj.dim]);

        // SG - NEU - damit auch die Mehrfachwerte einer default-Checkbox berücksichtigt werden
        let preValues = [];
        $.each($("input[name='" + name + "']:checked"), function () {
            preValues.push($(this).val());
        });
        lastSelected[obj.dim] = preValues.toString();
        //console.log("select_filter - lastSelected[obj.dim] 1b: ", lastSelected[obj.dim]);
    });
    
    $(document).on('click', '[name="' + name + '"]', function () {

        if (obj.type === 'radio' && lastSelected[obj.dim] != $(this).val() && typeof lastSelected[obj.dim] != "undefined") {
            
            // sg - lastSelect[obj.dim] -> aktuelle Auswahl z.B. lastSelected.group = 97
            lastSelected[obj.dim] = $(this).val(); 
            //console.log("select_filter - lastSelected[obj.dim] 2: ", lastSelected[obj.dim]);

            // sg neu - fehlender Parameter obj.dim.third für dc color-coding
            // obj.dim.third = 2;

            // sg - y-Label: falls scope, sonst "views"
            yAxisLabel = obj.dim === 'scope' ? obj.ylabel[obj.items.indexOf($(this).val())] : yAxisLabel;
            //console.log("select_filter - yAxisLabel: ", yAxisLabel);

            callback(obj, lastSelected, yAxisLabel);
        
        } else if (obj.type === 'checkbox') {
            var values = [];
            // sg - name = "video-select-group" || "group-select-group"
            $.each($("input[name='" + name + "']:checked"), function () {
                values.push($(this).val());
            });
            // sg - lastSelected[video] oder lastSelected[group] wird gefüllt; die jeweils andere Property bleibt erhalten
            lastSelected[obj.dim] = values.toString();
            callback(obj, lastSelected, yAxisLabel);
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
            /*$(".title").localize();
            $("#mainGroup").localize();
            $("#chartPeaks").localize();
            $("#chartCordtra").localize();*/
            
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