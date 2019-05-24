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
  referenceUser = 13




  /*
 * Learner Dashboard URL
 **/
  app.get('/chart/learner-dashboard', function (req, res) { // === url
      Promise.props({
          // get the videos from database
          videos: LogExt2.find().distinct('video_file').execAsync(),
      }).then(function (results) {
          res.render('chartLearnerDashboard', {  // === view-filename
              menu: menu,
              videos: utils.sort(results.videos),
              user: referenceUser,
          });
      }).catch(function (err) {
          console.log(err)
          res.send(500); // oops - we're even handling errors!
      });
  });

  /*
   *    Aufruf aus Cache?!?!
   */
  app.get('/data/learner-dashboard', function (req, res) {
    //  console.log('req.params.group: ', req.params.group); // -> 97
        var hrstart = process.hrtime();
       
        // var match_query = {};
        // match_query.playback_time = { '$ne': 0 }
        // // TEST_USER
        // match_query.user = 13;

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


    // if (req.params.group !== undefined) {
    //     match_query.group = { "$in": utils.map2Int(req.params.group.split(/,/)) };
    // }

        Promise.props({
            timespent       :    LogExt2.aggregate(query_timespent).execAsync(),
            weekdays        :    LogExt2.aggregate(query_weekdays).execAsync(),
            socialpeaks     :    LogExt2.aggregate(query_socialpeaks).execAsync(),
            personalpeaks   :    LogExt2.aggregate(query_personalpeaks).execAsync(),
      //      completionrate  :    LogExt2.aggregate(query_completionrate).execAsync(), // NEU!!
            socialpeaks2    :    LogExt2.aggregate(query_socialpeaks_2).execAsync(),
            personalpeaks2  :    LogExt2.aggregate(query_personalpeaks_2).execAsync(),
        }).then(function (results) { console.log(results.events);
            res.jsonp({
                data: results,
                meta: {
                    timespent: {    title: "Time Spent", x_dimension: "calender week", 
                                    x_unit: "week", y_dimension: "Playback time", y_unit: "hours"},
                    weekdays: {     title: "Weekdays", x_dimension: "calender week",                                
                                    x_unit: "week", y_dimension: "Playback time", y_unit: "hours"},
                    socialpeaks: {  title: "Social Peaks", x_dimension: "Playback time",                                
                                    x_unit: "week", y_dimension: "Times watched", y_unit: "Count"},
                    personalpeaks: {  title: "Personal Peaks", x_dimension: "Playback time",                                
                                    x_unit: "week", y_dimension: "Times watched", y_unit: "Count"},
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
            console.log("Results_LearnerDashboard: ", results)
        }).catch(function (err) {
            console.log(err)
            res.send(500); // oops - we're even handling errors!
        });
    });

var query_timespent =  [
    {   "$match":   {   playback_time   : { '$ne': 0 },
                        user            : referenceUser } 
        },
    {   "$group":   {   "_id"   : {    "v"     : "$video_file",
                                    "w"     : { $week: { $add: [new Date(0), "$utc"] } } ,
                                    "u"     : "$user"             } ,
                        "count" : { "$sum":  1  }  }
        },
    {   "$project": {   "_id"   :   0               ,       // ausblenden
                        "u"     :   "$_id.u"           ,
                        "w"     :   { $add: [ "$_id.w" , 1 ] } , // +1 für korrekte KW, da 0 - 53
                        "v"     :   "$_id.v"         ,
                        "sum"   :   { $divide: [ "$count", 60 ] }      }      // convert to minutes
        } ,    
    {  "$group":    {   "_id"   : "$w",
                        "kw"    : { $push:  { "v": "$v", "sum": "$sum" } }          }
        }
];
/* 10 */
// {
//     "_id" : 49.0,
//     "kw" : [ 
//         {
//             "v" : "e2script_lecture5_improved.mp4",
//             "sum" : 0.00222222222222222
//         }
//     ]
// }

var query_weekdays = [
    {   "$match":   {   playback_time   : { '$ne': 0 },
                        user            : referenceUser } 
        },
    {   "$group":   {   "_id"   : {    "d"     : { $dayOfWeek: { $add: [new Date(0), "$utc"] } } ,      // 1-7, Sun-Sat
                                        } ,
                        "count" : { "$sum":  1  }  }
        },
    {   "$project": {   "_id"   :   0               ,       // ausblenden         ,
                        "d"     :   "$_id.d",
                        "sum"   :   { $divide: [ "$count", 3600 ] }      }
        } 
];  
/* 1 */
    //  { d: 6, sum: 0.005555555555555556 },
    //  { d: 1, sum: 1.5763888888888888 },
    //  { d: 5, sum: 0.9605555555555556 },
    //  { d: 2, sum: 3.0025 },
    //  { d: 4, sum: 1.5230555555555556 } 

var query_socialpeaks = [
    {   "$match":   {   //playback_time   : { "$ne" : 0 },
                        user            : { "$ne" : referenceUser } , // not equal current user for social peaks
                    // group : 99,
                        video_file      : "e2script_lecture1_improved.mp4"  }
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
];
//   /* 1 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 0,
//     "count" : 94.0
// }
//  /* 2 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 1,
//     "count" : 20.0
// }

var query_personalpeaks = [
    {   "$match":   {   //playback_time   : { "$ne" : 0 },
                        user        : referenceUser  , // equal current user for personal peaks
                    // group : 99,
                        video_file      : "e2script_lecture1_improved.mp4"  }
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
]; 
//   /* 1 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 0,
//     "count" : 94.0
// }
//  /* 2 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 1,
//     "count" : 20.0
// }
 
var query_socialpeaks_2 = [
    {   "$match":   {   //playback_time   : { "$ne" : 0 },
                        user            : { "$ne" : referenceUser } , // not equal current user for social peaks
                        video_file      : "e2script_lecture2_improved.mp4"  }
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
];
//   /* 1 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 0,
//     "count" : 94.0
// }
//  /* 2 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 1,
//     "count" : 20.0
// }

var query_personalpeaks_2 = [
    {   "$match":   {   //playback_time   : { "$ne" : 0 },
                        user        : referenceUser  , // equal current user for personal peaks
                        video_file      : "e2script_lecture2_improved.mp4"  }
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
]; 
//   /* 1 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 0,
//     "count" : 94.0
// }
//  /* 2 */
// {
//     "v" : "e2script_lecture5_improved.mp4",
//     "sec" : 1,
//     "count" : 20.0
// }

};  // end module
