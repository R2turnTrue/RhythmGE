import { throws } from 'node:assert';
import { format } from 'node:path';
import { off } from 'node:process';

import $ from 'jquery';

import { RgbaColor } from "./Utils/RgbaColor";
import { Vec2 } from "./Utils/Vec2";
import { Transform } from "./Transform";
import { TopScale } from "./EditorModules/ScaleModule";
import { ViewportModule, IViewportModule } from "./EditorModules/ViewportModule";
import { Input } from "./Input";
import { Slider, Event, EventVar } from "./Utils/Utils";
import { AudioAmplitudeViewModule, AudioModule, IAudioModule } from "./EditorModules/AudioModules";
import { timeStamp } from 'node:console';
import { start } from 'node:repl';
import { IDrawable } from './GridElements';
import { Export } from "./Export";

export interface IEditorCore {
    transform: Transform;
    audio : IAudioModule;
    viewport: IViewportModule;
    editorData: EditorData;
}

export interface IEditorModule {
    transform: Transform;
    init(editorCoreModules: IEditorCore)
    updateModule();
}

export class EditorData {
    private _snapSlider = new Slider('snap-lines');
    private _playbackSpeedSlider = new Slider('playback-rate');
    
    readonly useClaps = new EventVar<boolean>(false);
    readonly followLine = new EventVar<boolean>(false);
    readonly hideBpmLines = new EventVar<boolean>(false);
    readonly hideCreatableLines = new EventVar<boolean>(false);
    
    readonly scrollingSpeed = new EventVar<number>(0.2);
    readonly resizingSpeed = new EventVar<number>(3);
    readonly fastScrollingSpeed = new EventVar<number>(5);
    readonly offset = new EventVar<number>(0);
    readonly bpmValue = new EventVar<number>(60);
    readonly beatLinesCount = new EventVar<number>(5);
    readonly snapValue = new EventVar<number>(0);
    readonly playbackRate = new EventVar<number>(1);

    readonly audioFile = new EventVar<[string, string]>(null);

    constructor() {
        $('#files').on('change', (event) => { this.onAudioLoad(event); });

        $('#follow-line').on('change', (event) => { this.followLine.value = (event.target as HTMLInputElement).checked; })
        $('#use-claps').on('change', (event) => { this.useClaps.value = (event.target as HTMLInputElement).checked; })
        $('#hide-bpm').on('change', (event) => { this.hideBpmLines.value = (event.target as HTMLInputElement).checked;})
        $('#hide-creatable').on('change', (event) => { this.hideCreatableLines.value = (event.target as HTMLInputElement).checked;})
        $('#beat-lines').on('change', (event) => { this.beatLinesCount.value = parseInt((event.target as HTMLInputElement).value);})
        $('#bpm').on('change', (event) => { this.bpmValue.value = parseInt((event.target as HTMLInputElement).value); })
        $('#offset').on('change', (event) => { this.offset.value = parseInt((event.target as HTMLInputElement).value);})
    
        this._playbackSpeedSlider.value = 1;
        this._snapSlider.value = 0;
        
        this._playbackSpeedSlider.onValueChange.addListener((value) => { this.onPlaybackRateValueChange(value); });
        this._snapSlider.onValueChange.addListener((value) => { this.onSnapSliderValueChange(value); });
    }

    private onAudioLoad(event) {
        const files = event.target.files;
        const  file = files[0];

        this.audioFile.value = [file.name, file.path];
        console.log(files[0]);
    }

    private onPlaybackRateValueChange(value: number) {
        $('#playback-rate-text')[0].innerText =  'Playback rate ' + value.toString() + 'x';
        this.playbackRate.value = value;
    }

    private onSnapSliderValueChange(value: number) {
        value = Math.pow(2, value);
        $('#snap-lines-text')[0].innerText = 'Snap lines 1/' + value.toString();
        this.snapValue.value = value;
    }
} 

export class Editor implements IEditorCore {
    transform = new Transform();
    
    viewport = new ViewportModule(this.transform);
    editorData = new EditorData();
    audio = new AudioModule();

    private _lastDrawable: IDrawable;
    private _editorModules = new Array<IEditorModule>();
    private _editorCanvas: HTMLCanvasElement;

    isControllingAudioTime = false;

    constructor() {
        this._editorCanvas = $("#editor-canvas")[0] as HTMLCanvasElement;
        this.transform.scale = new Vec2(10, 1);
        
        this.viewport.init(this);
        this.audio.init(this);
        this.viewport.transform.parent = this.transform;
        this.audio.transform.parent = this.transform;

        setInterval(() => {this.audio.checkForClaps();}, 5);

        Input.onWheelCanvas.addListener((event) => {this.onChangeScale((event.deltaY));});
        Input.onMouseDownCanvas.addListener((event) => {this.onCanvasClick(event);});
        Input.onMouseUp.addListener((event) => {this.onCanvasMouseUp(event);});
        
        this.update();
    }

    addLastDrawableElement(element: IDrawable) {
        this._lastDrawable = element;
    }

    addEditorModule(element: IEditorModule) {
        element.init(this);
        element.transform.parent = this.transform;
        this._editorModules.push(element)
    }

    update() {
        Input.update();
        this.audio.updateModule();
        this.viewport.updateModule();

        for(let i = 0; i<this._editorModules.length; i++) {
            this._editorModules[i].updateModule();
        }

        this._lastDrawable?.draw(this.viewport, this._editorCanvas);

        if (this.isControllingAudioTime) {
            this.audio.setMusicFromCanvasPosition(new Vec2(Input.mousePosition.x - 20, Input.mousePosition.y));
        }
    }

    private oldVolume = 1.0;

    private onCanvasClick(event: JQuery.MouseDownEvent) {
        const clickPos = new Vec2(event.offsetX, event.offsetY);
        if (clickPos.y < 10) {
            console.log("Canvas Mouse Down")
            this.oldVolume = this.audio.getVolume();
            this.audio.setVolume(0.0);
            this.isControllingAudioTime = true
        }
    }

    private onCanvasMouseUp(event: JQuery.MouseUpEvent) {
        console.log("Canvas mouse up")
        if (this.isControllingAudioTime) {
            this.audio.setVolume(this.oldVolume);
            this.isControllingAudioTime = false
        }
    }

    private onChangeScale(mouseDelta: number) {
        if (!Input.keysPressed["ControlLeft"])
            return;
        
        Input.onWheelCanvas.preventFiringEventOnce();
        mouseDelta = mouseDelta > 0 ? 1 : -1;

        let resultedDelta = mouseDelta * Math.log(this.transform.scale.x / this.editorData.resizingSpeed.value);
        let lastPos = this.viewport.transform.localPosition;
        this.transform.scale = new Vec2(this.transform.scale.x - resultedDelta, this.transform.scale.y);

        if (this.transform.scale.x <= this.transform.minScale.x) {
            this.transform.scale = new Vec2(this.transform.minScale.x, this.transform.scale.y);
        }
        if (this.transform.scale.x >= this.transform.maxScale.x) {
            this.transform.scale = new Vec2(this.transform.maxScale.x, this.transform.scale.y);
        }

        this.viewport.transform.localPosition = lastPos;
        this.update();
    } 
}