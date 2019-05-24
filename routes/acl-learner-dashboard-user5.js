/*
author: sascha.gastel@mailbox.org
module: Learner Dashboard
description: 

**/

module.exports = function(app, database) {
    //console.log("=== START_acl-workload ===");
    var
        module = {},
        mongoose = require('mongoose'),
        LogExt2 = mongoose.model(database),
        Cache = mongoose.model('Cache'),
        menu = require('./menu').getMenuDOM(),
        async = require('async'),
        utils = require('./utils'),
        Promise = require('bluebird'),
        sizeof = require('object-sizeof');
    require('mongoose').Promise = require('bluebird')
    Promise.promisifyAll(mongoose); // key part - promisification


    var match_query = {};
    match_query.playback_time = { '$ne': 0 }
        // TEST_USER
    match_query.user = 13;
    referenceUser = 13


    /*
     * Learner Dashboard URL - Render template
     **/
    app.get('/chart/learner-dashboard-user5', function(req, res) {
        Promise.props({
            // get the videos from database
            videos: LogExt2.find().distinct('video_file').execAsync(),
        }).then(function(results) {
            res.render('chartLearnerDashboardUser5', {
                menu: menu,
                videos: utils.sort(results.videos),
            });
        }).catch(function(err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });

    /*
     *    Status *********************************************
     */
    app.get('/data/learner-dashboard-user5/status', function(req, res) {

        var hrstart = process.hrtime();
        var match_query = {};

        // build the query
        match_query.playback_time = { '$ne': 0 }; // not equal 0
        match_query.user = referenceUser;
        match_query.action_context = "player";
        match_query.action_type = "playback";

        if (req.params.video !== undefined) {
            var videos = req.params.video.split(/,/);
            match_video_file = { "$in": videos };
            match_query.video_file = match_video_file;
        }

        // load meta-data video -> videotitle: videolength
        var videoMetaSource = require('../import_data/etutor2015-videos.json');
        var videoMeta = {}
        for (var i = 0, len = videoMetaSource.length; i < len; i++) {
            filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/', '');
            videolength = videoMetaSource[i].metadata[0].videolength;
            videoMeta[filename] = videolength;
        }
        console.log("STATUS videoMeta: ", videoMeta);

        console.log("STATUS match_query: ", match_query);

        Promise.props({

            userStatus_completeWatching: LogExt2.aggregate([

                // each event === one second watched
                { $match: match_query },
                {
                    $group: {
                        "_id": {
                            "user": "$user"
                        },
                        "count": { $sum: 1 }
                    }
                },
                {
                    $project: {
                        "_id": 0,
                        "user": "$_id.user",
                        "sum": "$count"
                    }
                }

            ]).execAsync(),

            userStatus_uniqueWatching: LogExt2.aggregate([

                // each event === one second watched
                { $match: match_query },
                { $sort: { "playback_time": -1 } },
                // distinct playback_time
                {
                    $group: {
                        "_id": {
                            "user": "$user",
                            "vid": "$video_file",
                            "sec": "$playback_time"
                        }
                    }
                },
                // count selection
                {
                    $group: {
                        "_id": { "user": "$_id.user" },
                        "count": { $sum: 1 }
                    }
                },
                {
                    $project: {
                        "_id": 0,
                        "user": "$_id.user",
                        "sum": "$count"
                    }
                }

            ]).execAsync(),

            userStatus_lastAccess: LogExt2.aggregate([

                // each event === one second watched
                { $match: match_query },
                { $sort: { "playback_time": -1 } },
                // distinct playback_time
                {
                    $group: {
                        "_id": {
                            "user": "$user",
                            //    "date" : "$the_date"
                        },
                        "maxUtc": { $max: "$utc" },

                    }
                },
                {
                    $project: {
                        "_id": 0,
                        "user": "$_id.user",
                        //     "date" : "$_id.the_date", 
                        "maxUtc": "$maxUtc"
                    }
                }

            ]).execAsync(),

        }).then(function(results) {
            res.jsonp({
                data: results,
                // meta-data videoname: videolength
                videometa: videoMeta,
                metrics: {
                    context: 'learnerDashboard',
                    path: req._parsedUrl.path,
                    size: sizeof(results), //size2: sizeof2.sizeof(results),
                    querytime: process.hrtime(hrstart)[1] / 1000000
                }
            });
            console.log("Results_LearnerDashboard - User Status: ", results)
        }).catch(function(err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });


    /*
     *    TimeSpentVideo *********************************************
     */
    app.get('/data/learner-dashboard-user5/timespent-video/video/:video', function(req, res) {

        var hrstart = process.hrtime();
        // build the query-object for the aggregations
        var match_query = {};
        match_query.playback_time = { '$ne': 0 }; // not equal 0
        match_query.user = referenceUser;

        if (req.params.video !== undefined) {
            var videos = req.params.video.split(/,/);
            //videos = videos.map(function (x) { return parseInt(x,); });
            match_video_file = { "$in": videos };
            match_query.video_file = match_video_file;
            match_query.action_context = "player";
            match_query.action_type = "playback";
        }

        // load meta-data video -> videotitle: videolength
        var videoMetaSource = require('../import_data/etutor2015-videos.json');
        var videoMeta = {}
        for (var i = 0, len = videoMetaSource.length; i < len; i++) {
            filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/', '');
            videolength = videoMetaSource[i].metadata[0].videolength;
            videoMeta[filename] = videolength;
        }
        console.log("TIMESPENT videoMeta: ", videoMeta);

        console.log("TIMESPENT match_query: ", match_query);

        Promise.props({
            timespentVideo: LogExt2.aggregate([

                // each event === one second watched
                {
                    $match: match_query
                },
                {
                    $project: {
                        _id: 0,
                        user: "$user",
                        week: { $isoWeek: "$the_date" }, // starting week with monday
                        dow: { $dayOfWeek: "$the_date" }, // 1 (Sunday) and 7 (Saturday)
                        video: "$video_file",
                        date: "$the_date",
                        utc: "$utc"
                    }
                    //   count: { 1 }              }
                },
                { $sort: { "utc": 1 } } // ascending

            ]).execAsync(),
        }).then(function(results) {
            res.jsonp({
                data: results,
                meta: { // not in use
                    timespentVideo: {
                        title: "Time Spent",
                        x_dimension: "Kalenderwoche",
                        x_unit: "Woche",
                        y_dimension: "Zeitaufwand",
                        y_unit: "Stunden:Minuten"
                    }
                },
                // meta-data videoname: videolength
                videometa: videoMeta,
                metrics: {
                    context: 'learnerDashboard',
                    path: req._parsedUrl.path,
                    size: sizeof(results), //size2: sizeof2.sizeof(results),
                    querytime: process.hrtime(hrstart)[1] / 1000000
                }
            });
            console.log("Results_LearnerDashboard - Timespent selected: ", results)
        }).catch(function(err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });



    /*
     *    PEAKS *********************************************
     */

    // scope: total (default)
    app.get('/data/learner-dashboard-user5/peaks-total/video/:video', function(req, res) {

        var hrstart = process.hrtime();
        // build the query-object for the aggregations
        var match_query = {};
        match_query.playback_time = { '$ne': 0 }; // not equal 0
        match_query.action_context = "player";
        match_query.action_type = "playback";
        match_query.user = referenceUser;

        // load meta-data video -> videotitle: videolength
        var videoMetaSource = require('../import_data/etutor2015-videos.json');
        var videoMeta = {}
        for (var i = 0, len = videoMetaSource.length; i < len; i++) {
            filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/', '');
            videolength = videoMetaSource[i].metadata[0].videolength;
            videoMeta[filename] = videolength;
        }
        console.log("PEAKS videoMeta: ", videoMeta);


        if (req.params.video !== undefined) {
            match_query.video_file = req.params.video;
        }
        console.log("PEAKS match_query: ", match_query);

        Promise.props({

            // SOCIAL_PEAKS
            peaksSocial: LogExt2.aggregate([

                {
                    "$match": { //playback_time   : { "$ne" : 0 },
                        user: { "$ne": referenceUser }, // not equal current user for social peaks
                        video_file: match_query.video_file
                    }
                },
                { "$sort": { "playback_time": -1 } },
                {
                    "$group": {
                        "_id": {
                            "sec": "$playback_time",
                            "v": "$video_file"
                        },
                        "count": { "$sum": 1 }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "v": "$_id.v",
                        "sec": "$_id.sec",
                        'count': '$count'
                    }
                }

            ]).execAsync(),

            // PERSONAL_PEAKS
            peaksPersonal: LogExt2.aggregate([

                {
                    "$match": { //playback_time   : { "$ne" : 0 },
                        video_file: match_query.video_file,
                        user: referenceUser, // equal current user for personal peaks
                    }
                },
                { "$sort": { "playback_time": -1 } },
                {
                    "$group": {
                        "_id": {
                            "sec": "$playback_time",
                            "v": "$video_file"
                        },
                        "count": { "$sum": 1 }
                    }
                },
                { "$sort": { "_id.sec": -1 } },
                {
                    "$project": {
                        "_id": 0,
                        "v": "$_id.v",
                        "sec": "$_id.sec",
                        'count': '$count'
                    }
                }
            ]).execAsync(),

            // WATCHING_TIME
            progressPersonal: LogExt2.aggregate([

                {
                    $match: { //playback_time   : { "$ne" : 0 },
                        video_file: match_query.video_file,
                        user: referenceUser, // equal current user for personal peaks
                    }
                },
                { $sort: { "playback_time": -1 } },
                {
                    $group: {
                        "_id": {
                            "sec": "$playback_time",
                            "vid": "$video_file",
                            "user": "$user",
                        }
                    }
                },
                {
                    $group: {
                        "_id": {
                            "v": "$_id.vid",
                            "user": "$_id.user"
                        },
                        "count": { $sum: 1 }
                    }
                }

            ]).execAsync(),

            // for calculation median and stdev for the y-scale-domain
            signals: LogExt2.aggregate([{
                    "$match": { //playback_time   : { "$ne" : 0 },
                        //    user            : { "$ne" : referenceUser } , // not equal current user for social peaks
                        video_file: match_query.video_file
                    }
                },
                { "$sort": { 'playback_time': -1 } },
                {
                    "$group": {
                        "_id": { "segment": "$playback_time" },
                        "sum": { "$sum": 1 }
                    }
                },
                {
                    "$project": {
                        '_id': 0,
                        'count': '$sum'
                    }
                },
                {
                    '$group': {
                        "_id": null,
                        "signal": { $push: "$count" }
                    }
                },
                {
                    '$project': {
                        '_id': 0,
                        'signal': 1
                    }
                }
            ]).execAsync()


        }).then(function(results) {
            res.jsonp({
                data_social: results.peaksSocial,
                data_personal: results.peaksPersonal,
                data_progressPersonal: results.progressPersonal,
                data_signals: results.signals[0].signal,
                meta: { peaks: { y_dimension: "Anzahl Betrachtungen" } },
                // meta-data videoname: videolength
                videometa: videoMeta,
                metrics: {
                    context: 'learnerDashboard',
                    path: req._parsedUrl.path,
                    size: sizeof(results), //size2: sizeof2.sizeof(results),
                    querytime: process.hrtime(hrstart)[1] / 1000000
                }
            });
            console.log("Results_LAD - PEAKS_SOCIAL: ", results)
        }).catch(function(err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });


    // scope: user
    app.get('/data/learner-dashboard-user5/peaks-user/video/:video', function(req, res) {

        var hrstart = process.hrtime();
        // build the query-object for the aggregations
        var match_query = {};
        match_query.playback_time = { '$ne': 0 }; // not equal 0
        match_query.action_context = "player";
        match_query.action_type = "playback";
        match_query.user = referenceUser;

        // load meta-data video -> videotitle: videolength
        var videoMetaSource = require('../import_data/etutor2015-videos.json');
        var videoMeta = {}
        for (var i = 0, len = videoMetaSource.length; i < len; i++) {
            filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/', '');
            videolength = videoMetaSource[i].metadata[0].videolength;
            videoMeta[filename] = videolength;
        }
        console.log("PEAKS videoMeta: ", videoMeta);


        if (req.params.video !== undefined) {
            match_query.video_file = req.params.video;
        }
        console.log("PEAKS match_query: ", match_query);

        Promise.props({

            // SOCIAL_PEAKS
            peaksSocial: LogExt2.aggregate([

                {
                    $match: { //playback_time   : { "$ne" : 0 },
                        user: { "$ne": match_query.user }, // not equal current user for social peaks 
                        video_file: match_query.video_file
                    }
                },
                { $sort: { "playback_time": -1 } },
                {
                    $group: {
                        "_id": {
                            "sec": "$playback_time",
                            "v": "$video_file",
                            "u": "$user"
                        },
                    }
                },
                {
                    $group: {
                        "_id": {
                            "sec": "$_id.sec",
                            "v": "$_id.v"
                        },
                        //       "user"  : "$_id.u"}   ,
                        "count": { "$sum": 1 }
                    }
                },
                { $sort: { "_id.sec": 1 } },
                {
                    $project: {
                        "_id": 0,
                        "v": "$_id.v",
                        "sec": "$_id.sec",
                        //       "user": "$_id.user",
                        'count': '$count'
                    }
                }

            ]).execAsync(),

            // PERSONAL_PEAKS
            peaksPersonal: LogExt2.aggregate([

                {
                    $match: { //playback_time   : { "$ne" : 0 },
                        video_file: match_query.video_file,
                        user: referenceUser, // equal current user for personal peaks
                    }
                },
                { $sort: { "playback_time": -1 } },
                {
                    $group: {
                        "_id": {
                            "sec": "$playback_time",
                            "v": "$video_file",
                            "u": "$user"
                        },
                    }
                },
                {
                    $group: {
                        "_id": {
                            "sec": "$_id.sec",
                            "v": "$_id.v"
                        },
                        //       "user"  : "$_id.u"}   ,
                        "count": { "$sum": 1 }
                    }
                },
                { $sort: { "_id.sec": 1 } },
                {
                    $project: {
                        "_id": 0,
                        "v": "$_id.v",
                        "sec": "$_id.sec",
                        //       "user": "$_id.user",
                        'count': '$count'
                    }
                }

            ]).execAsync(),

            // WATCHING_TIME
            progressPersonal: LogExt2.aggregate([

                {
                    $match: { //playback_time   : { "$ne" : 0 },
                        video_file: match_query.video_file,
                        user: referenceUser, // equal current user for personal peaks
                    }
                },
                { $sort: { "playback_time": -1 } },
                {
                    $group: {
                        "_id": {
                            "sec": "$playback_time",
                            "vid": "$video_file",
                            "user": "$user",
                        }
                    }
                },
                {
                    $group: {
                        "_id": {
                            "v": "$_id.vid",
                            "user": "$_id.user"
                        },
                        "count": { $sum: 1 }
                    }
                }

            ]).execAsync(),

            // for calculation median and stdev for the y-scale-domain
            signals: LogExt2.aggregate([{
                    "$match": { //playback_time   : { "$ne" : 0 },
                        //    user            : { "$ne" : referenceUser } , // not equal current user for social peaks
                        video_file: match_query.video_file
                    }
                },
                { $sort: { 'playback_time': -1 } },
                {
                    "$group": {
                        "_id": {
                            "segment": "$playback_time" //,
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
                {
                    '$project': { '_id': 0, 'signal': 1 }
                }
            ]).execAsync()


        }).then(function(results) {
            res.jsonp({
                data_social: results.peaksSocial,
                data_personal: results.peaksPersonal,
                data_progressPersonal: results.progressPersonal,
                data_signals: results.signals[0].signal,
                meta: {
                    peaks: { y_dimension: "Anzahl Lernender" }
                },
                // meta-data videoname: videolength
                videometa: videoMeta,
                metrics: {
                    context: 'learnerDashboard',
                    path: req._parsedUrl.path,
                    size: sizeof(results), //size2: sizeof2.sizeof(results),
                    querytime: process.hrtime(hrstart)[1] / 1000000
                }
            });
            console.log("Results_LAD - PEAKS_SOCIAL: ", results)
        }).catch(function(err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });


    // scope: most // redundant -> same query like "user"!!!
    app.get('/data/learner-dashboard-user5/peaks-most/video/:video', function(req, res) {

        var hrstart = process.hrtime();
        // build the query-object for the aggregations
        var match_query = {};
        match_query.playback_time = { '$ne': 0 }; // not equal 0
        match_query.action_context = "player";
        match_query.action_type = "playback";
        match_query.user = referenceUser;

        // load meta-data video -> videotitle: videolength
        var videoMetaSource = require('../import_data/etutor2015-videos.json');
        var videoMeta = {}
        for (var i = 0, len = videoMetaSource.length; i < len; i++) {
            filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/', '');
            videolength = videoMetaSource[i].metadata[0].videolength;
            videoMeta[filename] = videolength;
        }
        console.log("PEAKS videoMeta: ", videoMeta);


        if (req.params.video !== undefined) {
            match_query.video_file = req.params.video;
        }
        console.log("PEAKS match_query: ", match_query);

        Promise.props({

            // SOCIAL_PEAKS
            peaksSocial: LogExt2.aggregate([

                {
                    $match: { //playback_time   : { "$ne" : 0 },
                        user: { "$ne": match_query.user }, // not equal current user for social peaks 
                        video_file: match_query.video_file
                    }
                },
                { $sort: { "playback_time": -1 } },
                {
                    $group: {
                        "_id": {
                            "sec": "$playback_time",
                            "v": "$video_file",
                            "u": "$user"
                        },
                    }
                },
                {
                    $group: {
                        "_id": {
                            "sec": "$_id.sec",
                            "v": "$_id.v"
                        },
                        //       "user"  : "$_id.u"}   ,
                        "count": { "$sum": 1 }
                    }
                },
                { $sort: { "_id.sec": 1 } },
                {
                    $project: {
                        "_id": 0,
                        "v": "$_id.v",
                        "sec": "$_id.sec",
                        //       "user": "$_id.user",
                        'count': '$count'
                    }
                }

            ]).execAsync(),

            // PERSONAL_PEAKS
            peaksPersonal: LogExt2.aggregate([

                {
                    $match: { //playback_time   : { "$ne" : 0 },
                        video_file: match_query.video_file,
                        user: referenceUser, // equal current user for personal peaks
                    }
                },
                { $sort: { "playback_time": -1 } },
                {
                    $group: {
                        "_id": {
                            "sec": "$playback_time",
                            "v": "$video_file",
                            "u": "$user"
                        },
                    }
                },
                {
                    $group: {
                        "_id": {
                            "sec": "$_id.sec",
                            "v": "$_id.v"
                        },
                        //       "user"  : "$_id.u"}   ,
                        "count": { "$sum": 1 }
                    }
                },
                { $sort: { "_id.sec": 1 } },
                {
                    $project: {
                        "_id": 0,
                        "v": "$_id.v",
                        "sec": "$_id.sec",
                        //       "user": "$_id.user",
                        'count': '$count'
                    }
                }

            ]).execAsync(),

            // WATCHING_TIME
            progressPersonal: LogExt2.aggregate([

                {
                    $match: { //playback_time   : { "$ne" : 0 },
                        video_file: match_query.video_file,
                        user: referenceUser, // equal current user for personal peaks
                    }
                },
                { $sort: { "playback_time": -1 } },
                {
                    $group: {
                        "_id": {
                            "sec": "$playback_time",
                            "vid": "$video_file",
                            "user": "$user",
                        }
                    }
                },
                {
                    $group: {
                        "_id": {
                            "v": "$_id.vid",
                            "user": "$_id.user"
                        },
                        "count": { $sum: 1 }
                    }
                }

            ]).execAsync(),

            // for calculation median and stdev for the y-scale-domain
            signals: LogExt2.aggregate([{
                    "$match": { //playback_time   : { "$ne" : 0 },
                        //    user            : { "$ne" : referenceUser } , // not equal current user for social peaks
                        video_file: match_query.video_file
                    }
                },
                { $sort: { 'playback_time': -1 } },
                {
                    "$group": {
                        "_id": {
                            "segment": "$playback_time" //,
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
                {
                    '$project': { '_id': 0, 'signal': 1 }
                }
            ]).execAsync()


        }).then(function(results) {
            res.jsonp({
                data_social: results.peaksSocial,
                data_personal: results.peaksPersonal,
                data_progressPersonal: results.progressPersonal,
                data_signals: results.signals[0].signal,
                meta: {
                    peaks: { y_dimension: "Segemente, welche sich mindestens 75% der Lernenden angesehen haben" }
                },
                // meta-data videoname: videolength
                videometa: videoMeta,
                metrics: {
                    context: 'learnerDashboard',
                    path: req._parsedUrl.path,
                    size: sizeof(results), //size2: sizeof2.sizeof(results),
                    querytime: process.hrtime(hrstart)[1] / 1000000
                }
            });
            console.log("Results_LAD - PEAKS_SOCIAL: ", results)
        }).catch(function(err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });



}; // end module