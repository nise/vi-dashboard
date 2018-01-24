/*
author: niels.seidel@nise81.com
module: acl
description: 

**/

module.exports = function (db, app) {
	const db_list = ['LogExt2', 'LogMarkov2', 'LogIWRM'];
	var
		database = db_list[2],
		module = {}
		;

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
			var etut = require('./import-etutor')(app);
			break;
		case 'import':
			var etut = require('./import-markov')(app);
			break;
		case 'import-etutor':
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
		utils = require('./utils')
		;
	Promise = require('bluebird')
		;
	require('mongoose').Promise = require('bluebird')
	Promise.promisifyAll(mongoose); // key part - promisification


	// some tests
	// LogExt2.find().limit(1).exec(function (err, data) { console.log(data); console.log('...................................'); });

	//importer.makeCleanLog();

	let
		index = require('./index')(app, database),
		access = require('./acl-access')(app, database),
		cordtra = require('./acl-cordtra')(app, database),
		peaks = require('./acl-peaks')(app, database),
		rewatching = require('./acl-rewatching')(app, database),
		forwardBackward = require('./acl-forward-backward')(app, database),
		groups = require('./acl-groups')(app, database),
		playbackHist = require('./acl-playback-histogram')(app, database)
		;



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
		}).then(function (results) {
			console.log('***********************');
			console.log(results);
			console.log('***********************');
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	}

	dataStatus();


	/* DEFINE ROUTS */




	//Metrics.remove(function (err) { console.log('Removed stored metrics'); });

	app.post('/log/metrics', function (req, res) {
		//console.log(req.body)
		var bam = req.body
		bam.context = bam.context + ',' + database;
		var t = new Metrics(bam);
		t.save();
		//res.end();
	});

	app.get('/log/metrics', function (req, res) {
		Metrics.find().exec(function (err, data) {
			if (err) {
				console.error(err);
			}
			res.jsonp(data);
		});
	});

	Metrics.find().exec(function (err, data) {
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

	var req = http.request(options, function (res) {
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			//console.log('BODY: ' + chunk);
		});
	}).end();


	// method for writing log entries in a file instead:	
	var log = fs.createWriteStream('/home/abb/Documents/proj_001_doc/pub/51-LAK-dashboards/test-performance/metrics.csv', { 'flags': 'w' }); // use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file

	/** end logging ************************************************************/





	/** 
	 * General cache route
	 */
	const caching = false;

	app.get('/cached/data/*', function (req, res) {
		var
			hrstart = process.hrtime(),
			query = req._parsedUrl.path.replace('/cached', '')
			;
		Cache.findOne({ query: query }, function (err, data) {
			if (err) {
				console.log(err);
			}
			else if (data !== null && caching) {
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
		Cache.remove(function (err, d) {
			//console.log('- Cleared cached data'); 
		});
	}
	/** end caching ************************************************************/


	/**
	 * Some utils
	 
	//
	function countt() {
		//LogExt2.count({}, function (err, count) { console.log("Number of users:", count); });
		LogExt2.aggregate([
			//{ '$sort': {'$user': 1} }, 
			{
				"$group": {
					"_id": {
						"s": "$user_session",
						"u": "$user"
					},
					"count": { "$sum": 1 }
					//"sessions": { "$addToSet": '$s' },

				}
			}, {
				"$group": {
					"_id": {
						"sess": "$_id.s"
					},
					"c": { "$sum": 1 }
				}

			}, { "$project": { 'se': "$_id.sess", 'co': "$c", '_id': 0 } }
		]).exec(function (err, count) {
			var sum = 0;
			for (var i = 0; i < count.length; i++) { sum += count[i].co; }
			//console.log("Number of users:", count, sum);
		});
	}
	//countt();
*/







	/*
	* Obtain data for playback jumps
	* status: unfished xxx 
	* */
	app.get('/data/playback-jumps/video/:video', function (req, res) {
		var hrstart = process.hrtime();
		var match_query = {};
		match_query.action_type = { '$in': ['seek-stop'] }; // ,'seek-start','skip-back',,'skip-back'
		if (req.params.video !== undefined) {
			match_query.video_file = req.params.video;
		} else {
			match_query.video_file = 'e2script_lecture2_improved.mp4';
		}
		match_query.video_file = 'e2script_lecture3_improved.mp4';
		console.log(match_query);

		Promise.props({
			signals: LogExt2
				//.find(match_query).select('action_type action_value')
				.aggregate([
					{ "$match": match_query },
					//{ $sort: { 'playback_time': -1 } },
					{
						"$group":
						{
							"_id": {
								"segment": "$playback_time",
								"type": "$action_type",
								"v": "$action_value"
							},
							"sum": { "$sum": 1 }//,
							//"value": { "$push": '$action_value' }
						}
					},
					{
						"$project": {
							'_id': 0,
							'out': '$_id.segment',
							'type': '$_id.type',
							'sum': '$sum',
							'in': '$_id.v'
						}
					}
				])
				.execAsync()
		}).then(function (result) {
			console.log(result.signals);
			res.end();
			//res.jsonp({ signal: result.signals[0].signal, unique: 0 });
			console.info("Execution of playback-peaks tooks: %dms of %d items", process.hrtime(hrstart)[1] / 1000000, 0);
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	});







	//xxx refactor
	app.get('/chart/playback-interactions/group/:group/user/:user', function (req, res) {
		var hrstart = process.hrtime();
		var match_query = {};
		match_query.action_type = { "$ne": 'playback' };
		if (req.params.group !== 'all' && req.params.group !== undefined) {
			var groups = req.params.group.split(/,/);
			groups = groups.map(function (x) { return parseInt(x, 10); });
			match_query.group = { "$in": groups };
		}
		if (req.params.user !== 'all' && req.params.user !== undefined) {
			var user = req.params.user.split(/,/);
			user = user.map(function (x) { return parseInt(x, 10); });
			match_query.user = { "$in": user };
		}
		console.log(match_query)
		LogExt2
			.aggregate([
				{ "$match": match_query },
				{
					"$group": {
						"_id": {
							"g": "$group",
							"p": "$phase",
							"t": "$action_type",
							"c": "$action_context"
						},
						"s": { "$sum": 1 }
					}
				}
			])
			.exec(function (err, data) {
				if (err) {
					res.send(err);
				}
				console.log(data[1]);
				res.render('chartPlayBackInteraction', { items: data, menu: menu });
			});
		console.info("Execution of query tooks: %dms", process.hrtime(hrstart)[1] / 1000000);
	});

	app.get('/admin/test', function (req, res) {
		res.render('test-speed');
	});





















	/************** TESTS ******************+*/

	// TEST: crossfilter on server side
	app.get('/chartTest1', function (req, res) {
		Log
			.find({})
			.limit(20)
			.exec(function (err, data) {
				if (err) {
					res.send(err);
				}
				var ndx = crossfilter(data);
				var dimension = ndx.dimension(function (d) {
					return d.group;
				});
				var group = dimension.group();
				console.log(group);
				//res.json(data);
				res.render('chartTest1', { items: data });
			});
	});



	/**
	 * Generates a list of existing express routes. This list could be rendered as part of a data API documentation
	 */
	app.get('/api', function (req, res) {
		var
			paths = [],
			route = []
			;
		paths['data'] = [];
		paths['chart'] = [];

		app._router.stack.forEach(function (r) {
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
	app.get('/testing', function (req, res) {
		res.render('testing');
	});



	/**
	 * Page not found. Last route.
	 */
	app.use(function (req, res, next) {
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