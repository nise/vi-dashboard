/*
author: sascha.gastel@mailbox.org
module: Learner Dashboard
description: 

**/

module.exports = function (app, database) {
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
        sizeof = require('object-sizeof')
        ;
    require('mongoose').Promise = require('bluebird')
    Promise.promisifyAll(mongoose); // key part - promisification
  
  
    var match_query = {};
    match_query.playback_time = { '$ne': 0 }
    match_query.user = 13;
    // TEST_USER
    referenceUser = 20
  
    // // load meta-data video -> videotitle: videolength
    // var videoMetaSource = require('../import_data/etutor2015-videos.json');
    // var videoMeta = {}
    // for (var i = 0, len = videoMetaSource.length; i < len; i++) { 
    //     filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/','');
    //     videolength = videoMetaSource[i].metadata[0].videolength;
    //     //console.log("video: ", filename, " : videolength[i]: ", videolength);
    //     videoMeta[filename] = videolength;
    // }
    // console.log("videoMeta: ", videoMeta);
  
  
    /*
   * Learner Dashboard URL - Render template
   **/
    app.get('/chart/learner-dashboard-user2', function (req, res) { // === url
        Promise.props({
            // get the videos from database
            videos: LogExt2.find().distinct('video_file').execAsync(),
        }).then(function (results) {
            res.render('chartLearnerDashboardUser2', {  // === view-filename
                menu: menu,
                videos: utils.sort(results.videos),
            });
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });
   

    /*
     *    TimeSpentVideo
     */
    // Aufruf aus Cache?!?!
        //     app.get('/cached/data/rewatching/group/:group/video/:video', function (req, res) {
        //    app.get('/data/learner-dashboard-user2/timespent-video/video/:video', function (req, res) {
    app.get('/cached/data/learner-dashboard-user2/timespent-video/video/:video', function (req, res) {

        var hrstart = process.hrtime();
        var match_query = {};

        // build the query
        match_query.playback_time = { '$ne': 0 }; // not equal 0
        match_query.user = referenceUser;

        if (req.params.video !== undefined) {
            var videos = req.params.video.split(/,/);
            //videos = videos.map(function (x) { return parseInt(x,); });
            match_video_file = { "$in": videos };
            match_query.video_file = match_video_file;
        }

        // load meta-data video -> videotitle: videolength
        var videoMetaSource = require('../import_data/etutor2015-videos.json');
        var videoMeta = {}
        for (var i = 0, len = videoMetaSource.length; i < len; i++) { 
            filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/','');
            videolength = videoMetaSource[i].metadata[0].videolength;
            videoMeta[filename] = videolength;
        }
        console.log("videoMeta: ", videoMeta);

      console.log("match_query: ", match_query);

        Promise.props({
            timespentVideo       :    LogExt2.aggregate([

                  {   "$match":   match_query   },
                  {   "$group":   {   "_id"   : {   // "v"     : "$video_file",
                                                  "w"     : { $week: { $add: [new Date(0), "$utc"] } } ,
                                                  "u"     : "$user"             } ,
                                      "count" : { "$sum":  1  }  }
                      },
                  {   "$project": {   "_id"   :   0               ,       // ausblenden
                                      "u"     :   "$_id.u"           ,
                                      "w"     :   { $add: [ "$_id.w" , 1 ] } , // +1 für korrekte KW, da 0 - 53
                                      "v"     :   "$_id.v"         ,
                                      "sum"   :   { $divide: [ "$count", 60 ] }      }      // convert to hours
                      } 

            ]).execAsync(),
        }).then(function (results) {
            res.jsonp({
                data: results,
                meta: { // not in use
                    timespentVideo: {  title: "Time Spent", x_dimension: "Kalenderwoche", 
                                    x_unit: "Woche", y_dimension: "Zeitaufwand", y_unit: "Stunden:Minuten"}
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
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });      
   


    /*
     *    PEAKS ******************
     */
    // Aufruf aus Cache?!?!
    //app.get('/data/learner-dashboard-user2/peaks/video/:video', function (req, res) {
    app.get('/cached/data/learner-dashboard-user2/peaks/video/:video', function (req, res) {

        var hrstart = process.hrtime();
        var match_query = {};
        match_query.playback_time = { '$ne': 0 }; // not equal 0
        match_query.user = referenceUser;

        // load meta-data video -> videotitle: videolength
        var videoMetaSource = require('../import_data/etutor2015-videos.json');
        var videoMeta = {}
        for (var i = 0, len = videoMetaSource.length; i < len; i++) { 
            filename = videoMetaSource[i].video.replace('http://141.46.8.101/beta/e2script/','');
            videolength = videoMetaSource[i].metadata[0].videolength;
            //console.log("video: ", filename, " : videolength[i]: ", videolength);
            videoMeta[filename] = videolength;
        }
        console.log("videoMeta: ", videoMeta);


      if (req.params.video !== undefined) {
              match_query.video_file = req.params.video;
              }
      console.log("match_query: ", match_query);

        Promise.props({
            peaksSocial       :    LogExt2.aggregate([

                {   "$match":   {   //playback_time   : { "$ne" : 0 },
                                    user            : { "$ne" : referenceUser } , // not equal current user for social peaks
                                    video_file      : match_query.video_file  }
                },
                {   "$sort":    {   "playback_time" : -1 } }, 
                {   "$group":   {   "_id"   :   {   "sec"   : "$playback_time"  , 
                                                "v"    : "$video_file"         } ,
                                "count" :   { "$sum":  1  }  }
                },
                { "$project": {
                                "_id": 0,
                                "v": "$_id.v",
                                "sec": "$_id.sec",
                                'count': '$count'
                                }
                }

            ]).execAsync(),
            peaksPersonal       :    LogExt2.aggregate([

                {   "$match":   {   //playback_time   : { "$ne" : 0 },
                                    video_file  : match_query.video_file,
                                    user        : referenceUser  , // equal current user for personal peaks
                                  }
                },
                {   "$sort":    {   "playback_time" : -1 } }, 
                {   "$group":   {   "_id"   :   {   "sec"   : "$playback_time"  , 
                                                "v"    : "$video_file"         } ,
                                "count" :   { "$sum":  1  }  }
                },
                {   "$sort":    {   "_id.sec" : -1 } }, 
                { "$project": {
                                "_id": 0,
                                "v": "$_id.v",
                                "sec": "$_id.sec",
                                'count': '$count'
                                }
                }
            ]).execAsync(),
        }).then(function (results) {
            res.jsonp({
                data_social: results.peaksSocial,
                data_personal: results.peaksPersonal,
                meta: { // not in use
                    peaks: {  title: "Time Spent", x_dimension: "Kalenderwoche", 
                                    x_unit: "Woche", y_dimension: "Zeitaufwand", y_unit: "Stunden:Minuten"}
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
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });          
  



  };  // end module
  