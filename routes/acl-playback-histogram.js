/*
author: niels.seidel@nise81.com
module: Playback histogram
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
	* Playback histogram Chart
	**/
    app.get('/chart/playback-histogram', function (req, res) {
        Promise.props({
            groups: LogExt2.find().distinct('group').execAsync(),
            type: LogExt2.find().distinct('action_type').execAsync(),
            videos: LogExt2.find().distinct('video_file').execAsync()
        }).then(function (results) {
            console.log(results.file)
            res.render('chartPlaybackHistogram', {
                menu: menu,
                type: results.type.sort(),
                file: results.videos.sort(),
                groups: results.groups.sort(),
                context: results.context
            });
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });

    //
    var match_group = {}, 
        match_video_file = {};
    app.get('/data/playback-histogram/videos/:video/groups/:group', function (req, res) {
        var hrstart = process.hrtime();

        if (req.params.video !== undefined) {
            var videos = req.params.video.split(/,/);
            //videos = videos.map(function (x) { return parseInt(x,); });
            match_video_file = { "$in": videos };

        }
        if (req.params.group !== undefined) {
            var groups = req.params.group.split(/,/);
            groups = groups.map(function (x) { return parseInt(x, 10); });
            match_group = { "$in": groups };
        }
        //console.log(match_video_file)
        //console.log(seek_intervals)
        Promise.props({
            // alt: session_duration: LogExt2.aggregate(session_intervals).execAsync(), // sg - wieso hier immer ohne Filter!?!?!?! -> bei jedem Filterwechsel werden alle 277 Sessions aus DB gelesen
            session_duration: LogExt2.aggregate(session_interval(match_video_file, match_group)).execAsync(),
            loading: LogExt2.aggregate(loading_time(match_video_file, match_group)).execAsync(),
            play: LogExt2.aggregate(play_intervals(match_video_file, match_group)).execAsync(),
            seek: LogExt2.aggregate(seek_intervals(match_video_file, match_group)).execAsync()
        }).then(function (results) {
            //console.log(results.seek)
            results.play_dur = getEventDuration(results.play, 'play-click', 'pause-click', 60000);
            results.pause_dur = getEventDuration(results.play, 'pause-click', 'play-click', 60000, 0.5);
            results.seek_dur = getEventDuration(results.seek, 'seek-start', 'seek-stop', 60, 0, 'value', true);
            results.seek_ffw = getEventDuration(results.seek, 'seek-start', 'seek-stop', 60, 0, 'value');
            results.seek_bw = getEventDuration(results.seek, 'seek-start', 'seek-stop', -60, 0, 'value');
            for (var i = 0, len = results.loading.length; i < len; i++) {
                if (results.loading[i].duration !== undefined) {
                    results.loading[i].duration = parseInt(results.loading[i].duration.split(';')[0]) / 1000;
                }
            }
            // nachträglich entfernt
            delete results.play;
            delete results.seek;

        //    console.log("results Histogramm-Acl: ", results);
            console.log("--------------------------------");
            // seek_bw: 
            //         [ { group: 99,
            //             video: 'e2script_lecture1_improved.mp4',
            //             phase: 6,
            //             duration: 6.7 },
            //             { group: 101,
            //             video: 'e2script_lecture5_improved.mp4',
            //             phase: 6,
            //             duration: 0.03333333333333333 },


            res.jsonp({
                data: results,
                meta: {
                    session_duration: { title: 'Session duration', x_dimension: 'duration', x_unit: 'h', parent:'chartPlaybackHist'},
                    loading: { title: 'Video loading', x_dimension: 'duration', x_unit: 's', parent:'chartPlaybackHist' },
                    play_dur: { title: 'Play duration', x_dimension: 'duration', x_unit: 'min', parent:'chartPlaybackHistPlay' },
                    pause_dur: { title: 'Pause duration', x_dimension: 'duration', x_unit: 'min', parent:'chartPlaybackHistPlay' },
                    seek_dur: { title: 'Seek extent', x_dimension: 'length of seek', x_unit: 's', parent:'chartPlaybackHistSeek' },
                    seek_ffw: { title: 'Seek forward', x_dimension: 'length of seek', x_unit: 's', parent:'chartPlaybackHistSeek' },
                    seek_bw: { title: 'Seek back', x_dimension: 'length of seek', x_unit: 's', parent:'chartPlaybackHistSeek' }
                },
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

    function getEventDuration(arr, start, end, factor = 1, limit = 0, method = 'utc', abs = false) {
        var
            res = []
        duration = 0
            ;
        console.log("arr: ", arr);
        
        // für alle Objekte im arr -> _id's ( Kombis session/group/user/phase/video )
        // sg - korrektur: vorher i < len -1!
        for (var i = 0, len = arr.length; i < len; i++) {
            //console.log("i: ", i);
            // wenn Objekt mehr als ein Event besitzt, sonst kann nicht gerechnet werden
            if (arr[i].events.length > 1) {
                // für alle events jedes Objekts im arr
                // sg - korrektur: vorher j < len -1!
                for (var j = 0, len2 = arr[i].events.length; j < len2; j++) {
                    //console.log("j: ", j);
                    // wenn j-tes event existiert
                    if (arr[i].events[j] !== undefined) {
                        // wenn type start-parameter z.B. "play-click" oder 'seek-start'
                        if (arr[i].events[j].type === start) {
                            // NUR FÜR DIREKTEN ODER ALLE NACHFOLGER???? -> für alle! bei Treffer -> BREAK!
                            // dann für direkten Nachfolger prüfen:
                            // sg - korrektur: vorher j < len -1!
                            for (var jj = j + 1, len3 = arr[i].events.length; jj < len3; jj++) {
                                //console.log("jj: ", jj);
                                // wenn Nachfolger ungleich undefined
                                if (arr[i].events[jj] !== undefined) {
                                    // wenn type end-parameter z.B. "pause-click" oder 'seek-stop'
                                    if (arr[i].events[jj].type === end) {
                                        if (!abs) {                         //  Nachfolger ./. Vorgänger
                                            duration = (parseInt(arr[i].events[jj][method]) - parseInt(arr[i].events[j][method])) / factor;
                                        } else {                            //  Nachfolger ./. Vorgänger
                                            duration = Math.abs(parseInt(arr[i].events[jj][method]) - parseInt(arr[i].events[j][method])) / factor;
                                        }
                                        // wenn größer Limitierung, push ins array
                                        if (duration > limit) {
                                            res.push({ group: arr[i].group, video: arr[i].video, phase: arr[i].phase, duration: duration });
                                        }
                                        // j mit Zähler des Nachfolgers setzen
                                        j = jj;
                                        // Nachfolger-Zähler mit Array-Length setzen???
                                        // jj = len;
                                        // for-Schleife verlassen
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

        }
        console.log("res: ", res);
        return res;
    }

    // sg: nicht mehr verwendet -> siehe session_interval()
    var session_intervals = [
        {
            '$group': {
                _id: {
                    session: "$user_session",
                    group: "$group",
                    user: "$user",
                    phase: "$phase",
                    video: "$video_file"
                },
                start: { '$min': "$utc" },
                end: { '$max': "$utc" }
            }
        },
        {
            '$project': {
                _id: 0,
                group: '$_id.group',
                phase: '$_id.phase',
                video: '$_id.video',
                duration: { '$divide': [{ '$subtract': ['$end', '$start'] }, 3600000] }
            }
        }
    ];

    // sg: session_interval mit Filterberücksichtigung
    function session_interval(match_video_file, match_group) {
        return [
            {
                "$match": {
                    video_file: match_video_file,
                    group: match_group
                }
            },
            {
                '$group': {
                    _id: {
                        session: "$user_session",
                        group: "$group",
                        user: "$user",
                        phase: "$phase",
                        video: "$video_file"
                    },
                    start: { '$min': "$utc" },
                    end: { '$max': "$utc" }
                }
            },
            {
                '$project': {
                    _id: 0,
                    group: '$_id.group',
                    phase: '$_id.phase',
                    video: '$_id.video',
                    duration: { '$divide': [{ '$subtract': ['$end', '$start'] }, 3600000] }
                }
            }
        ];
    }

    function loading_time(match_video_file, match_group) {
        return [
            {
                "$match": {
                    'action_type': {
                        '$in': [
                            'video-loading-time'
                        ]
                    },
                    video_file: match_video_file,
                    group: match_group
                }
            },
            {
                '$group': {
                    _id: {
                        session: "$user_session",
                        group: "$group",
                        phase: "$phase",
                        video: "$video_file",
                        value: '$action_value'
                    },

                }
            },
            {
                '$project': {
                    _id: 0,
                    group: '$_id.group',
                    phase: '$_id.phase',
                    video: '$_id.video',
                    duration: '$_id.value'
                }
            }
        ];
    }

    // sg - aktuell nicht verwendet!
    function viewing_intervals(match_video_file, match_group) {
        return [
            {
                '$match': {
                    video_file: match_video_file,
                    group: match_group
                },
                '$group': {
                    _id: {
                        session: "$user_session",
                        group: "$group",
                        user: "$user",
                        phase: "$phase",
                        video: "$video_file"
                    },
                    start: { '$min': "$utc" },
                    end: { '$max': "$utc" }
                }
            },
            {
                '$project': {
                    _id: 0,
                    group: '$_id.group',
                    phase: '$_id.phase',
                    video: '$_id.video',
                    duration: { '$divide': [{ '$subtract': ['$end', '$start'] }, 3600000] }
                }
            }
        ];
    }

    function play_intervals(match_video_file, match_group) {
        // {
        //     "group" : 101,
        //     "session" : 19,
        //     "phase" : 3,
        //     "video" : "e2script_lecture1_improved.mp4",
        //     "events" : [ 
        //         {
        //             "utc" : 1447140835306.0,
        //             "type" : "play-click"
        //         }, 
        //         {
        //             "utc" : 1447140839305.0,
        //             "type" : "pause-click"
        //         }
        //     ]
        // }
        return [
            {
                "$match": {
                    'action_type': {
                        '$in': [
                            'play-click',
                            'pause-click',
                            'seek-start'
                        ]
                    },
                    video_file: match_video_file,
                    group: match_group
                }
            },
            // sg - es wird die korrekte zeitliche Reihenfolge für getEventDuration() benötigt!
            {   "$sort": { "utc":1 } },            
            {
                '$group': {
                    _id: {
                        session: "$user_session",
                        group: "$group",
                        user: "$user",
                        phase: "$phase",
                        video: "$video_file"
                    },
                    events: { '$push': { utc: "$utc", type: "$action_type" } }

                }
            },
            {
                '$project': {
                    _id: 0,
                    group: '$_id.group',
                    session: '$_id.session',
                    phase: '$_id.phase',
                    video: '$_id.video',
                    events: '$events'
                }
            }
        ];
    }

    function seek_intervals(match_video_file, match_group) {
        return [
            {
                "$match": {
                    'action_type': {
                        '$in': [
                            'seek-stop',
                            'seek-start'//,
                            //'skip-back'
                        ]
                    },
                    'video_file': match_video_file,
                    'group': match_group
                }
            },
            // sg - es wird die korrekte zeitliche Reihenfolge für getEventDuration() benötigt!
            {   "$sort": { "utc":1 } },
            {
                '$group': {
                    _id: {
                        session: "$user_session",
                        group: "$group",
                        user: "$user",
                        phase: "$phase",
                        video: "$video_file"
                    },
                    events: { '$push': { utc: "$utc", type: "$action_type", value: '$action_value' } }
                }
            },
            {
                '$project': {
                    _id: 0,
                    group: '$_id.group',
                    session: '$_id.session',
                    phase: '$_id.phase',
                    video: '$_id.video',
                    events: '$events',
                    value: '$val'
                }
            },

        ]
    };
}
