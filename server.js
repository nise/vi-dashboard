/*
 * @author: niels.seidel@nise81.com
 * @titel: Vi-Dashboard
 * @description: Learning dashboard for visualizing log data form collaborative video-based learning environments.
 **/


//require('@glimpse/glimpse').init();
require('./db');

var
	express = require('express'),
	expressValidator = require('express-validator'),
	expressMinify = require('express-minify-html'),
	expressMetrics = require('express-metrics'),
	app = express(),
	compression = require('compression'),
	path = require('path'),
	flash = require('connect-flash'),
	server = require('http').createServer(app),
	mongoose = require('mongoose')
	;

let settings = {
	caching: true,
	application: 'vi-dashboard',
	port: 3000
};

/* 
 * Returns the name of the currently running application
 **/
exports.application = function (req, res) {
	return settings.application;
};


/*
 * Returns the server
 **/
exports.server = function (req, res) {
	return server;
};


/* configure application **/
app.set('port', process.env.PORT || settings.port);

var expressWinston = require('express-winston');
var winston = require('winston'); // for transports.Console

app.use(expressWinston.logger({
	transports: [
		new winston.transports.Console()
	],
	format: winston.format.combine(
		winston.format.colorize(),
		winston.format.splat(),
		winston.format.simple()//..json()
	)
}));
winston.log('info', 'test message %s', 'my string');
app.use(expressMetrics({ port: 8091 })); // start a metrics server
app.use(compression())
app.use(expressMinify({
	override: true,
	exception_url: false, //['/path/that/should/not/be/minified']
	htmlMinifier: {
		removeComments: true,
		collapseWhitespace: true,
		collapseBooleanAttributes: true,
		removeAttributeQuotes: true,
		removeEmptyAttributes: true,
		minifyJS: true
	}
}));
app.use(express.static(path.join(__dirname, 'public/' + settings.application)));
app.set('views', __dirname + '/public/' + settings.application + '/static/views');
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs-locals'));

var cookieParser = require('cookie-parser');
app.use(cookieParser());
var json = require('express-json');
app.use(json());
var bodyParser = require('body-parser');
app.use(expressValidator());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var methodOverride = require('method-override');
app.use(methodOverride());
var session = require('express-session');
app.use(session({
	secret: 'keyb22oar4d cat',
	saveUninitialized: true,
	resave: true
}));
app.use(flash());
//app.use(users.passport.initialize());
//app.use(users.passport.session());
app.set("jsonp callback", true); // ?????



/* 
* Init database, load data, and init ACL 
**/
mongoose.Promise = require('bluebird');
var conn = mongoose.connect(
	'mongodb://localhost:27017/' + settings.application, 
	{
		useMongoClient: true,
		promiseLibrary: require('bluebird')
	})
	.then(() => {
		// Initialize Access Control List 
		var ACL = require('./routes/acl')(conn, app, settings);
		// start server
		server.listen(settings.port);
		//server.setMaxListeners(0);
		console.log(process.env.NODE_ENV);
		console.log('\n\n***************************************************************');
		console.log('Started server for application »' + settings.application + '« on port ' + settings.port);
		console.log('***************************************************************\n\n');
		return;
	})
	.catch(err => { // mongoose connection error will be handled here
		console.error('App starting error:', err.stack);
		process.exit(1);
	});

