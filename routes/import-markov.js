/*
author: niels.seidel@nise81.com
module: Data Preparation
description: 

**/

module.exports = function (source, target) {
    var
        module = {},
        mongoose = require('mongoose'),
        LogMarkov2 = mongoose.model('LogMarkov2'),
        moment = require('moment'),
        ProgressBar = require('ascii-progress')
        ;


	/**
	 * Data preparation
	 * 
	 */
    module.explode = function (req, res) {
        console.log('Started data preparation')
        var bar = new ProgressBar({
            schema: ':bar',
            total: 1272415
        });
        var speed = [];
        LogMarkov2.remove().exec(function (err, x) {
            if (err) {
                res.send(err);
            }
            var request = require('request'), 
                JSONStream = require('JSONStream'),
                es = require('event-stream')
                ;

            //request({ url: 'http://isaacs.couchone.com/registry/_all_docs' })
            var stream = fs.createReadStream(__dirname + '/../import_data/markov.json', {flags: 'r', encoding: 'utf-8'})
                .pipe(JSONStream.parse('*'))
                .pipe(es.mapSync(function (data) {
                    //console.error(data)
                    bar.tick();
                    data.user = typeof data.group === 'number' ? data.user + (data.group * 5) : -1;
                    (new LogMarkov2(data)).save();
                    //console.log(data.user);
                }))
                .on('end', function(item) {
                    console.log("Woot, imported objects into the database!");
                 });
        });	// end remove
    };

    module.explode();

    return module;
}

