/*
author: niels.seidel@nise81.com
module: Retention
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
		Promise = require('bluebird')
		;
	require('mongoose').Promise = require('bluebird')
	Promise.promisifyAll(mongoose); // key part - promisification


	/*
	 * Render template for Playback Peak Chart
	 **/
	app.get('/chart/retention-rate', function (req, res) {
		Promise.props({
			users: LogExt2.find().distinct('user').execAsync(),
			videos: LogExt2.find().distinct('video_file').execAsync()
		}).then(function (results) {
			res.render('chartRetentionRate', {
				menu: menu,
				users: utils.sort(results.groups),
				videos: utils.sort(results.videos)
			});
		}).catch(function (err) {
			console.log(err);
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
			match_query.group = { "$in": utils.array2int( req.params.group.split(/,/) ) };
		}
		console.log(match_query);
		LogExt2
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

			])
			.exec(function (err, data) {
				if (err) {
					res.send(err);
				}
				console.log(data[0].signal[0]);
				res.jsonp(data[0]);
				console.info("Execution of playback-peaks tooks: %dms of %d items", process.hrtime(hrstart)[1] / 1000000, data.length);
			});
	});


}

