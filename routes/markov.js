/*
author: niels.seidel@nise81.com
module: generates Markov Chains from existing log data based on collaborative video-based learning activities
description: 

Usage:
var markov = require('./markov')(LogExt2, LogMarkov, db);
markov.generate()

bugs/todo:
- user id starts from 0 in every group > global user_id counter necessary
- action_context is not stochastically modelled >> toc only
- playback speed is not included
- a user session is only related with one video

nice to have
- add further historic data
- negative playback_time and overlong videos should be treated better
- render out put with some statistical measures about the modelled data

**/

module.exports = function (sourceModel, targetModel, db) {
    var
        module = {},
        utils = require('./utils'),
        mongoose = require('mongoose'),
        Log = mongoose.model(sourceModel),// training data
        LogMarkov = mongoose.model(targetModel), // simulated data
        async = require('async'),
        moment = require('moment'),
        winston = require('winston'),
        Promise = require('bluebird'),
        fs = require('fs'),
        Chain = require('markov-chains').default
        ;
    require('mongoose').Promise = require('bluebird');
    Promise.promisifyAll(mongoose); // key part - promisification

    const
        number_of_groups = 25,
        static_group_size = 4,
        static_number_of_sessions = null,
        static_number_of_videos = 15, // unused, yet
        static_start_date = new Date(), // start modelled data from now
        phase_length = 7, // in days
        number_of_phases = 15
        ;

    const config = {
        group_offset: 0,
        user_offset: 0
    }    

    // reset date to the beginning of the current day in order to align the hour offset
    static_start_date.setHours(2); // not clear why    
    static_start_date.setMinutes(0);
    static_start_date.setSeconds(0);
    static_start_date.setMilliseconds(1);



    module.db = db;

    // (added) Will be later used as historic data for the Markovian model that simulates sequences of user activities.
    module.histSessionPerVideoQuery = [
        {
            $group: {
                _id: {
                    user: '$user',
                    session: '$user_session',
                    video: '$video_file'
                },
                a: {
                    '$push': {
                        action_type: '$action_type',
                        //action_context: '$action_context',
                        playback_time: '$playback_time',
                        user: '$user'
                    }
                }
            }
        },
        {
            $project: {
                video: '$_id.video',
                a: 1,
                _id: 0
            }
        },
        {
            $group: {
                _id: {
                    video: '$video'
                },
                a: { '$push': '$a' }
            }
        },
        {
            $project: {
                video: '$_id.video',
                a: 1,
                _id: 0
            }
        }
        //,{ $out : "histSessionPerVideo" }
    ];

    // xxx not used later on. Can be removed?
    module.histSessionPerUserQuery = [
        {
            $group: {
                _id: {
                    'user': '$user',
                    'video': '$video_file',
                    'phase': '$phase',
                    'session': '$user_session'
                }
            }
        },
        {
            $project: {
                a: [{
                    user: '$_id.user',
                    phase: '$_id.phase',
                    session: '$_id.session',
                    videos: '$_id.video'
                }]
            }
        },
        {
            $project: {
                _id: 0,
                a: 1
            }
        }
    ];

    // (added) list of videos that have been consumed per phase phase
    module.videosPerPhaseDistributionQuery = [
        {
            $group: {
                _id: {
                    session: "$user_session",
                    user: '$user',
                    phase: "$phase"
                    //,video: "$video_file"
                },
                'videos': { '$push': '$video_file' }
            }
        }, {
            $project: {
                phase: '$_id.phase',
                videos: '$videos'
            }
        },
        {
            $group: {
                _id: {
                    phase: '$phase'
                },
                'videos': { '$push': '$videos' }
            }
        },
        {
            '$project': {
                phase: '$_id.phase',
                videos: '$videos',
                _id: 0
            }
        }//,{ '$sort': { 'phase': 1 } }
    ];


    // (added) number of sessions per user
    module.sessionDistributionQuery = [
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
    ];

    // (added)
    module.sessionsPerPhaseDistributionQuery = [
        {
            $group: {
                _id: {
                    session: "$user_session",
                    phase: "$phase",
                    user: "$user"
                },
                'sessions': { '$addToSet': '$user_session' }
            }
        },
        {
            $group: {
                _id: {
                    phase: '$_id.phase'
                },
                sum: { '$sum': 1 }
            }
        },
        { '$sort': { '_id.phase': 1 } }
    ];

    // (added) distribution of the number of days when the sessions have been started since the begining of the course
    module.sessionStartDistributionQuery = [
        {
            '$group': {
                _id: {
                    session: "$user_session",
                    group: "$group",
                    user: "$user"
                },
                the_date: { '$min': "$the_date" }
            }
        },
        {
            '$group': {
                '_id': {
                    '$subtract': [
                        { '$subtract': ['$the_date', new Date(0)] }, // xxx should be replaced by the simulation start date
                        {
                            '$mod': [
                                { '$subtract': ['$the_date', new Date(0)] },
                                1000 * 60 * 60 * 24
                            ]
                        }
                    ]
                },
                'total': { '$sum': 1 }
            }
        },
        { '$sort': { '_id': 1 } }
    ];

    // (added) distribution of day of the week of the session begin
    module.dayDistributionQuery = [
        {
            '$group': {
                _id: {
                    session: "$user_session",
                    group: "$group",
                    user: "$user"
                },
                start: { '$min': "$the_date" }
            }
        },
        {
            $group: {
                _id: {
                    'day': { '$dayOfWeek': '$start' }
                },
                'sum': { '$sum': 1 }
            }
        },
        {
            '$project': {
                sum: '$sum',
                day: '$_id.day'
            }
        },
        {
            '$project': {
                _id: 0,
                day: 1,
                sum: 1
            }
        },
        { '$sort': { 'day': 1 } }
    ];

    // (added) distribution of hours of session beginn
    module.hourDistributionQuery = [
        {
            '$group': {
                _id: {
                    session: "$user_session",
                    group: "$group",
                    user: "$user"
                },
                start: { '$min': "$the_date" }
            }
        },
        {
            $group: {
                _id: {
                    'hour': { '$hour': '$start' }
                },
                'sum': { '$sum': 1 }
            }
        },
        {
            '$project': {
                sum: '$sum',
                hour: '$_id.hour'
            }
        },
        {
            '$project': {
                _id: 0,
                hour: 1,
                sum: 1
            }
        },
        { '$sort': { 'hour': 1 } }
    ];

    // (added) number of members in a group
    module.groupSizeDistributionQuery = [
        {
            $group: {
                _id: {
                    'group': '$group'
                },
                'users': { '$addToSet': '$user' }
            }
        },
        {
            '$project': {
                users: { '$size': '$users' },
                _id: 0
            }
        }
    ];

    // (added) Trippels of utc, video playback time, and action type (e.g. assessment, playback, toc, ...)
    module.timeInteractionDistributionQuery = [
        {
            '$group': {
                _id: {
                    session: "$user_session",
                    group: "$group",
                    user: "$user"
                },
                seq: { $push: { utc: "$utc", playback: "$playback_time", action: '$action_type' } }
            }
        },
        {
            $project: {
                seq: 1,
                _id: 0
            }

        }
    ];


    /**
     * Calculates the time difference of subsequent log entries for both playback time and utc.
     * It returns an array with two objects. Both contain the subsequent actions as keys and a list of time differences as value.
     * @param {*} arr 
     */
    function seqDiff(arr) {
        let
            e1, e2, key, res = {}
            ;
        // iterate sessions
        for (let s = 0, len = arr.length; s < len; s++) {
            //iterate single session
            for (let i = 0, len2 = arr[s].length - 1; i < len2; i++) {
                e1 = arr[s][i];
                e2 = arr[s][i + 1];
                key = e1.action + '--' + e2.action;

                if (res[key] === undefined) {
                    res[key] = [];
                }
                res[key].push([e2.utc - e1.utc, e2.playback - e1.playback]);
            }
        }
        return res;
    }


    /**
     * Marcov chain
     * Generats a user session based on an existing data set.
     */
    module.generate = function () {
        let
            hrstart = process.hrtime(),
            t1 = new Date()
            ;
        //console.log('................................................')
        //console.log('Startet Markov Chain generation of logfile');
        // obtain training data
        Log.count({}, function (err, count) {
            //console.log('Training data contained ' + count + ' documents.');
            //
            Promise.props({
                // empty collection that is going to be generated
                //empty: LogMarkov.remove().execAsync(),
                // number of sessions per user
                sessionDistribution: Log.aggregate(module.sessionDistributionQuery).execAsync(),
                // aggregated utc and playback time per action type and context
                timeInteraction: Log.aggregate(module.timeInteractionDistributionQuery).execAsync(),
                // at what day of a week do sessions start
                dayDistribution: Log.aggregate(module.dayDistributionQuery).execAsync(),
                // at what hour of a day do sessions start
                hourDistribution: Log.aggregate(module.hourDistributionQuery).execAsync(),
                // number of sessions per phase
                sessionsPerPhaseDistribution: Log.aggregate(module.sessionsPerPhaseDistributionQuery).execAsync(),
                // what videos are watched in a given pahse
                videosPerPhaseDistribution: Log.aggregate(module.videosPerPhaseDistributionQuery).execAsync(),
                //
                histSession: Log.aggregate(module.histSessionPerVideoQuery).execAsync(),
                histGroupSize: Log.aggregate(module.groupSizeDistributionQuery).execAsync()

                // sessionStartDistribution: Log.aggregate(module.sessionStartDistributionQuery).execAsync(),
                // start model generation            
                // seek

            }).then(function (results) {
                //console.log('Finished aggregation of historic data');
                console.log('[')
                results.histSessionPerVideo = {};
                for (let z = 0, len = results.histSession.length; z < len; z++) {
                    results.histSessionPerVideo[results.histSession[z].video] = results.histSession[z].a; //utils.combineNested(results.histSession, 'a');
                }

                // number of users per group
                results.histGroupSize = utils.combineNested(results.histGroupSize, 'users');
                // number of sessions per user
                results.sessionDistribution = utils.combineNested(results.sessionDistribution, 'sessions');

                // distribution of week days for the beginning of a session
                results.dayDistribution = utils.combineNested(results.dayDistribution, 'sum');
                results.dayDistribution = utils.expandArray(results.dayDistribution, [0, 1, 2, 3, 4, 5, 6, 7]);

                // distribution of the hour of the day for the beginning of a session
                results.hourDistribution = utils.combineNested(results.hourDistribution, 'sum');
                results.hourDistribution = utils.expandArray(results.hourDistribution, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24])

                // Number of sessions per phase    
                results.sessionsPerPhaseDistribution = utils.combineNested(results.sessionsPerPhaseDistribution, 'sum');
                results.sessionsPerPhaseDistribution = utils.expandArray(results.sessionsPerPhaseDistribution, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

                results.videosPerPhaseDistribution = utils.combineNested2(results.videosPerPhaseDistribution, 'videos');
                //results.db = db;
                // time modelling
                results.timeInteraction = utils.combineNested(results.timeInteraction, 'seq');
                let diff = seqDiff(results.timeInteraction);
                results.timeInteraction = {}; // free mem
                results.timeDistribution = diff;

                //console.log(results.sessionDistribution)
                generateGroups(results);

                
                console.log(']')
                /*
                let t2 = new Date();
                console.log('Simple time measure', t2 - t1)
                console.info("Generation of Markov Chain tooks %d ms for '%s' log entries.", (process.hrtime(hrstart)[1] / 60000).toFixed(2), 0);
                console.log('.............................................')
                */
            }).catch(function (err) {
                console.log(err)
            });// end Promise
        }); // end obtaining training data
    }


    /**
     * Generate multiple groups with a variable or static size
     */
    function generateGroups(results) {
        for(var i = 0; i < number_of_groups; i++) {
            let group_size = static_group_size ? static_group_size : utils.randomWithProbability(results.histGroupSize);
            generateGroup(results, group_size, i + config.group_offset );
        };
    }


    /**
     * Generate a group with a defined number of users
     */
    function generateGroup(results, group_size, group_id) {
        for(var i = 0; i < group_size; i++) {
            generateUser(results, group_id, i + 1 + config.user_offset );
        };
    }


    let sessionCounter = 0;
    /**
     * Generats a user with a number of sessions. 
     * @param {*} results 
     * @param {*} group_id
     * @param {*} user_id 
     */
    async function generateUser(results, group_id, user_id) {
        // iterate over all phases 
        for(var phase = 0; phase < number_of_phases; phase++) {
            // obtain a static or stochastic number of sessions per user and phase
            let numberOfsessionsPerUser = static_number_of_sessions ? static_number_of_sessions : utils.randomWithProbability(results.sessionsPerPhaseDistribution);
            // assume a fix phase duration or take the ransomized length    
            let duration = phase_length ? phase_length : 7;

            let tmpPlayback = 0;
            let sessionLog = [];
            for(var j=0; j<numberOfsessionsPerUser;j++) {

                // define starting date
                let d = new moment(static_start_date);
                d.add(phase * duration, 'days'); // add offset of session start
                d.add(utils.randomWithProbability(results.dayDistribution), 'days'); // add days from session start
                d.add(utils.randomWithProbability(results.hourDistribution), 'hours');
                tmpPlayback = 0;
                let tmpUtc = d.format('x');

                // asume that only one video is used during a session
                let video = utils.randomWithProbability(results.videosPerPhaseDistribution[phase % 5]); // xxx why 5?

                // generate a session    
                let activities = generateUserSessionActivities(results.histSessionPerVideo[video]);

                // extent the generated session
                for(var n=0; n < activities.length - 1; n++) {
                    let aaa = activities[n];
                    aaa.user_session = j;
                    aaa.user = user_id;
                    aaa.user_name = 'user_' + user_id;
                    aaa.group = group_id;
                    aaa.group_name = 'group_' + group_id;
                    aaa.action_context = aaa.action_type === 'playback' ? 'player' : 'toc'; // xxx improvement for further action_context and action_types necessary
                    // assigne a radom distributed phase
                    aaa.phase = phase;
                    // assign a random video per phase
                    aaa.video_file = video;
                    //aaa.video_id = parseInt(video, 10);

                    // assign time
                    let nextEntry = activities[n + 1]
                    key = aaa.action_type + '--' + nextEntry.action_type;
                    let times = utils.randomWithProbability(results.timeDistribution[key]);
                    aaa.utc = parseInt(tmpUtc, 10) + parseInt(times[0], 10);
                    //console.log('---------',utils.randomWithProbability(results.utcDiff[key]),results.utcDiff[key]);
                    tmpUtc = aaa.utc; // moment.format("x")
                    // assign playback time
                    let pt = tmpPlayback + parseInt(times[1], 10);
                    if (pt < 0 || pt > 324000) {
                        pt = tmpPlayback;
                    }
                    aaa.playback_time = pt;
                    tmpPlayback = aaa.playback_time;
                    //console.log(utils.randomWithProbability(results.playbackDiff[key]));

                    aaa.the_date = new Date(aaa.utc);
                    let t = moment(aaa.the_date);

                    aaa.date = t.format("YYYY-MM-DD")
                    aaa.time = t.format("hh:mm:ss");


                    /* Values that have not been modelled, because they have not been used in any of the charts
                        user_gender: String,
                        user_culture: String,
                        video_length: String,
                        video_language: Sring
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
                        */

                    sessionCounter++;
                    
                    console.log(JSON.stringify(aaa)+',');
                    

                }
            }
        }
    }



    //let logg = fs.createWriteStream(__dirname + '/../markov.log', { 'flags': 'a' }); // use {'flags': 'a'} to append and {'flags': 'w'} to erase and write a new file


    /**
     * Generates a single user session for a given set of historic sessions with Markov Chain
     * The session consists of a sequence of activieties (action types)
     * @param {*} data 
     */
    function generateUserSessionActivities(data) {
        const chain = new Chain(data);
        return chain.walk();
    }

    return module;
}// end module