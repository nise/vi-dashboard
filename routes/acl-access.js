/*
author: niels.seidel@nise81.com
module: Access patterns of video-based learning activities
description: 

**/

module.exports = function(app, database) {
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


        /*
         * Rewatching Chart 
         **/
        app.get('/chart/access', function(req, res) {
            Promise.props({
                videos: LogExt2.find().distinct('video_file').execAsync(),
                groups: LogExt2.find().distinct('group').execAsync(),
                context: LogExt2.find().distinct('action_context').execAsync()
            }).then(function(results) {
                res.render('chartAccess', {
                    menu: menu,
                    videos: utils.sort(results.videos),
                    groups: utils.sort(results.groups),
                    context: utils.sort(results.context)
                });
            }).catch(function(err) {
                console.log(err)
                res.send(500); // oops - we're even handling errors!
            });
        });





        /*
         *
         */
        app.get('/data/access/video/:video/group/:group', function(req, res) {
            console.log('group', req.params.group)
            var hrstart = process.hrtime();
            var match_query = {};
            match_query.playback_time = { '$ne': 0 }
            if (req.params.video !== undefined) {
                match_query.video_file = req.params.video;
            }
            if (req.params.group !== undefined) {
                match_query.group = parseInt(req.params.group, 10);
            }
            Promise.props({
                events: LogExt2.aggregate(access_total).execAsync(),
                yeardays: LogExt2.aggregate(access_day_of_year).execAsync(),
                weekdays: LogExt2.aggregate(access_weekdays).execAsync(),
                hours: LogExt2.aggregate(access_hours).execAsync(),
                drop: LogExt2.aggregate(access_drop).execAsync(),
                // sg neu
                playbackPerWeek: LogExt2.aggregate(access_playbackPerWeek).execAsync()
            }).then(function(results) {
                //console.log(results.events);
                res.jsonp({
                    data: results,
                    meta: {
                        events: { title: 'Events over time', x_dimension: 'date', x_unit: '' },
                        yeardays: { title: 'Events per day of the year', x_dimension: 'day of year', x_unit: 'd' },
                        weekdays: { title: 'Events per day of the week', x_dimension: 'number of events', x_unit: '' },
                        hours: { title: 'Events per hour of the day', x_dimension: 'number of events', x_unit: '' },
                        drop: { title: 'Drop-in and drop-out time', x_dimension: 'days since course start', x_unit: 'd', y_dimension: 'User', 'color_dimension': 'Group' },
                        // sg neu
                        playbackPerWeek: { title: "Hours playback per Week", x_dimension: "calender week", x_unit: "week", y_dimension: "Playback time", y_unit: "hours" }
                    },
                    metrics: {
                        context: 'access',
                        path: req._parsedUrl.path,
                        size: sizeof(results), //size2: sizeof2.sizeof(results),
                        querytime: process.hrtime(hrstart)[1] / 1000000
                    }
                });
                //console.log("Results_Uebersicht: ", results)
            }).catch(function(err) {
                console.log(err)
                res.send(500); // oops - we're even handling errors!
            });
        });

        var access_total = [{
                "$group": {
                    "_id": {
                        "g": "$group",
                        "d": "$the_date", // sg neu
                        // "d": "$date", // alt: date nicht immer im gleichen Format -> 30-10-2015 vs 2015-10-30
                    },
                    "count": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "_id": 0, // Filter Groups
                    "g": "$_id.g",
                    "d": "$_id.d", // sg - fehler - voher "d": "$d",
                    "sum": "$count"
                }
            },
            { $sort: { d: -1 } }
        ];

        var access_day_of_year = [{
                "$group": {
                    "_id": {
                        "g": "$group",
                        "d": { $dayOfYear: { $add: [new Date(0), "$utc"] } }
                    },
                    "count": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "g": "$_id.g",
                    "d": "$_id.d",
                    "sum": "$count"
                }
            },
            { $sort: { d: -1 } }
        ];

        var access_weekdays = [{
                "$group": {
                    "_id": {
                        "g": "$group",
                        'd': { $dayOfWeek: { $add: [new Date(0), "$utc"] } }
                    },
                    "count": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "g": "$_id.g",
                    "d": "$_id.d",
                    "sum": "$count"
                }
            },
            { $sort: { d: -1 } }
        ];

        var access_hours = [{
                "$group": {
                    "_id": {
                        "g": "$group",
                        'd': { $hour: { $add: [new Date(0), "$utc"] } }
                    },
                    "count": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "g": "$_id.g",
                    "d": "$_id.d",
                    "sum": "$count"
                }
            },
            { $sort: { d: -1 } }
        ];

        var access_drop = [{
                "$group": {
                    "_id": {
                        "u": "$user",
                        "g": "$group"
                    },
                    "days": { "$push": { $dayOfYear: { $add: [new Date(0), "$utc"] } } }
                }
            },
            {
                "$project": {
                    "_id": 0,
                    "g": "$_id.g",
                    "u": "$_id.u",
                    "min": { "$min": "$days" },
                    "max": { "$max": "$days" }
                }
            },
            { $sort: { min: -1 } }
        ];

        // sg neu
        var access_playbackPerWeek = [{
                "$match": {
                    playback_time: { '$ne': 0 },
                }
            },
            {
                "$group": {
                    "_id": {
                        "w": { $week: { $add: [new Date(0), "$utc"] } },
                        "g": "$group"
                    },
                    "count": { "$sum": 1 }
                }
            },
            {
                "$project": {
                    "_id": 0, 
                    "w": "$_id.w",
                    "g": "$_id.g",
                    "sum": "$count"
                }
            } //,
            // { 
            //     $sort : { u : 1,  } 
            // }   
        ];

    } // end module