
# VIANDA

purpose:
- visualize everything that is possible?
- providing a reserach tool for video log data?
 - interactive charts
 - support data cube interactions?
 - adaptive chart presentation
- providing a dashboard configurator to be used in other learning environments
 - logstore interface for incoming data (xapi, csv, supporting different data formats)
 - embed customized dashboards
 1. create a new/empty dashboard
 2. define input source (API binding, file) and save the data
 3. adaptive presentation of possible charts for the given data input
 4. select charts and filters (structured by its focus: video, watching, interaction, annotation), 
 5. arrange charts on a dashboard (e.g on a matrix, on a tabbed pane)
 6. save and provide embed code

Every chart needs to be implemented as a plugin containing server and client code.
 
 1. die Tauglichkeit der einzelnen Charts evaluieren (=> Hermes)
 2. die Tauglichkeit als Forschungstool testen
 3. 


## Roadmap
* single page app
* modularize js code from views and compress it
* change scale
* rotate dimensions
* compare values
* pre-calculate inside the data-base, e.g. drop-in time 
* help: complete i18next help texts (see chartGroups.ejs for a tooltip example)
* tooltip: add aditional scores and measures as tooltips
* export: declare and call single charts to be sticked in variable layouts
* cron job: define a definition of real-time, e.g. 2h or 5min
* responsive design:https://www.safaribooksonline.com/blog/2014/02/17/building-responsible-visualizations-d3-js/
* **testing**
https://developers.google.com/speed/docs/insights/v2/first-app
AIzaSyDcXR1g2o9JNTjY8TBU0lGGIVgZrCFGO4g
* annotation text mining
* interfaces to edX
* interfaces to xAPI, https://github.com/adlnet/xapi-youtube
* refactore as a plugable module for vi-lab etc
* embedding charts as iframe. See chartGroups.ejs

IWRM
/vi-analytics/public/vi-lab/analysis/cordtra-video-time.html
/scm2-node/public/vi-lab/analysis/bar_sessions_per_country.html
/scm2-node/public/vi-lab/analysis/session_activity_distribution.html
/scm2-node/public/vi-lab/analysis/bar_activities_per_video.html
/scm2-node/public/vi-lab/analysis/heatmap-matrix-paths.html
/scm2-node/public/vi-lab/analysis/bar-paths.html


SCM
/scm2-node/public/vi-lab/analysis/bar_group-annotations.html
/scm2-node/public/vi-lab/analysis/cordtra-group-time-tool.html
/scm2-node/public/vi-lab/analysis/scatter_group_phase_activity.html
/scm2-node/public/vi-lab/analysis/cordtra-video-time-tool.html
/scm2-node/public/vi-lab/analysis/cordtra-video-source-time-tool.html


# urgent
* playback-hist.ejs filters not working



---
# Access
**done** 
- xxx bug at group switch
- number of seperate weeks out of the total number of weeks the cours lasts
- number of separate days out of the total number of days
- estimated total number of hours spend on the course
- distribution of start day total and per phase

- ip_country
- **done** drop-in phase, drop-out phase 
- **done** total number of clicks over total time
- **done** access by day of year, weekday, hour of day, ...
- **done** drop-in, drop-out




------------------------------------------
# Video Playback
		
## Playback Peaks
 **done**
 * resize is not working
 * smooth area/bars
 * bug: absolute number of users == relative number of users / identical chart
 * cut outliers
 * compare groups and videos
 * @speed: vertical line
 * **done** retention rate: ratio of users who have watched a video segment (x:segment, y:views)	
 * **done** average speed per video segment >> real playback time
 * **done** include slide transisions, toc, assessment, etc, 

		
