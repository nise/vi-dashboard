/**
 * Imports general data from csv 
 * todo: https://www.npmjs.com/package/cli-progress
 */

module.exports = function (db) {

    var
        module = {},
        l = require('winston'),
        mongoose = require('mongoose'),
        LogIWRM = mongoose.model('LogIWRM'),
        csv = require('csv-parser'),
        fs = require('fs'),
        ua_parser = require('ua-parser-js'),
        geoip = require('geoip-lite'),
        item = {}
        ;
    module.db = db;

    /**
     * Import
     */
    module.importcsv = function () {
        var
            session = {},
            videos = []
            ;
        fs.createReadStream('/home/abb/Documents/www2/vi-analytics-R/videoAnalytics/extdata/scm2013.csv')
                .pipe(csv())
                .on('data', function (d) {
                    if (typeof parseInt(d.utc, 10) === "number" && d.utc !== '') {
                        if (videos.indexOf(d.video) < 0) {
                            videos.push(d.video);
                        }
                        var
                            date = new Date(parseInt(d.utc, 10)),
                            ua = ua_parser(d.ua),
                            geo = geoip.lookup(d.ip),
                            video_id = videos.indexOf(d.video)
                            ;
                           
                        // console.log(getScriptPhase(d.utc));
                        
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

                            /*action_context: d.context,
                            action_type: d.action,
                            action_value: d.value,
                            action_artefact: String,
                            action_artefact_id: String,
                            action_artefact_author: String,
                            action_artefact_time: String,
                            action_artefact_response: String,
                            
                            ua_browser: ua.browser.name ? ua.browser.name : 'na',
                            ua_browser_version: ua.browser.major ? ua.browser.major : 'na',
                            ua_browser_engine: ua.engine.name ? ua.engine.name + '_' + ua.engine.version : 'na',
                            ua_os: ua.os.name ? ua.os.name : 'na',
                            ua_os_version: ua.os.version ? ua.os.version : 'na',
                            ua_device: ua.device.vendor ? ua.device.model + '_' + ua.device.vendor + '_' + ua.device.type : 'na',
*/
                            ip: d.ip,
                            //ip_country: geo ? geo.country : 'na',
                            //ip_city: geo && geo.city !== '' ? geo.city : 'na',
                            //ip_ll: geo ? geo.ll : []
                        };

                        // action
                        var splitt = String(d.action).split(';');
                        //console.log(splitt)    
                        if (splitt[0] === '[add_annotation') {
                            o.action_context= 'comment';
                            o.action_type='add';
                            o.action_value=splitt[1].replace('content:');
                            o.playback_time = splitt[1].replace('time:');
                            d.action='';
                        } else if (splitt[0].substr(0, 7) === 'videos/'){
                            var tmp = splitt[0].split(' seek_end: ');
                            o.video = tmp[0].replace('videos/', '').replace('.webm', '').replace('.mp4', '');
                            o.action_context = 'player';
                            o.action_type = 'seek';
                            o.action_value = tmp[1];
                            d.action = '';
                        } else if (splitt[0].substr(0, 11) === 'seek_start:') {
                            var tmp = splitt[0].split(' ');
                            o.video = 'xxx';//tmp[0].replace('videos/', '').replace('.webm', '').replace('.mp4', '');
                            o.playback_time = tmp[1]
                            o.action_context = 'player';
                            o.action_type = 'seek';
                            o.action_value = -1; 
                            d.action = '';
                        } else if (splitt[0].substr(0, 5) === '[ass_') {
                            var tmp = splitt[0].split('[ass');
                            o.action_context = 'assessment';
                            o.action_type = splitt[0].replace('[ass_','');
                            o.action_value = -1; 
                            d.action = '';
                        } else if (splitt[0].substr(0, 13) === '[open_popcorn') {
                            o.action_context = 'popcorn';
                            o.action_type = -1;//splitt[0].replace('[ass_', '');
                            o.action_value = -1;
                            d.action = '';
                        }else{
                            console.log(d.action);
                        }
                        if(d.action !== ''){
                            console.log(d.action);
                        }

                        //video
                        video_titles = {
                            "0_grundlagen":"Grundlagen der Produktion und Logistik", // 75
                            "3_netzwerktheorie_ChinesePostmanProblem":"Chinese Postman Problem",  // 32
                            "4_netzwerktheorie_eulertourenHamiltongraphen":"Eulersche Touren und hamiltonsche Graphen", // 8,5
                            "5_netzwerktheorie_travellingSalesperson":"Traveling Salesperson Problem", // 40
                            "6_standortplanung_standortentscheidungen":"Location Desicions", // 42
                            "7_scm_jit": "Just in Time Manufacturing",			// 10
                            "8_scm_logistik": "Warehousemanagementsysteme", // 59
                        };
                        o.video_title =  video_titles[o.video];

                        // groups
                        groupOfUser = {
                            "richter_anke": "1b",
                            "poetzsch_christina": "1a",
                            "thum_daniel": "1a",
                            "mauer_sven": "1b",
                            "otavova_kristyna": "2a",
                            "vomelova_martina": "2a",
                            "dvorakova_lucie": "2b",
                            "dziewa_martin": "2b",
                            "tylsova_karolina": "2b",
                            "hrehova_dagmar": "3a",
                            "hessova_eliska": "3a",
                            "hellmund_martin": "3b",
                            "richter_leona_anortha": "3b",
                            "gavrilova_aneliya": "4a",
                            "urbancova_adela": "4a",
                            "halamova_lucie": "4b",
                            "krejcar_zbynek": "4b",
                            "machova_nikola": "5a",
                            "vlckova_martina": "5a",
                            "durchanek_jan": "5b",
                            "sumakud_erick": "5b",
                            "honkova_veronika": "5b",
                            "havelkova_anna": "6a",
                            "richter_loreen": "6b",
                            "bohme_hedi": "6b",
                            "heinz_carola": "6a",
                            "urbanova_ludmila": "7a",
                            "roztocilova_tereza": "7a",
                            "svobodova_eva": "7b",
                            "merkel_karolin": "7b",
                            "michel_tobias": "8a",
                            "merz_daniel": "8b",
                            "lukschova_veronika": "8b",
                            "stiegemann_johannes": "8a"
                        };
                        o.group = groupOfUser[d.user.replace('.', '_')];
                        console.log(d.group,)
/*
                        if (d.video !== '') {
                            o.video_file = String(d.video).toLowerCase();
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
                            session[t] = {}; session[t].session = 0; session[t].utc = o.utc;
                        }
                        // consider entry as a new session if it is more then 30 Minutes difference
                        if ((o.utc - session[t].utc) > 1800000) {
                            session[t].session++;
                        }
                        session[t].utc = o.utc;
                        o.user_session = session[t].session;
                        o.user_name = t;
                        o.user = String(o.ip).replace(/\./g, '');

                        var uu = new LogIWRM(o);
                        */
                       
                    }
                })
                .on('end', function (e) {
                    console.log('Finished import from CSV');
                })
                .on('error', function (e) {
                    console.log('error', e);
                });
        
        l.log('info', 'Imported Users from data/users.csv to DB');
    };

    module.importcsv();


    function getScriptPhase(t) {
        var 
        phase1 = new Date("2013-01-15,12:30"), // xxx
        phase2 = new Date("2013-01-20,20:00"),
        phase3 = new Date("2013-01-23,12:30"),
        phase4 = new Date("2013-01-27,20:00"),
        end = new Date("2013-03-15,00:00")
        ;

        phases = [[phase1, phase2], [phase2, phase3], [phase3, phase4], [phase4, end]];
        var r = -1;
        for(i=0;i<phases;i++){
            if (t > phases[i][0] && t < phases[i][1]){
                r = i;
            }
        }
        return r;
    }

}
