/*
author: niels.seidel@nise81.com
module: CORDTRA
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
	* CORDTRA Chart
	**/
	app.get('/chart/cordtra', function (req, res) {
		Promise.props({
			groups: LogExt2.find().distinct('group').execAsync(),
			type: LogExt2.find().distinct('action_type').execAsync(),
			context: LogExt2.find().distinct('action_context').execAsync()
		}).then(function (results) {
			res.render('chartCordtra', {
				menu: menu,
				groups: utils.sort(results.groups),
				context: utils.sort(results.context),
				type: utils.sort(results.type),
			});
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	});

	//
	//csv = require('express-csv')
	app.get('/data/cordtra/group/:group/user/:user', function (req, res) {
		var hrstart = process.hrtime();
		var match_query = {};
		match_query.action_type = { "$ne": 'playback' };
		if (req.params.group !== 'all' && req.params.group !== undefined) {
			var groups = req.params.group.split(/,/);
			match_query.group = { "$in": groups };
		}
		if (req.params.user !== 'all' && req.params.user !== undefined) {
			var user = req.params.user.split(/,/);
			user = user.map(function (x) { return parseInt(x, 10); });
			match_query.user = { "$in": user };
		}

		console.log(match_query);

		LogExt2 //
			.aggregate([
				{ "$match": match_query },
				{
					"$group": {
						"_id": {
							"d": "$date",
							"g": "$group",
							"p": "$phase",
							//     "user": "$user",
							"t": "$action_type",
							"c": "$action_context"
						},
						"s": { "$sum": 1 }
					}
				},
				{
					"$project": {
						"_id": 0,
						"d": "$_id.d",
						"g": "$_id.g",
						"p": "$_id.p",
						"t": "$_id.t",
						"c": "$_id.c",
						//		  		"u" : "$_id.user",
						"s": "$s"
					}
				}
			])
			.exec(function (err, data) {
				if (err) {
					res.send(err);
				}
				console.log(data[1]);
				res.jsonp({
					data: data,
					metrics: {
						context: 'group-cordtra',
						path: req._parsedUrl.path,
						size: sizeof(data), //size2: sizeof2.sizeof(results),
						querytime: process.hrtime(hrstart)[1] / 1000000
					}
				});
			});
	});
}