## Rewatching
**done**
 * overlapping dots => distinguish symbols
 * Bug-xxx: align playback time to make plots compareable
 * calc patterns: -- regular rewatcher -- engaged rewatcher -- pauser rewatcher \cite{Boer2008}\cite{Brooks2013} 
 * bug: fix color maping
 * pivoting:
   * done: color = context 
   * color = user => since a chart represents a single user, we need one chart containing data of all users.
   * done: color = date
 * done: select video
 * done: select user (of group)
 * done: filter video, context
  

## Compare first time watches with revisting behaviour and drop out rates

## Session Verlauf
- Länge der sessions je video wird wagerecht aufeinander geschichtet
- videos werden farblich codiert
- x-Achse = time
- y-Achse = session id
=> Verlauf indiziert abfolge von videos und änderungen der länge

## Segment Time Diagram
...color: video_file
...y: playbacktime
...x: concatinated session time

## session start end
... at what playback time ende the users session ~ maximum extent of playback time













------------------------------------------
# Playback Interactions	
## Histograms of interaction
**done**
source: Branch1994
* xxx filter by group and video
* xxx: charts are not displayed
* reset button
 * number of viewings per session
 * viewing duration
 * ? Distribution => Tests: Kolmogorov-Smirnov, Pareto 
* @legend: convert unit automatically
* @histogram: bin size not really optimal
* done: descriptiv statistics: median, mean, sum, n

   - Average video speed: weighted arithmetic mean of the video speeds at all video seconds
   - Proportion of skipped video content (SR) 
   - Effective video speed change (SC)
 
  

## Number of Interactions by type/context
**done**
* **done**  filter
* refactor
* fix main chart label !!!
* chose better color schema
* s,r user
* r video
* r phase

## Forward Backward Diagram
**done**
* tooltip for values
* s phase
* show type and context on top
* calc ratio of bw/fw per periods of time
* color dots by session

## Interactions per video segment
* bar chart
* per context and type

## in-out seek
* number of incomming and outgoing seek operations per playback time

## skip propability => Markov Model
- propability of pausing and skipping the video at a time segment
* \cite{Mongy2005}
* per session
* per segment
* per video
* per concept










------------------------------------------
# Group measurements and visualizations

## Cordtra
**done**
 * fix elastic date range for phases: http://stackoverflow.com/questions/34928544/dc-js-grouping-data-using-utc-time
 * fix padding to xAxis and yAxis
 * variants
   * time, video-file, context/group
   * time, video-id, context/group

## Group Comarison Semaphore
**done**
* highligth median or mean as vertical line
* filter results per phase and groups
* unclear in what realtion the relative data stand !!!
* done: metrics
* done: axis units for absolute values
* done: max/min range per bar

### [value] duration where users were simultaneously online 
**done**
### [value] Extent of activities of the group members
**done**
(Calvani,partizipation)
(Prinz, number of single events)
* Normierte, durchschnittliche Anzahl an Aktivitäten innerhalb einer Gruppe.
### [value] Extent of video watching of the group members
**done**
* Normierte, durchschnittliche Anzahl abgespielter Segments innerhalb einer Gruppe.
### [value] Extent of contributions of the group members
(Calvani,partizipation)
**done**
* Normierte Anzahl an Annotationen (Kapitel, Tags, Kommentare, Fragen, Antworten)
### [value] Equal participation 
**done**
(Calvani,partizipation)
* Normierte Standardabweichung der Aktivitäten der Mitglieder einer Gruppe
(invertiert).
### [value]  number of create events
**done**
(Prinz)
### [value]  number of  edit events
**done**
(Prinz)
### [value]  number of read (?)
**done** 
(Prinz)
### [value] number of used annotations (by type)
**done**
* number of link / menu clicks / answered questions
### [value] Extent of roles/phases: variety of roles / participation in each phase of the script 
(Calvani,partizipation)
* Normierte Standardabweichung der Aktivitäten der Gruppenmitglieder je
Script-Phase (invertiert).
### [value] Rhythm%: regular, constant / 
(Calvani,partizipation)
* Relative Anzahl der Tage, an denen mindestens ein Mitglied der Gruppe aktiv
war, geteilt durch die Gruppengröße.

