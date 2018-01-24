
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var Cache = new Schema({
	query: String,
	data: Schema.Types.Mixed,
	updated: { type: Date, default: Date.now }
});
mongoose.model('Cache', Cache);


var Metrics = new Schema({
	browser: String,
	context: String,
	size: Number,
	querytime: Number,
	pageload: Number,
	d3rendering: Number,
	updated: { type: Date, default: Date.now }
});
mongoose.model('Metrics', Metrics);


var Log = new Schema({
	utc: Number,
	phase: Number,
	date: String,
	time: String,
	session: String,

	group: String,
	user: Number,
	user_name: String,
	user_gender: String,
	user_culture: String,
	user_session: Number,

	video_id: String,
	video_file: String,
	video_length: String,
	video_language: String,

	action: {
		context: String,
		action: String,
		values: Array
	},
	playback_time: Number,
	user_agent: String,
	ip: String,
	flag: Boolean
});
mongoose.model('Log', Log);


// extended Log
var LogExt = new Schema({
	utc: Number,
	date: String,
	time: String,
	phase: Number,

	group: String,
	user: Number,
	user_name: String,
	user_gender: String,
	user_culture: String,
	user_session: Number,

	group_name: String,
	group: String,

	video_id: String,
	video_file: String,
	video_length: String,
	video_language: String,
	playback_time: Number,

	action_context: String,
	action_type: String,
	action_value: String,
	action_artefact: String,
	action_artefact_id: String,
	action_artefact_author: String,
	action_artefact_time: String,
	action_artefact_response: String,

	ua_browser_version: String,
	ua_browser_engine: String,
	ua_os: String,
	ua_os_version: String,
	ua_device: String,
	ip: String
});
mongoose.model('LogExt', LogExt);


var logStructure = {
	the_date: Date,
	utc: Number,
	date: String,
	time: String,
	phase: Number,

	user: Number,
	user_name: String,
	user_gender: String,
	user_culture: String,
	user_session: Number,

	group_name: String,
	group: Number,

	video_id: Number,
	video_file: String,
	video_length: String,
	video_language: String,
	playback_time: Number,
	playback_speed: Number,

	action_context: String,
	action_type: String,
	action_value: String,
	action_artefact: String,
	action_artefact_id: String,
	action_artefact_author: String,
	action_artefact_time: String,
	action_artefact_response: String,

	ua_browser_version: String,
	ua_browser_engine: String,
	ua_os: String,
	ua_os_version: String,
	ua_device: String,
	ip: String,
	ip_country: String,
	ip_city: String,
	ip_zip: String,
	ip_ll: Array
};

var LogExt2 = new Schema(logStructure);
var Logmarkov2 = new Schema(logStructure);
var IWRM = new Schema(logStructure);
mongoose.model('LogExt2', LogExt2);
//mongoose.model('LogMarkov', LogExt2);
mongoose.model('LogMarkov2', Logmarkov2);
mongoose.model('LogIWRM', IWRM);

