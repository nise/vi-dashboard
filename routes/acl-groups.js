/*
author: niels.seidel@nise81.com
module: Group Comparison
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
	 *
	 * */
    app.get('/chart/groups', function (req, res) {
        res.render('chartGroups', { settings: 0, menu: menu });
    });


    app.get('/data/groups', function (req, res) {
        const hrstart = process.hrtime();
        var match_query = {};

        Promise.props({
            //group_playback
            playback: LogExt2.aggregate(buildQuery(['playback'])).execAsync(),
            total_activities: LogExt2.aggregate(buildQuery([
                'play-click',
                'pause-click',
                'seek-start',
                'change-speed',
                'skip-back',
                'set-volume',
                'added-new-annotation',
                'updated-annotation',
                'removed-annotation',
                'menu-click',
                'timeline-link-click',
                'link-external-click',
                'submited-answer',
                'skip-question'])).execAsync(),

            annotations_created: LogExt2.aggregate(buildQuery(['added-new-annotation'])).execAsync(),
            annotations_edited: LogExt2.aggregate(buildQuery(['updated-annotation'])).execAsync(),
            annotations_used: LogExt2.aggregate(buildQuery([
                'menu-click',
                'timeline-link-click',
                'link-external-click',
                'submited-answer'
            ])).execAsync(),

            annotations_assessment_created: LogExt2.aggregate(buildQuery(['added-new-annotation'], 'assessment')).execAsync(),
            annotations_assessment_edited: LogExt2.aggregate(buildQuery(['updated-annotation'], 'assessment')).execAsync(),
            annotations_assessment_used: LogExt2.aggregate(buildQuery([
                'menu-click',
                'timeline-link-click',
                'link-external-click',
                'submited-answer'
            ], 'assessment')).execAsync(),

            annotations_toc_created: LogExt2.aggregate(buildQuery(['added-new-annotation'], 'toc')).execAsync(),
            annotations_toc_edited: LogExt2.aggregate(buildQuery(['updated-annotation'], 'toc')).execAsync(),
            annotations_toc_used: LogExt2.aggregate(buildQuery([
                'menu-click',
                'timeline-link-click',
                'link-external-click',
                'submited-answer'
            ], 'toc')).execAsync(),

            annotations_comments_created: LogExt2.aggregate(buildQuery(['added-new-annotation'], 'comments')).execAsync(),
            annotations_comments_edited: LogExt2.aggregate(buildQuery(['updated-annotation'], 'comments')).execAsync(),
            annotations_comments_used: LogExt2.aggregate(buildQuery([
                'menu-click',
                'timeline-link-click',
                'link-external-click',
                'submited-answer'
            ], 'comments')).execAsync(),

            user_contributions: LogExt2.aggregate(buildQuery([
                'added-new-annotation',
                'updated-annotation',
                'removed-annotation',
                'submited-answer'
            ])).execAsync(),
            equal_activities: LogExt2.aggregate(group_equal_activities).execAsync(),
            overlapping_activity_time: LogExt2.aggregate(session_intervals).execAsync()

        }).then(function (results) {
            // var gini = require("gini");
            //console.log(results.overlapping_activity_time)
            results.overlapping_activity_time = getIntervalOverlaps(results.overlapping_activity_time);
            results.playback = events2time(results.playback);

            res.jsonp({
                data: results,
                metrics: {
                    context: 'group-comparison',
                    path: req._parsedUrl.path,
                    size: sizeof(results), //size2: sizeof2.sizeof(results),
                    querytime: process.hrtime(hrstart)[1] / 1000000
                }
            });
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });

    function events2time(arr) {
        const factor = 0.001388889; // 0.083333333
        for (var i = 0, len = arr.length; i < len; i++) {
            arr[i].abs = arr[i].abs * factor;
            arr[i].dev = arr[i].dev * factor;
        }
        return arr;
    }
    function countKeys(myobj, c) {
        var count = c;
        for (k in myobj) {
            if (myobj.hasOwnProperty(k)) {
                if (typeof myobj.k === object) {
                    count = countKeys(myobj.k, count);
                } else {
                    count++;
                }

            }
        }
        return count;
    }
    const objTemplate =
        [{
            $group: {
                _id: {
                    g: "$group",
                    user: "$user"
                },
                event_count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: {
                    group: "$_id.g"
                },
                group_sum: { '$sum': "$event_count" },
                group_avg: { '$avg': "$event_count" },
                group_dev: { '$stdDevPop': '$event_count' },
                number_of_events: { $sum: 1 },
                group_max: { '$max': "$event_count" },
                group_min: { '$min': "$event_count" }

            }
        },
        {
            $project: {
                _id: 0,
                group: '$_id.group',
                sum: '$group_sum',
                n: '$number_of_events',
                max: '$group_max',
                min: '$group_min',
                dev: '$group_dev',
                avg: '$group_avg',
                abs: '$group_avg',
                rel: {
                    $divide: ['$group_avg', '$group_max']
                }
            }
        }];

    /**
     * 
     * @param {*} type 
     * @param {*} context 
     */
    function buildQuery(type, context = null) {
        var match = {};
        if (type) {
            match['action_type'] = { '$in': type }
        }
        if (context) {
            match['action_context'] = context
        }
        return [{ '$match': match }].concat(objTemplate);
    }


    //
    var group_equal_activities = [
        {
            "$match": {
                'action_type': {
                    '$in': [
                        'play-click',
                        'pause-click',
                        'seek-start',
                        'change-speed',
                        'skip-back',
                        'set-volume',

                        'added-new-annotation',
                        'updated-annotation',
                        'removed-annotation',

                        'menu-click',
                        'timeline-link-click',
                        'link-external-click',

                        'submited-answer',
                        'skip-question'],
                }
            }
        },
        {
            $group:
            {
                _id: {
                    g: "$group",
                    user: "$user"
                },
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: {
                    group: "$_id.g"
                },
                sum: { '$sum': "$count" },
                avg: { '$avg': "$count" },
                ageStdDev: { $stdDevPop: "$count" },
                n: { $sum: 1 },
                max: { '$max': "$count" }
            }
        },
        {
            $project: {
                _id: 0,
                group: '$_id.group',
                sum: '$sum',
                n: '$n',
                max: '$max',
                avg: '$avg',
                ageStdDev: '$ageStdDev',
                abs: '$ageStdDev',
                rel: {
                    $subtract: [1, { $divide: ['$ageStdDev', '$max'] }]
                }
            }
        }
    ];


    //
    var session_intervals = [
        //{ '$match': match_query },
        {
            '$group': {
                _id: {
                    session: "$user_session",
                    group: "$group",
                    user: "$user"
                },
                start: { '$min': "$utc" },
                end: { '$max': "$utc" }
            }
        },
        { '$project': { '_id': 0, group: '$_id.group', "start": 1, "end": 1 } },
        {
            '$group': {
                _id: {
                    g: '$group'
                },
                sessions: { '$push': { start: '$start', end: '$end' } }
            }
        },
        { '$project': { '_id': 0, group: '$_id.g', "sessions": 1 } },
    ];



    var createIntervalTree = require("interval-tree-1d");
    /*
     * Determin interval overlaps
     * */
    function getIntervalOverlaps(input) {

        var result = [];
        // iterate groups
        for (var g = 0; g < input.length; g++) {
            var data = input[g].sessions;
            var intervals = [];

            for (var i = 0; i < data.length; i++) { intervals.push([data[i].start, data[i].end]) }

            var tree = createIntervalTree(intervals);
            var overlap = 0, total = 0;
            for (var i = 0; i < data.length; i++) {
                tree.queryInterval(data[i].start, data[i].end, function (ii) {
                    overlap += Math.abs(Math.min(data[i].end - data[i].start, data[i].end - ii[0], ii[1] - ii[0], ii[0] - data[i].start))
                    total += data[i].end - data[i].start;
                    //console.log(data[i].end)
                })
            }
            result[g] = {
                group: input[g].group,
                abs: (overlap / 1000 / 60 / 60),
                rel: overlap / total
            };
            //console.log((overlap / 1000 / 60 / 60) + ' Minutes overlap')
            //console.log((total / 1000 / 60 / 60) + ' Minutes total session length')
        }
        return result;//{ total: total, overlap: overlap, overlap_rate: overlap / total };
    }

	/*
	 * Session Intervals
	 **/
    app.get('/data/sessions/group/:group', function (req, res) {
        var hrstart = process.hrtime();
        var match_query = {};
        match_query.group = parseInt(req.params.group, 10);
        console.log(match_query)
        LogExt2
            .aggregate([
                { '$match': match_query },
                {
                    '$group': {
                        '_id': {
                            'session': "$user_session",
                            'user': "$user"
                        },
                        'start': { '$min': "$utc" },
                        'end': { '$max': "$utc" }
                    }
                },
                { '$project': { '_id': 0, "start": 1, "end": 1 } }
            ])
            .exec(function (err, data) {
                if (err) {
                    res.send(err);
                }
                var createIntervalTree = require("interval-tree-1d")

                var intervals = [];

                for (var i = 0; i < data.length; i++) { intervals.push([data[i].start, data[i].end]) }

                var tree = createIntervalTree(intervals);
                var overlap = 0, total = 0;
                for (var i = 0; i < data.length; i++) {
                    tree.queryInterval(data[i].start, data[i].end, function (ii) {
                        overlap += Math.abs(Math.min(data[i].end - data[i].start, data[i].end - ii[0], ii[1] - ii[0], ii[0] - data[i].start))
                        total += data[i].end - data[i].start;
                        console.log(data[i].end)
                    })
                }
                //console.log((overlap / 1000 / 60 / 60) + ' Minutes overlap')
                //console.log((total / 1000 / 60 / 60) + ' Minutes total session length')
                res.jsonp({ total: total, overlap: overlap, overlap_rate: overlap / total })

            });
    });

};



	/*
	 * Obtain data for peak chart
	 *  type: 
   [ 'video-support-mp4',
     'playback',
     'play-click',
     'pause-click',
     'open-form-new-annotation',
     'pause2-click',
     'seek-stop',
     'seek-start',
     'video-loading-time',
     'added-new-annotation',
     'change-speed',
     'menu-click',
     'updated-annotation',
     'open-form-edit-annotation',
     'display-question',
     'video-ended',
     'skip-back',
     'timeline-link-click',
     'link-external-click',
     'submited-answer',
     'continue-playback',
     'submited-correct-result',
     'open-form-reply-annotation',
     'removed-annotation',
     'submited-incorrect-result',
     'video-support-webm',
     'set-volume',
     'skip-question' ],
  context: 
   [ 'player',
     'toc',
     'comments',
     'playbackSpeed',
     'assessment',
     'hyperlinks',
     'skipBack' ] }


	 * */