### [value] Reciprocal perception: amount of perception of contents that belong to the other groups incl. answering their questions
(Calvani,social coersion)
### [value] Reciprocal contributions: contribute to or pass tests of other groups  
(Calvani,social coersion)
### [value] Antwortverhalten%?Reactivity to proposals: 
(Calvani,social coersion)
### [value] Finalisierung%?Conclusiveness: zu einem ende kommen
(Calvani,social coersion)
### [value]  duration of the activities or the project
### [value]  number of active participants
(Prinz)
### [value]  number of objects / documents in the workspace
(Prinz)
### [value]  number of edit metadata events
(Prinz)
### [value]  number of edit data itself  
(Prinz)
### [value] activity = \frac{\# events}{\# group\_members~\cdot~\# days} $ \\[10pt]
(Prinz)
### [value] productivity = \frac{\# create-events}{\# group\_members~\cdot~\# days} $\\[10pt]
(Prinz)
### [value] cooperativity = \frac{\# edit-events}{\# group\_members~\cdot~\# days} $\\[10pt]
(Prinz)
### other
Arbeitsteilung = Wie viel Prozent der Aktivitäten wird von wie viel Prozent der Personen in einem Arbeitsbereich durchgeführt?
=> Vis: Personen / \% (X-Achse) and Ereignisse / \% (Y-Achse)

Reaktionsfähigkeit eines Arbeitsbereichs = Innerhalb von wie vielen Tagen wurden wie viel Prozent der Dokumente mindestens einmal von einer Person (außer dem Autor) betrachtet oder bearbeitet?
=> Shows hwo quickly employees react on newly created documents and how many documents never been accessed by others.  


### [value] added annotations per playback time (by type)

### [value] portion of watched segments per video
     

## perception/usage of concepts 

--------------------------------------------









# Learning Results
## Linguistic Inquiry and Word Count
see {Gasevic2014}
Linguistic Processes
* Word count (WC), 
* Words/sentence (WPS), 
* Words > 6 letters (sixltr)
* Personal pronoms: 1st Person singular (i), 1st person plural (we)
* common verbs
* tense: Past tense (past), Present tense (present), Future tense (future)
Psychological Processes
* Affective (affect): Positive emotion (posemo), Negative emotion (negemo), Anxiety (anx), Anger (an- ger), Sadness (sad)
* Cognitive Processes (cogmech): Insight (insight), Inclusive (incl), Exclusive (excl)
* Perceptual Processes (percept): See, hear, feel
* Biological Processes (bio): Body 
* Relativity (relativ): Motion, space, time

Self-reflection:
* length of self-reflections in each course as a ratio of word counts per self-reflection annotation (WC/Ann).

Annotation counts in each course: 
* i) count of all annotations created by students; 
* ii) count of students’ time-stamped annotations in each of the temporal quartiles (Q1-Q4) relative to the duration of the videos;  
* iii) count of general annotations.


---------------------------------------------
# Ideas
- Arc Diagram for jumps on the timeline
- browser buffer behavior when playing a video: buffersize and playback prograss in a chart with playback position (x) and Seconds (y) \cite{Pegus2015}


 
  
FF/BW-Chart
	https://dc-js.github.io/dc.js/examples/align-axes.html

	Overall activity
	https://dc-js.github.io/dc.js/examples/switching-time-intervals.html
	
	Zeitreihenanlyse
	ARIMA
	
	Addons
	https://www.npmjs.com/package/dc-addons
	
	Performance: 
	- http://oboejs.com/examples
	
	Optimization
	- https://github.com/dc-js/dc.js/wiki/Optimization-and-Performance-Tuning
	- https://www.safaribooksonline.com/blog/2014/02/20/speeding-d3-js-checklist/
	- https://stackoverflow.com/questions/22302146/load-large-dataset-into-crossfilter-dc-js
		
				
