/*
author: niels.seidel@nise81.com
module: Index
description: 

**/

module.exports = function (app, database) {
    var
        module = {},
        mongoose = require('mongoose'),
        Log = mongoose.model(database),
        Cache = mongoose.model('Cache'),
        menu = require('./menu').getMenuDOM(),
        async = require('async'),
        utils = require('./utils'),
        Promise = require('bluebird'),
        sizeof = require('object-sizeof')
        ;
    require('mongoose').Promise = require('bluebird')
    Promise.promisifyAll(mongoose); // key part - promisification


    /*
	 * Fetches the main characteristics of the used data set in order to render these information on the index page of the dashboard 
	 **/
    app.get('/chart/index', function (req, res) {
        Promise.props({
            logs: Log.count().execAsync(),
            videos: Log.find().distinct('video_file').execAsync(),
            groups: Log.find().distinct('group').execAsync(),
            users: Log.find().distinct('user').execAsync(),
            phases: Log.find().distinct('phase').execAsync(),
            sessions: Log.aggregate([
                {
                    $group: {
                        _id: {
                            'user': '$user'
                        },
                        'sessions': { '$addToSet': '$user_session' }
                    }
                },
                {
                    '$project': {
                        sessions: { '$size': '$sessions' },
                        _id: 0
                    }
                }
            ]).execAsync(),
            time: Log.aggregate([
                {
                    '$group': {
                        '_id':{},
                        'mmin': { '$min': '$utc' },
                        'mmax': { '$max': '$utc' }
                       
                    }
                },
                {
                    '$project': {
                        _id: 0,
                        'min': '$mmin',
                        'max': '$mmax',
                        'range': { '$subtract': ['$mmax', '$mmin'] }
                    }
                }
            ]).execAsync()
        }).then(function (results) {
            var data = {
                menu: menu,
                logs: results.logs,
                videos: results.videos.length,
                users: results.users.length,
                groups: results.groups.length,
                phases: results.phases.length,
                sessions: results.sessions.length,
                time: results.time[0],
            };
            //console.log(data);
            res.render('index', {data: data} );
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });

} // end module