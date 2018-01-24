/*
author: niels.seidel@nise81.com
module: Peaks
description: 

**/

module.exports = function (app, database) {
	var
		module = {},
		mongoose = require('mongoose'),
		LogExt2 = mongoose.model(database),
		menu = require('./menu').getMenuDOM(),
		async = require('async'),
		utils = require('./utils'),
		Promise = require('bluebird'),
		sizeof = require('object-sizeof')
		;
	require('mongoose').Promise = require('bluebird')
	Promise.promisifyAll(mongoose); // key part - promisification


	/*
	 * Render template for Playback Peak Chart
	 **/
	app.get('/chart/playback-peaks', function (req, res) {
		Promise.props({
			groups: LogExt2.find().distinct('group').execAsync(),
			videos: LogExt2.find().distinct('video_file').execAsync()
		}).then(function (results) {
			res.render('chartPlaybackPeaks', {
				menu: menu,
				videos: results.videos.sort(),
				groups: results.groups.sort(function(a, b){return a-b})
				
			});
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	});


	/*
	 * Obtain data for peak chart
	 * */
	app.get('/data/playback-total-peaks/video/:video/group/:group', function (req, res) {
		var hrstart = process.hrtime();
		var match_query = {};
		match_query.action_type = 'playback';
		if (req.params.video !== undefined) {
			match_query.video_file = req.params.video;
		}
		if (req.params.group !== '-' && req.params.group !== undefined) {
			var groups = req.params.group.split(/,/);
			groups = groups.map(function (x) { return parseInt(x, 10); });
			match_query.group = { "$in": groups };
		}
		//console.log(match_query);

		Promise.props({
			signals: LogExt2
				.aggregate([
					{ "$match": match_query },
					{ $sort: { 'playback_time': -1 } },
					{
						"$group":
						{
							"_id": {
								"segment": "$playback_time",
							},
							"sum": { "$sum": 1 }
						}
					},
					{
						"$project": {
							'_id': 0,
							'count': '$sum'
						}
					},
					{ '$group': { "_id": null, "signal": { $push: "$count" } } },
					{ '$project': { '_id': 0, 'signal': 1 } }
				]).execAsync()
		}).then(function (result) {
			var video_meta = require('/home/abb/Documents/www2/vi-dashboard/import_data/etutor2015-videos.json');
			
			var video = '', markers = {};
			for (var i = 0, len = video_meta.length; i < len; i++) { 
				video = video_meta[i].video.replace('http://141.46.8.101/beta/e2script/','');
				markers[video] = [];
				if (video_meta[i].slides !== undefined) {
					for (var j = 0, len2 = video_meta[i].slides.length; j < len2; j++) {
						markers[video].push({type:'slide', group: i%3, time: video_meta[i].slides[j].starttime });
					}
				}
				if (video_meta[i].assessment !== undefined) {
					for (var j = 0, len2 = video_meta[i].assessment.length; j < len2; j++) {
						markers[video].push({type:'assessment', group: i%3, time: video_meta[i].assessment[j].starttime });
					}
				}
				if (video_meta[i].comments !== undefined && video_meta[i].comments !== null) {
					for (var j = 0, len2 = video_meta[i].comments.length; j < len2; j++) {
						markers[video].push({type:'comment', group: i%3, time: video_meta[i].comments[j].start });
					}
				}
			}
			
			var results = { signal: result.signals[0].signal, unique: 0, markers: markers };
			res.jsonp({
				data: results,
				metrics: {
					context: 'watching-total-peaks',
					path: req._parsedUrl.path,
					size: sizeof(results), //size2: sizeof2.sizeof(results),
					querytime: process.hrtime(hrstart)[1] / 1000000
				}
			});
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	});


	app.get('/data/playback-user-peaks/video/:video/group/:group', function (req, res) {
		var hrstart = process.hrtime();
		var match_query = {};
		match_query.action_type = 'playback';
		if (req.params.video !== undefined) {
			match_query.video_file = req.params.video;
		}
		if (req.params.group !== '-' && req.params.group !== undefined) {
			var groups = req.params.group.split(/,/);
			groups = groups.map(function (x) { return parseInt(x, 10); });
			match_query.group = { "$in": groups };
		}
		//console.log(match_query);
		Promise.props({
			users: LogExt2.find(match_query).distinct('user').execAsync(),
			signals: LogExt2
				.aggregate([
					{ "$match": match_query },
					{ $sort: { 'playback_time': -1 } },
					{
						"$group":
						{
							"_id": {
								"segment": "$playback_time"//,
								//"user": "$user",
							},
							"user": { "$addToSet": '$user' }
						}
					},
					{
						"$project": {
							'_id': 0,
							'segment': "$_id.segment",
							'user': { '$size': "$user" }
						}
					},
					{ '$group': { "_id": null, "signal": { $push: "$user" } } },
					{ '$project': { '_id': 0, 'signal': 1 } }

				]).execAsync()
		}).then(function (result) {
			//console.log(result.users);

			var results = { signal: result.signals[0].signal, unique: result.users.length };
			res.jsonp({
				data: results,
				metrics: {
					context: 'watching-user-peaks',
					size: sizeof(results), //size2: sizeof2.sizeof(results),
					querytime: process.hrtime(hrstart)[1] / 1000000
				}
			});
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	});


	app.get('/data/playback-group-peaks/video/:video/group/:group', function (req, res) {
		var hrstart = process.hrtime();
		var match_query = {};
		match_query.action_type = 'playback';
		if (req.params.video !== undefined) {
			match_query.video_file = req.params.video;
		}
		if (req.params.group !== '-' && req.params.group !== undefined) {
			var groups = req.params.group.split(/,/);
			groups = groups.map(function (x) { return parseInt(x, 10); });
			match_query.group = { "$in": groups };
		}
		//console.log(match_query);
		LogExt2
			.aggregate([
				{ "$match": match_query },
				{ $sort: { 'playback_time': -1 } },
				{
					"$group":
					{
						"_id": {
							"segment": "$playback_time"//,
							//"user": "$user",
						},
						"group": { "$addToSet": '$group' }
					}
				},
				{
					"$project": {
						'_id': 0,
						'segment': "$_id.segment",
						'group': { '$size': "$group" }
					}
				},
				{ '$group': { "_id": null, "signal": { $push: "$group" } } },
				{ '$project': { '_id': 0, 'signal': 1 } }

			])
			.exec(function (err, data) {
				if (err) {
					res.send(err);
				}
				var results = data[0];
				res.jsonp({
					data: results,
					metrics: {
						context: 'watching-group-peaks',
						size: sizeof(results), //size2: sizeof2.sizeof(results),
						querytime: process.hrtime(hrstart)[1] / 1000000
					}
				});
			});
	});

	/**
	 *  Playback speed
	 */
	app.get('/data/playback-speed/video/:video/group/:group', function (req, res) {
		var hrstart = process.hrtime();
		var match_query = {};
		//match_query.action_context = 'playbackSpeed';
		if (req.params.video !== undefined) {
			match_query.video_file = req.params.video;
		}
		if (req.params.group !== '-' && req.params.group !== undefined) {
			var groups = req.params.group.split(/,/);
			groups = groups.map(function (x) { return parseInt(x, 10); });
			//match_query.group = { "$in": groups };
		}
		//console.log(match_query);
		Promise.props({
			//users: LogExt2.find(match_query).distinct('user').execAsync(),
			signals: LogExt2
				.aggregate([
					{ "$match": match_query },
					{ $sort: { 'playback_time': -1 } },
					{
						"$group":
						{
							"_id": {
								"segment": "$playback_time",
								//"session": "$user_session",
							},
							"speed": { "$push": '$playback_speed' }
						}
					},
					{
						"$project": {
							'_id': 0,
							'segment': "$_id.segment",
							'speed': { '$avg': "$speed" }
						}
					},
					{ '$group': { "_id": null, "signal": { $push: "$speed" } } },
					{ '$project': { '_id': 0, 'signal': 1 } }

				]).execAsync()
		}).then(function (data) {
			//console.log(data.signals[0].signal);
			res.jsonp({ signal: data.signals[0].signal });
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	});
}

