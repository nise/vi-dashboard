/*
author: sg
module: Watch Comparison
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
 * Watch Comparison Chart 
 **/
  app.get('/chart/watch-comparison', function (req, res) { // === url
      Promise.props({
          videos: LogExt2.find().distinct('video_file').execAsync(),
          groups: LogExt2.find().distinct('group').execAsync(),
          context: LogExt2.find().distinct('action_context').execAsync()
      }).then(function (results) {
          res.render('chartWatchComparison', {  
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
  app.get('/data/watchcomparison/videos/:video/groups/:group', function (req, res) {
      console.log('req.params.group: ', req.params.group); // -> 97
      var hrstart = process.hrtime();
      var match_query = {};
      match_query.playback_time = { '$ne': 0 }

      if (req.params.video !== undefined) {
        match_query.video_file = { "$in": req.params.video.split(/,/) };
    }
    if (req.params.group !== undefined) {
        match_query.group = { "$in": utils.map2Int(req.params.group.split(/,/)) };
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
          .aggregate(getQuery(match_query))
          .exec(function (err, pre_data) {
            if (err) {
                res.send(err);
            }
            var
                x = 0,
                y = 1,
                maxX = 0,   // für einheitliche Chartlänge
                users = [],
                groups = [],
                result = [],
                data = {}
                ;
            // iterate users
            console.log("pre_data: ", pre_data);		
            for (var j = 0; j < pre_data.length; j++) {
                data = pre_data[j].p;
                users.push(pre_data[j].u); 
                groups.push(pre_data[j].g);
                // reset
                x = 0;
                y = 1;
                result[j] = [];
                
                // iterate playback_time	 
                for (var i = 0; i < data.length; i++) {
                    x = Math.floor(data[i] / 60);
                    maxX = Math.max(x, maxX);
                    result[j].push({ x: Math.floor(data[i] / 60), y: 1 })
                } // end for entries
            }
            var finData = { results: result, users: users, groups: groups, maxX: maxX};
            console.log("results: ", result);
            console.log("finData: ", finData);
               
              var c = new Cache({ query: req._parsedUrl.path, data: data });
              c.save();
              // json with padding - request fles using script tag instead XHR
              res.jsonp({
                  data: finData,
                  metrics: {
                      context: 'watch-comparison',
                      path: req._parsedUrl.path,
                      size: sizeof(data),
                      querytime: process.hrtime(hrstart)[1] / 1000000
                  }
              });
              
          });
  });

  function getQuery(match_query){ return [
    { "$match": match_query
    // { playback_time: { '$ne': 0 }, 
    //user              : 16, 
    //video_file       :     "e2script_lecture1_improved.mp4",	
    },
    { "$group": {
                    "_id": {
                    "v": "$video_file",
                    "u": "$user",
                    "g": "$group"
        },
                    'p': { $addToSet: '$playback_time' }
                }
    },
    { "$project": {
                    "_id": 0,
                    "v": "$_id.v",
                    "u": "$_id.u",
                    "g": "$_id.g",
                    "p": 1
                 }
    }
  ] }
}