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
    app.get('/cached/data/rewatching/group/:group/video/:video', function (req, res) {
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
        //console.log(match_query)
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
                var c = new Cache({ query: req._parsedUrl.path, data: data });
                c.save();
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