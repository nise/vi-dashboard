/*
author: niels.seidel@nise81.com
module: Forward-backward
description: 

**/

module.exports = function (app, database) {
	var
		module = {},
		mongoose = require('mongoose'),
		LogExt2 = mongoose.model(database),
		Cache = mongoose.model('Cache'),
		menu = require('./menu').getMenuDOM(),
		async = require('async'),
		Promise = require('bluebird'),
		utils = require('./utils'),
		sizeof = require('object-sizeof')
		;
	require('mongoose').Promise = require('bluebird')
	Promise.promisifyAll(mongoose); // key part - promisification

	mongoose.set('debug', true, function (coll, method, query, doc) {
		log.debug('query executed:', coll, method, query, doc);
	});

	/*
	 * ForwardBackward 
	 **/
	app.get('/chart/forward-backward', function (req, res) {
		Promise.props({
			videos: LogExt2.find().distinct('video_file').execAsync(),
			groups: LogExt2.find().distinct('group').execAsync(),
			context: LogExt2.find().distinct('action_context').execAsync()
		}).then(function (results) {
			//console.log(results);
			res.render('chartForwardBackward', {
				menu: menu,
				videos: results.videos.sort(),
				groups: results.groups.sort(function (a, b) { return a - b }),
				context: results.context.sort()
			});
		}).catch(function (err) {
			console.log(err)
			res.send(500); // oops - we're even handling errors!
		});
	});


	/*
	 * ForwardBackward Navigation for all users
	 */
	app.get('/data/forward-backward/videos/:video/groups/:group', function (req, res) {///user/:user/video/:video
		const hrstart = process.hrtime();
		var match_query = {};
		if (req.params.video !== undefined) {
			match_query.video_file = { "$in": req.params.video.split(/,/) };
		}
		if (req.params.group !== undefined) {
			match_query.group = { "$in": utils.map2Int(req.params.group.split(/,/)) };
		}
		LogExt2
			.aggregate(getQuery(match_query))
			.exec(function (err, the_data) {
				if (err) {
					res.send(err);
				}
				var
					tmp = { time: 0 },
					x = 0,
					y = 0,
					c = 0,
					maxX = 0,
					maxY = 0,
					users = [],
					groups = [],
					result = [],
					data = {}
					;
				// iterate users		
				for (var j = 0; j < the_data.length; j++) {
					data = the_data[j].a;
					users.push(the_data[j].user);
					groups.push(the_data[j].group);
					// reset
					tmp = { time: 0, utc: data[0].utc };
					x = 0;
					y = 0;
					result[j] = [];
					;
					// iterate activities	 
					for (var i = 0; i < data.length; i++) {
						// determine forward backward distribution
						var diff_playback = tmp.time - data[i].playback_time;  // difference of playback time
						var diff_time = (data[i].utc - tmp.utc) / 1000; // difference of physical time in seconds
						// forward - playback
						if (diff_playback < 0 && Math.abs(diff_time) - Math.abs(diff_playback) < 3) {//if its real playback time, not a forward jump, then:
							x = x + Math.abs(diff_playback);
						}
						// backward jumps
						else if (diff_playback >= 0) {
							var tt = y;
							y = y + Math.abs(diff_playback);
						}
						maxX = Math.max(x, maxX);
						maxY = Math.max(y, maxY);
						result[j].push({ x: Math.floor(x), y: Math.floor(y), t: data[i].type, c: data[i].context })
						tmp = { utc: data[i].utc, time: data[i].playback_time };
						c++;
					} // end for entries
				}
				var finData = { results: result, maxX: maxX, maxY: maxY, users: users, groups: groups };
				//console.log(result)
				res.jsonp({
					data: finData,
					metrics: {
						context: 'interaction-forwardbackward',
						path: req._parsedUrl.path,
						size: sizeof(finData), //size2: sizeof2.sizeof(results),
						querytime: process.hrtime(hrstart)[1] / 1000000
					}
				});
				var t = new Cache({ query: req._parsedUrl.path, data: result });
				t.save();
				
			});
	});

	function getQuery(match_query) {
		return [
			{ "$match": match_query },
			{
				'$group': {
					'_id': {
						'user': "$user",
						'group': "$group"
					},
					'a': { '$push': { 'utc': '$utc', 'playback_time': '$playback_time', 'context': '$action_context', 'type': '$action_type' } }
				}
			},
			//{ "$sort": { "_id.group": 1 } },
			{ '$project': { 'user': '$_id.user', 'group': '$_id.group', '_id': 0, "a": 1 } } /*, "session":'$_id.session'*/
		]
	}
}