/*
author: niels.seidel@nise81.com
module: acl
description: 

**/

module.exports = function(db, app) {
        const db_list = ['LogExt2', 'LogMarkov2', 'LogIWRM'];
        var
            database = db_list[0],
            module = {},
            etut = {};

        // CLI shortcuts
        // e.g.: node --max-old-space-size=8192 server markov // 12288 = 12GB
        switch (process.argv[2]) {
            case 'markov':
                var markov = require('./markov')('LogExt2', 'LogMarkov2', db);
                markov.generate()
                break;
            case 'prepare':
                var preparation = require('./data-preparation')(app, database);
                preparation.explode();
                break;
            case 'import-iwrm':
                var iwrm = require('./import-csv')(app);
                break;
            case 'import-etutor':
                etut = require('./import-etutor')(app);
                break;
            case 'import':
                etut = require('./import-markov')(app);
                break;
            case 'import-scm':
                etut = require('./import-scm')(app);
                break;
            case 'import-etutorxx':
                //var csv = require('./import-csv')(app);
                break;
            default: // start a database
                if (db_list.indexOf(process.argv[2]) !== -1) {
                    database = process.argv[2];
                }
        }


        mongoose = require('mongoose'),
            LogExt2 = mongoose.model(database),
            Metrics = mongoose.model('Metrics'),
            Cache = mongoose.model('Cache'),
            fs = require('node-fs'),
            fss = require('fs'),
            get_ip = require('ipware')().get_ip,
            crossfilter = require("crossfilter"),
            moment = require('moment'),
            menu = require('./menu').getMenuDOM(),
            //	importer = require('./import'),
            async = require('async'),
            utils = require('./utils');
        Promise = require('bluebird');
        require('mongoose').Promise = require('bluebird')
        Promise.promisifyAll(mongoose); // key part - promisification


        // some tests
        // LogExt2.find().limit(1).exec(function (err, data) { console.log(data); console.log('...................................'); });

        //importer.makeCleanLog();


        // sub-acl's
        let
            index = require('./index')(app, database),
            access = require('./acl-access')(app, database),
            // sg neu
            workload = require("./acl-workload")(app, database),

            peaks = require('./acl-peaks')(app, database),
            rewatching = require('./acl-rewatching')(app, database),
            // sg neu
            watchComparison = require("./acl-watch-comparison")(app, database),

            forwardBackward = require('./acl-forward-backward')(app, database),
            playbackHist = require('./acl-playback-histogram')(app, database),
            cordtra = require('./acl-cordtra')(app, database),
            groups = require('./acl-groups')(app, database);

        // Learner Dashboard
        /*learnerDashboard = require("./acl-learner-dashboard")(app, database),
        learnerDashboardUser2 = require("./acl-learner-dashboard-user2")(app, database),	
        learnerDashboardUser3 = require("./acl-learner-dashboard-user3")(app, database),	
        learnerDashboardUser4 = require("./acl-learner-dashboard-user4")(app, database),
        */
        require("./acl-learner-dashboard-user5")(app, database);



        // clear cache on restart
        clearCache();


        /**
         * Prints out the size of the stored datasets
         */
        function dataStatus() {
            Promise.props({
                etutor_org: mongoose.model('LogExt').count().execAsync(),
                etutor: mongoose.model('LogExt2').count().execAsync(),
                markov: mongoose.model('LogMarkov2').count().execAsync(),
                iwrm: mongoose.model('LogIWRM').count().execAsync()
            }).then(function(results) {
                console.log('***********************');
                console.log(results);
                console.log('***********************');
            }).catch(function(err) {
                console.log(err)
                res.send(500); // oops - we're even handling errors!
            });
        }

        dataStatus();


        /* DEFINE ROUTS */




        //Metrics.remove(function (err) { console.log('Removed stored metrics'); });

        app.post('/log/metrics', function(req, res) {
            //console.log(req.body)
            var bam = req.body
            bam.context = bam.context + ',' + database;
            var t = new Metrics(bam);
            t.save();
            //res.end();
        });

        app.get('/log/metrics', function(req, res) {
            Metrics.find().exec(function(err, data) {
                if (err) {
                    console.error(err);
                }
                res.jsonp(data);
            });
        });

        Metrics.find().exec(function(err, data) {
            if (err) { console.error(err); }
            log.write("browser,context,dataset,size,querytime,pageload,d3,pagesum\n");
            for (var i = 0, len = data.length; i < len; i++) {
                data[i].browser = data[i].browser === undefined ? 'chromium' : data[i].browser;
                log.write(data[i].browser + ',' + data[i].context + ',' + data[i].size + ',' + data[i].querytime.toFixed(2) + ',' + data[i].pageload.toFixed(2) + ',' + data[i].d3rendering.toFixed(2) + ',' + (data[i].pageload + data[i].d3rendering).toFixed(2) + '\n');
            }
            //console.log(out);
        });

        var http = require('http');
        var options = {
            host: 'localhost',
            port: 8091,
            path: '/metrics',
            method: 'GET'
        };

        var req = http.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                //console.log('BODY: ' + chunk);
            });
        }).end();


        // method for writing log entries in a file instead:	
        var log = fs.createWriteStream(__dirname + '/../metrics.csv', { 'flags': 'w' }); // use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file
        ///home/abb/Documents/proj_001_doc/pub/51-LAK-dashboards/test-performance/

        /** end logging ************************************************************/





        /** 
         * General cache route
         */
        const caching = false;

        app.get('/cached/data/*', function(req, res) {
            var
                hrstart = process.hrtime(),
                query = req._parsedUrl.path.replace('/cached', '');
            Cache.findOne({ query: query }, function(err, data) {
                if (err) {
                    console.log(err);
                } else if (data !== null && caching) {
                    res.jsonp(data.data);
                    console.info("Cached execution of query '%s' tooks %d ms.", query, (process.hrtime(hrstart)[1] / 1000000).toFixed(2));
                } else {
                    res.redirect(query);
                }
            });
        });


        /**
         * Clear cache completely
         */
        function clearCache() {
            Cache.remove(function(err, d) {});
        }


        /**
         * Generates a list of existing express routes. This list could be rendered as part of a data API documentation
         */
        app.get('/api', function(req, res) {
            var
                paths = [],
                route = [];
            paths['data'] = [];
            paths['chart'] = [];

            app._router.stack.forEach(function(r) {
                if (r.route && r.route.path) {
                    route = r.route.path.split('/'); //console.log(route)
                    if (route[1] === 'chart' || route[1] === 'data') {
                        paths[route[1]].push(route.join('/')); // .slice(2, route.length)
                    }
                }
            });
            //console.log(paths);
            res.render('api', paths);
        });


        /**
         * Renders a page to run performance tests 
         */
        app.get('/testing', function(req, res) {
            res.render('testing');
        });



        /**
         * Page not found. Last route.
         */
        app.use(function(req, res, next) {
            res.status(404);

            // respond with html page
            if (req.accepts("html")) {
                res.render("404", { url: req.url, title: "404 Error", i18title: "ui-content.404-title", menu: menu });
                return;
            }

            // respond with json
            if (req.accepts("json")) {
                res.send({ error: "Not found" });
                return;
            }

            // default to plain-text. send()
            res.type("txt").send("Not found");
        });


    } // end module