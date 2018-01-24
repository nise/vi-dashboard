module.exports = {

	module: {},

	menu: [
		{
			title: "Access", link: "#", items: [
				//{ title: "Playback", link: "/chart/playback"},
				{ title: "Access ", link: "/chart/access" }
				//,{ title: "Rewatching graphs", link: "/chart/rewatching" }
			]
		},
		{
			title: "Video watching", link: "#", items: [
				//{ title: "Playback", link: "/chart/playback"},
				{ title: "Playback peaks", link: "/chart/playback-peaks" },
				{ title: "Rewatching graphs", link: "/chart/rewatching" },
				{ title: "Forward-backward diagram", link: "/chart/forward-backward" }
			]
		},
		{
			title: "Video interactions", link: "#", items: [
				{ title: "Interactions by type", link: "/chart/playback-interactions/group/all/user/all" },
				{ title: "Histograms of interaction", link: "/chart/playback-histogram" }
			]
		}, {
			title: "Group activities", link: "#", items: [
				{ title: "CORDTRA", link: "/chart/cordtra" },
				{ title: "Group comparison", link: "/chart/groups" }
			]
		},
		{
			title: "Annotations", link: "#", items: [
				{ title: "Qizes", link: "/chart/quiz" }
				//,{ title: "Group comparison", link: "/chart/groups" }
			]
		}
		//,{ title: "Learning results", link: "#" }

	],

	getMenuDOM: function (req, res) {
		var
			m = module.exports.menu,
			res = ''
			;
		for (var i = 0; i < m.length; i++) {

			var items = '';
			if (m[i].items !== undefined) {
				for (var j = 0; j < m[i].items.length; j++) {
					items += '<li class="level-2"><a href="' + m[i].items[j].link + '">' + m[i].items[j].title + '</a></li>';
				}
				var t = [
					'<li class="level-1">',// dropdown
					//'<a href="'+m[i].link+'" >',//class="dropdown-toggle" data-toggle="dropdown"
					'<span>',
					m[i].title,
					//				'<span class="caret">',
					//'</a>',
					'</span>',
					'<ul >',//class="dropdown-menu" role="menu"
					items,
					'</ul></li>'
				];
				res += t.join('')
			} else {

				var t = [
					'<li class="">',
					'<a href="' + m[i].link + '">',
					m[i].title,
					'</a>',
					'</li>'
				];
				res += t.join('')
			}

			//'<li class="active"><a href="'+ 9 +'">'+ m[i].title +'</a></li>'
		}
		return res;
	}

}	