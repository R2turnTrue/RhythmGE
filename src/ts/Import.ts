import { Dialog, FileFilter } from "electron";
import * as fs from "fs";
import $ from "jquery";

import { Timestamp } from "./GridElements";

export abstract class Import {
    static openFile(callback) {
        console.log(require("electron"))

        const ipcRenderer = require('electron').ipcRenderer

        ipcRenderer.once('openDialog-reply', (evt, content: string) => {
            console.log(content)
            const returnValue = []
            let timestamps = content.split('\n')
            timestamps = timestamps.slice(1, timestamps.length)

            timestamps.forEach((rawTimestamp) => {
                const info = rawTimestamp.split(':')

                if (info.length >= 4) {
                    const timeInMillis = parseInt(info[0])
                    const timestampId = parseInt(info[1])
                    const prefabId = parseInt(info[2])
                    const lpbTrackId = parseInt(info[3])
                    
                    let longNote = false
                    if (info[4] !== undefined) {
                        longNote = parseInt(info[4]) === 1
                    }

                    const connectedTimestampsCount = parseInt(info[5])
                    const nextTimestampId = parseInt(info[6])

                    returnValue.push(
                        {
                            timeInMillis: timeInMillis,
                            timestampId: timestampId,
                            prefabId: prefabId,
                            lpbTrackId: lpbTrackId,
                            longNote: longNote,
                            connectedTimestampsCount: connectedTimestampsCount,
                            nextTimestampId: nextTimestampId
                        }
                    )
                }
            })

            callback(returnValue)
        })

        ipcRenderer.on('openDialog-reply', (evt, content: string) => {
        })

        ipcRenderer.send('openDialog')

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
    }

    private static getContent(timestamps: Timestamp[]): string {
        const separator = ":";
        let result = new Array<string>();
        result.push("[Timestamps]");

        for(let i = timestamps.length-1; i >= 0; i--) {
            timestamps[i].id = i
        }

        timestamps.forEach(timestamp => {
            let string = Math.round(timestamp.transform.localPosition.x * 1000) + separator + timestamp.id + 
                separator + timestamp.prefab.prefabId + separator + timestamp.transform.localPosition.y + separator;
            
            if (timestamp.isLongTimestamp) {
                string += "1" + separator + timestamp.connectedTimestamps.length;
                timestamp.connectedTimestamps.forEach(connected => {
                    string += separator + connected[0].id;
                })
            }
            else
                string += "0";

            result.push(string)
        });
       
        return result.join("\n");
    }
}