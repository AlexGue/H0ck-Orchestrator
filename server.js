var express = require('express');
const app = express();
var sha1 = require("crypto-js/sha1");
var uuid = require('uuid-random');
var request = require('request');
var utils = require('./utils')
const bodyParser = require('body-parser');
app.use(bodyParser.json());

var taskMap = {

}

var resolutionMap = {

}

app.get('/tasks/resume', (req, res) => {
    var taskClone = {};
    for (var k of Object.keys(taskMap)) {
        taskClone[k] = {}
        for (var k2 of Object.keys(taskMap[k])) {
            taskClone[k][k2] = {
                minitasks: {
                    pending: Object.keys(taskMap[k][k2].minitasks.pending).length,
                    progress: Object.keys(taskMap[k][k2].minitasks.progress).length,
                    finished: Object.keys(taskMap[k][k2].minitasks.finished).length
                },
                config: taskMap[k][k2].config,
                resolution: resolutionMap[k2] ? resolutionMap[k2] : {}
            }
        }
    }
    res.status(200).json(taskClone);
})

app.delete('/task/:type/:hash', (req, res) => {
    delete resolutionMap[req.params.hash];
    delete taskMap[req.params.type][req.params.hash];
    res.status(200);
})

app.post('/tasks/solve/:type', (req, res) => {
    var type = req.params.type;
    res.status(200).send("")
    for (var task of Object.keys(req.body)) {
        console.log(req.body)
       
        for (var minitask of Object.keys(req.body[task].minitasks.finished)) {
            delete taskMap[type][task].minitasks.progress[minitask];
            taskMap[type][task].minitasks.finished[minitask] = req.body[task].minitasks.finished[minitask];
        }

        if (type == "bruteapi") {
            for (var hash of Object.keys(req.body[task].resolution)) {
                resolutionMap[task] = resolutionMap[task] || {};
                if (!resolutionMap[task][hash]) {
                    resolutionMap[task][hash] = req.body[task].resolution[hash]
                } else {
                    resolutionMap[task][hash].numberOfRequests += req.body[task].resolution[hash].numberOfRequests;
                    for (var v of req.body[task].resolution[hash].variables) {
                        resolutionMap[task][hash].variables.push(v)
                    }

                }
            }
        }

    }


    
})


app.post('/tasks/obtain/:type', (req, res) => {
    var type = req.params.type;
    if (taskMap[type]) {
        if (type == "bruteapi") {
            var bigTaskId = Object.keys(taskMap[type])[0];
            console.log(bigTaskId)
            var tareasAssign = {};
            tareasAssign[bigTaskId] = {
                minitasks: { pending: {}, progress: {}, finished: {} },
                config: taskMap[type][bigTaskId].config
            };
            var i = 0;
            var miniTasks = taskMap[type][bigTaskId].minitasks;
            var miniTaskList = Object.keys(miniTasks.pending);
            while (i < 300 && i < miniTaskList.length) {
                var miniTaskId = miniTaskList[i];
                console.log(i)
                tareasAssign[bigTaskId].minitasks.pending[miniTaskId] = miniTasks.pending[miniTaskId];
                miniTasks.progress[miniTaskId] = miniTasks.pending[miniTaskId];
                delete miniTasks.pending[miniTaskId];
                i++;
            }
            res.status(200).json(tareasAssign);

        }

    }

});


app.post('/task/:type/', (req, res) => {
    var type = req.params.type;

    if (type == "bruteapi") {
        var taskObject = {
            minitasks: {
                pending: {},
                progress: {},
                finished: {}
            },
            config: req.body.config.attackConfig
        }


        var promisesUrl = []
        //Replace URL with the real list of the URL
        for (var v in req.body.config.variables) {
            if (req.body.config.variables[v].constructor === String) {
                promisesUrl.push(getArrayFromUrlTxt(req.body.config.variables[v]).then(x => {
                    req.body.config.variables[v] = x;
                }));
            }
        }
        Promise.all(promisesUrl).then(x => {
            switch (req.body.config.combineMode) {
                case "combineAll": //Combine all possibilities
                    //  console.log("Generating combinatory: " + JSON.stringify(req.body.config.variables))
                    var possibilities = utils.combineVariables(req.body.config.variables)
                    for (var possible of possibilities) {
                        taskObject.minitasks.pending[uuid()] = {
                            variables: possible
                        }
                    }
                    console.log("Sending response");

                    var uid = uuid();
                    taskMap[type] = taskMap[type] || {};
                    taskMap[type][uid] = taskObject;

                    var result = {}
                    result[uid] = taskObject
                    res.status(200).json(result)

                case "combineOnSuccess": //When the first variable get different results, start combining the second variable
                    return;
                case "oneTime":  //Just one time each variable, for this uses the first value of the other variables
                    return;
            }
        })
    }
});


async function getArrayFromUrlTxt(url) {
    console.log("Getting array")
    return new Promise(function (resolve, reject) {
        request.get(url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log("Resolved")
                resolve(body.split("\n"));
            }
            else {
                reject(error)
            }
        })
    })
}


app.listen(3000, function () {
    console.log('Example app listening on port 3000!');
});
