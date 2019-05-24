/*
author: sg
module: Workload
description: 

**/

module.exports = function (app, database) {
  console.log("=== START_acl-workload ===");
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
  app.get('/chart/workload', function (req, res) { // === url
      Promise.props({
          videos: LogExt2.find().distinct('video_file').execAsync(),
          groups: LogExt2.find().distinct('group').execAsync(),
          context: LogExt2.find().distinct('action_context').execAsync()
      }).then(function (results) {
          res.render('chartWorkload', {  // === view-filename
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
  app.get('/data/workload/groups/:group', function (req, res) {
      console.log('req.params.group: ', req.params.group); // -> 97
      var hrstart = process.hrtime();
      var match_query = {};
      match_query.playback_time = { '$ne': 0 }

    if (req.params.group !== undefined) {
        match_query.group = { "$in": utils.map2Int(req.params.group.split(/,/)) };
    }
      
      console.log("match_query workload: ", match_query)
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
                users = [],
                result = [],
                data = {}
                ;
            // iterate users
            console.log("pre_data: ", pre_data);		
            // [ { _id: { u: 6 }, kw: [ [Object], [Object], [Object], [Object] ] },
            //   { _id: { u: 9 }, kw: [ [Object], [Object], [Object], [Object], [Object], [Object],
            //                          [Object], [Object], [Object] ] },
            // { _id: { u: 19 }, kw: [ [Object], [Object], [Object] ] },
            // { _id: { u: 18 }, kw: [ [Object], [Object], [Object], [Object], [Object], [Object],
            //                         [Object], [Object], [Object], [Object] ] } 
            // ]
          
            for (var j = 0; j < pre_data.length; j++) {
                data = pre_data[j].kw;
                console.log("data: ", data);
                // -> data:  [ { kw: 44, v: 'e2script_lecture2_improved.mp4', sum: 2737 },
                //            { kw: 44, v: 'e2script_lecture3_improved.mp4', sum: 3341 },
                //            { kw: 47, v: 'e2script_lecture4_improved.mp4', sum: 4 },
                //            { kw: 47, v: 'e2script_lecture5_improved.mp4', sum: 4 } ]

                users.push(pre_data[j]._id.u); 
                // Array-Index == userid
                userIndex = pre_data[j]._id.u
                result[userIndex] = [];
                console.log("result: ", result);
                // -> result:  [ <6 empty items>, [] ]

                // iterate playback_time	 
                for (var i = 0; i < data.length; i++) {
                  kw = data[i].kw;  // -> 44
                  // falls subArray für Videos noch nicht existiert, erstellen
                  if ( !result[userIndex][kw] ) {
                    result[userIndex][kw] = []; // result[6][44] 
                  }
                 
                  console.log("result userindex kw: ", result);
                  // -> result userindex kw:  [ <6 empty items>, [ <44 empty items>, [] ] ]

                 // for (var k = 0; k < )
                  let VidArray = result[userIndex][kw];
                  console.log("VidArray: ", VidArray);
                  let newVideo = { v: data[i].v, p: data[i].sum  };
                  VidArray.push( newVideo ); 
                  
                } 
            }

            var finData = { results: result, users: users };
            console.log("results: ", result);
            console.log("finData: ", finData);
               
              var c = new Cache({ query: req._parsedUrl.path, data: data });
              c.save();
              // json with padding - request fles using script tag instead XHR
              res.jsonp({
                  data: finData,
                  metrics: {
                      context: 'workload',
                      path: req._parsedUrl.path,
                      size: sizeof(data),
                      querytime: process.hrtime(hrstart)[1] / 1000000
                  }
              });
              
          });
  });

  function getQuery(match_query){ return [
  //   {   "$match":       {   playback_time: { '$ne': 0 },
  //   //    user: 13
  //      // group: 97 
  //  }
    { "$match": match_query },
    {   "$group":       {
                          "_id": {
                                      "u"     : "$user",
                                //       "v"     : "$video_file",
                                      "w"     : { $week: { $add: [new Date(0), "$utc"] } } ,
                                  //     "g"     : "$group",
                                      "v"     : "$video_file"
                                  } ,
                          "count": { "$sum":  1  }
        }
    },

    {   "$project":      {
                  "_id"       :      1               ,       // ausblenden
                  "u"         :      "$_id.u"         ,
                //      "v"         :      "$_id.v"         ,
                  "w"         :      { $add: [ "$_id.w" , 1 ] } , // +1 für korrekte KW, da 0 - 53
                //     "g"         :      "$_id.g",
                  "v"         :      "$_id.v",
                  "sum"       :      { $divide: [ "$count", 3600 ] }
        }
    } ,
    {  $sort : { w : 1, v: 1  } } ,
    {  "$group":     {
          "_id": { "u":"$_id.u"  }      ,
          "kw": { $push:  { "kw": "$_id.w", "v": "$_id.v", "sum": "$sum" } }
        }
    }
  ] }
}