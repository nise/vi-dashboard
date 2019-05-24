/*
author: niels.seidel@nise81.com
module: Rewatching
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
        utils = require('./utils'),
        Promise = require('bluebird'),
        sizeof = require('object-sizeof')
        ;
    require('mongoose').Promise = require('bluebird')
    Promise.promisifyAll(mongoose); // key part - promisification


    /*
	 * Rewatching Chart 
	 **/
    app.get('/chart/rewatching', function (req, res) {
        Promise.props({
            videos: LogExt2.find().distinct('video_file').execAsync(),
            groups: LogExt2.find().distinct('group').execAsync(),
            context: LogExt2.find().distinct('action_context').execAsync()
        }).then(function (results) {
            res.render('chartRewatching', {
                menu: menu,
                videos: utils.sort(results.videos),
                groups: utils.sort(results.groups),
                context: utils.sort(results.context)
            });
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });





    /*
     *
     */
    //     app.get('/cached/data/rewatching/group/:group/video/:video', function (req, res) {
    app.get('/cached/data/rewatching/group/:group', function (req, res) {
        console.log('req.params.group: ', req.params.group); // -> 97
        var hrstart = process.hrtime();
        var match_query = {};
        match_query.playback_time = { '$ne': 0 }
        // sg - keine Eingrenzung auf best. Video
        // if (req.params.video !== undefined) {
        //     match_query.video_file = req.params.video;
        // }
        if (req.params.group !== undefined) {
            match_query.group = parseInt(req.params.group, 10);
        }
        
        console.log("match_query rewatching: ", match_query)
        // {   playback_time: { '$ne': 0 },     // größer 0
        //     video_file:     'e2script_lecture1_improved.mp4',
        //     group:          97 
        // }
        // TEST-QUERY
        // match_query = { playback_time: { '$ne': 0 }, group: 97,  user: 6,  video_file: "e2script_lecture4_improved.mp4" };
        // match_query = { playback_time: { '$ne': 0 }, group: 101, user: 16, video_file: "e2script_lecture4_improved.mp4" };
        // match_query = { playback_time: { '$ne': 0 }, video_file: "e2script_lecture1_improved.mp4" };
        
        
        LogExt2
            .aggregate([
                { "$match": match_query },
                {
                    "$group": {
                        "_id": {
                            "v": "$video_file",
                            "u": "$user",
                            "g": "$group"
                        },
                        "a": {
                            "$push": {
                                't': { $hour: { $add: [new Date(0), "$utc"] } },
                                'c': '$action_context',
                                'p': '$playback_time',
                                'd': { $dayOfYear: { $add: [new Date(0), "$utc"] } }
                            }
                        }
                    }
                },
                {
                    "$project": {
                        "_id": 0,
                        "v": "$_id.v",
                        "u": "$_id.u",
                        "g": "$_id.g",
                        "a": 1
                    }
                }
            ])
            .exec(function (err, data) {
                if (err) {
                    console.log(err);
                }
                // save to cache
                // console.log("data_aus_db_query: ", data[0]);
                // data_aus_db_query:  { 
                //        a: [ 
                //              { t: 11, c: 'player', p: 3, d: 332 },
                //              { t: 11, c: 'player', p: 2, d: 332 },
                //              { t: 11, c: 'player', p: 4, d: 332 },
                //              { t: 11, c: 'player', p: 1, d: 332 } 
                //            ],
                //        v: 'e2script_lecture5_improved.mp4',
                //        u: 6,
                //        g: 97 }
                 
                var c = new Cache({ query: req._parsedUrl.path, data: data });
                c.save();
                // json with padding - request fles using script tag instead XHR
                res.jsonp({
                    data: data,
                    metrics: {
                        context: 'watching-rewatching',
                        path: req._parsedUrl.path,
                        size: sizeof(data),
                        querytime: process.hrtime(hrstart)[1] / 1000000
                    }
                });
                
            });
    });
}