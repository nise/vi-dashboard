/*
author: niels.seidel@nise81.com
module: Data Preparation
description: 

**/

module.exports = function (source, target) {
	var
		module = {},
		mongoose = require('mongoose'),
		LogExt2 = mongoose.model('LogExt2'),
		LogExt = mongoose.model('LogExt'),
		moment = require('moment'),
		ProgressBar = require('ascii-progress')
		;


	/**
	 * Data preparation
	 * 
	 */
	module.explode = function (req, res) {
		console.log('Started data preparation')
		var bar = new ProgressBar({
			schema: ':bar',
			total: 61599
		});
		var speed = [];
		LogExt2.remove().exec(function (err, x) {
			if (err) {
				res.send(err);
			}
			var stream = LogExt.find().cursor();
			// explode from scratch	 	
			stream
				.on("error", function (err) { console.log(err); })
				.on("end", function (data) { console.log('finished import'); })
				.on("data", function (data) {
					console.log('prepare log entry '+data.utc);
					// setup playback speed as a permanent field by fetching the change events	
					speed[data.user] = speed[data.user] || [];
					speed[data.user][data.user_session] = speed[data.user][data.user_session] || 1;
					speed[data.user][data.user_session] = data.action_context === 'playbackSpeed' ? data.action_value : speed[data.user][data.user_session];
					//console.log(speed[data.user][data.user_session])
					bar.tick();
					var entry = {
						utc: data.utc,
						date: data.date,
						time: data.time,
						phase: data.phase,

						group: data.group.charCodeAt(0),
						user: data.user,
						//user_name: String,
						//user_gender: String,
						//user_culture: String,
						user_session: data.user_session,

						//group_name: String,

						video_id: parseInt(data.video_id),
						video_file: data.video_file,
						//video_length: String,
						//video_language: String,
						playback_time: Math.ceil(data.playback_time),
						playback_speed: speed[data.user][data.user_session], //newly added

						action_context: data.action_context,
						action_type: data.action_type,
						action_value: data.action_value,
						/*						action_artefact: String,
											action_artefact_id: String,
											action_artefact_author: String,
											action_artefact_time: String,
											action_artefact_response: String,*/

						ua_browser_version: data.ua_browser_version,
						//ua_browser_engine: String,
						ua_os: data.ua_os,
						//ua_os_version: String,
						ua_device: data.ua_device,
						//ip: String
					};
					entry.the_date = new Date(data.utc);

					// to do:
					//applyHook('data-preparation');
					if (data.action_type !== 'playback' && data.action_context === 'player') {
						data.action_context === 'navigation';
					}
					//console.log(data)
					if (data.video_file !== 'e2script_kickoff.mp4') {
						if (data.action_type === 'playback') {
							var start = data.action_value * 5; // extrapolate playback time by the segment id
							for (var j = 0; j < 5; j++) {
								entry.playback_time = start + j;

								var d = moment.utc(data.utc);
								d.add(j, 'seconds')
								entry.utc = d.utc().valueOf();
								entry.date = d.format("DD-MM-YYYY");
								entry.time = d.format("hh:mm:ss");
								entry.the_date = d.toDate();
								new LogExt2(entry).save(function(e){ console.log('Saved prepared log '+data.utc);});
							}
						} else {
							new LogExt2(entry).save(function (e) { console.log('Saved prepared log ' + data.utc); });
						}
					}
				});	// end stream data	
		});	// end remove
	};

	module.explode();

	return module;
};

