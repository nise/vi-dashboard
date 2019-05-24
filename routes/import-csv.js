/**
 * Imports IWRM data from csv to the mongoose data model
 * todo: https://www.npmjs.com/package/cli-progress
 */

module.exports = function(db, file) {

    const

        l = require('winston'),
        mongoose = require('mongoose'),
        LogIWRM = mongoose.model('LogIWRM'),
        csv = require('csv-parser'),
        fs = require('fs'),
        ua_parser = require('ua-parser-js'),
        geoip = require('geoip-lite');
    let
        module = {};

    module.db = db;

    /**
     * Import
     */
    module.importcsv = function() {
        let
            session = {},
            videos = [];
        LogIWRM.remove({}, function(err) {
            l.log('info', 'Removed all data from collection before import starts')
            fs.createReadStream(__dirname + '/../import_data/' + file)
                .pipe(csv())
                .on('data', function(d) {
                    if (typeof parseInt(d.utc, 10) === "number" && d.utc !== '') {
                        if (videos.indexOf(d.video_id) < 0) {
                            videos.push(d.video_id);
                        }
                        var
                            date = new Date(parseInt(d.utc, 10)),
                            ua = ua_parser(d.ua),
                            geo = geoip.lookup(d.ip),
                            video_id = videos.indexOf(d.video_id);
                        //console.log(d.utc,date)

                        // utc,date,time,user,user_name,user_culture,user_gender,use_session,group,group_name,pahse,video_id,video_file,video_language,video_length,action_context,action_type,action_value,action_artefact,action_artefact_id,action_artefact_author,action_artefact_time,action_artefact_response,playback_time,speed,ip,ua_browser,ua_browser_engine,ua_browser_version,ua_device,ua_os,ua_os_version
                        var o = {
                            the_date: date,
                            utc: parseInt(d.utc, 10),
                            date: date.toLocaleDateString(),
                            time: date.toLocaleTimeString(),
                            phase: 0,

                            group: 0,
                            //user: Number,
                            //user_name: String,
                            //user_gender: String,
                            //user_culture: String,
                            //user_session: Number,

                            group_name: 'na',

                            video_id: video_id,
                            //video_length: String,
                            video_language: 'en',
                            //playback_time: Number,
                            playback_speed: 1,

                            action_context: d.context,
                            action_type: d.action,
                            action_value: d.value,
                            /*action_artefact: String,
                            action_artefact_id: String,
                            action_artefact_author: String,
                            action_artefact_time: String,
                            action_artefact_response: String,
                            */
                            ua_browser: ua.browser.name ? ua.browser.name : 'na',
                            ua_browser_version: ua.browser.major ? ua.browser.major : 'na',
                            ua_browser_engine: ua.engine.name ? ua.engine.name + '_' + ua.engine.version : 'na',
                            ua_os: ua.os.name ? ua.os.name : 'na',
                            ua_os_version: ua.os.version ? ua.os.version : 'na',
                            ua_device: ua.device.vendor ? ua.device.model + '_' + ua.device.vendor + '_' + ua.device.type : 'na',

                            ip: d.ip,
                            ip_country: geo ? geo.country : 'na',
                            ip_city: geo && geo.city !== '' ? geo.city : 'na',
                            ip_ll: geo ? geo.ll : []
                        };
                        if (d.video_id !== '') {
                            o.video_file = String(d.video_id).toLowerCase();
                        }
                        if (d.context === 'player' && d.action === 'seek') {
                            delete o.action_value;
                            o.playback_time = d.value2;
                        }
                        if (d.context === 'toc') {
                            o.playback_time = d.value;
                            delete o.action_value;
                        }
                        if (d.context === 'link') {
                            o.playback_time = d.value2;
                        }
                        // determine sessions
                        var t = 'u' + String(o.ip).replace(/\./g, '');
                        if (session[t] === undefined) {
                            session[t] = {};
                            session[t].session = 0;
                            session[t].utc = o.utc;
                        }
                        // consider entry as a new session if it is more then 30 Minutes difference
                        if ((o.utc - session[t].utc) > 1800000) {
                            session[t].session++;
                        }
                        session[t].utc = o.utc;
                        o.user_session = session[t].session;
                        o.user_name = t;
                        o.user = parseInt(d.user, 16); // String(o.ip).replace(/\./g, ''); // IWRM adoption

                        var uu = new LogIWRM(o);
                        uu.save(function(err) {});
                        //console.log(o)
                    }
                })
                .on('end', function(e) {
                    console.log('Finished import from CSV');
                })
                .on('error', function(e) {
                    console.log('error', e);
                });
        }); // end delete users
        l.log('info', 'Imported Users from data/users.csv to DB');
    };

    module.importcsv();

};