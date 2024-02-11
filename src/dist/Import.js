"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Import = void 0;
var Import = /** @class */ (function () {
    function Import() {
    }
    Import.openFile = function (callback) {
        console.log(require("electron"));
        var ipcRenderer = require('electron').ipcRenderer;
        ipcRenderer.once('openDialog-reply', function (evt, content) {
            console.log(content);
            var returnValue = [];
            var timestamps = content.split('\n');
            timestamps = timestamps.slice(1, timestamps.length);
            timestamps.forEach(function (rawTimestamp) {
                var info = rawTimestamp.split(':');
                if (info.length >= 4) {
                    var timeInMillis = parseInt(info[0]);
                    var timestampId = parseInt(info[1]);
                    var prefabId = parseInt(info[2]);
                    var lpbTrackId = parseInt(info[3]);
                    var longNote = false;
                    if (info[4] !== undefined) {
                        longNote = parseInt(info[4]) === 1;
                    }
                    var connectedTimestampsCount = parseInt(info[5]);
                    var nextTimestampId = parseInt(info[6]);
                    returnValue.push({
                        timeInMillis: timeInMillis,
                        timestampId: timestampId,
                        prefabId: prefabId,
                        lpbTrackId: lpbTrackId,
                        longNote: longNote,
                        connectedTimestampsCount: connectedTimestampsCount,
                        nextTimestampId: nextTimestampId
                    });
                }
            });
            callback(returnValue);
        });
        ipcRenderer.on('openDialog-reply', function (evt, content) {
        });
        ipcRenderer.send('openDialog');
        /*
        let showDialogPromise = dialog.showSaveDialog({title: "Export File", filters:[{name:"Rhythm Beatmap File", extensions: ["rbm"]}]});
        
        showDialogPromise.then(result => {
            if (result.canceled) {
                console.log("ERROR OMG OMG");
                return;
            }
            console.log(`file path is: ${result.filePath}`);
            fs.writeFile(result.filePath+".rbm", this.getContent(timestamps), (err) => {
                if (err) {
                    console.log("FUCKING ERROR");
                    return;
                }
            });
        });
        */
    };
    Import.getContent = function (timestamps) {
        var separator = ":";
        var result = new Array();
        result.push("[Timestamps]");
        for (var i = timestamps.length - 1; i >= 0; i--) {
            timestamps[i].id = i;
        }
        timestamps.forEach(function (timestamp) {
            var string = Math.round(timestamp.transform.localPosition.x * 1000) + separator + timestamp.id +
                separator + timestamp.prefab.prefabId + separator + timestamp.transform.localPosition.y + separator;
            if (timestamp.isLongTimestamp) {
                string += "1" + separator + timestamp.connectedTimestamps.length;
                timestamp.connectedTimestamps.forEach(function (connected) {
                    string += separator + connected[0].id;
                });
            }
            else
                string += "0";
            result.push(string);
        });
        return result.join("\n");
    };
    return Import;
}());
exports.Import = Import;
