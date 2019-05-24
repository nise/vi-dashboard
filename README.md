

# Usage
**Install on server**

1. Obtain code: `git clone https://github.com/nise/vi-dashboard`
2. Enter directory `cd vi-dashboard`
2. Install dependencies: `sudo npm install`
3. Run the server with the default dataset: `node server`

**Import data**
* IWRM education log files: `node server import-iwrm`
* Scripted video collaboration (E-Tutor Qualification): 
 * Restore the dataset from dumped file: `mongorestore --db vi-dashboard ./dump/vi-dashboard` 
 * Import and convert the data: `node server import-etutor`
 <!--  `node server import-hpi` -->

**Simulate data**
* Generate simulation data: `node server markov` (see /routs/markov.js for settings)

**Load a specific dataset**
* Load IWRM education dataset: `node server iwrm`
* Load IWRM education dataset: `node server hpi`
* Load etutor dataset: `node server etutor`
* Load simulated data: `node server markov`


# Vi-Dashboard
## Access
## Video usage
## Video interaction
## Group interaction

## Annotations

# License
MIT

 
 
 

