import { CreatableLinesModule } from "./EditorModules/CreatableLinesModule";
import { EditorGrid } from "./EditorModules/EditorGridModule";
import { ElementSelectorModule } from "./EditorModules/ElementSelectorModule";
import { TimestampsModule } from "./EditorModules/TimestampsModule";
import { CreatableTimestampLine, GridElement, Timestamp } from "./GridElements";
import { Input, KeyBinding } from "./Input";
import { Vec2 } from "./Utils/Vec2";

export interface ICommand {
    execute();
    undo();
}

export class CommandsController {
    
    private static commandsCapacity = 50;
    private static commandIndex = 0;
    private static commands = new Array<ICommand>();
    private static _init: boolean = false;

    private static undoBind = new KeyBinding();
    private static redoBind = new KeyBinding();

    static init() {
        this._init = true;
        
        this.undoBind.keysList = ["ControlLeft", "KeyZ"];
        this.redoBind.keysList = ["ControlLeft", "KeyY"]
        this.undoBind.onBindPress.addListener(() => this.undoCommand());
        this.redoBind.onBindPress.addListener(() => this.redoCommand());

        Input.registerKeyBinding(this.undoBind);
        Input.registerKeyBinding(this.redoBind);
    }

    static executeCommand(executedCommand: ICommand) {
        if (this.commandIndex != this.commands.length-1) {
            this.commands.splice(this.commandIndex);
        }

        if (this.commands.length > this.commandsCapacity) {
            this.commands.shift();
        }

        this.commands.push(executedCommand);
        this.commandIndex=this.commands.length-1;
        executedCommand.execute();
    }

    static undoCommand() {
        if (this.commands.length < 1 || this.commandIndex < 0)
            return;
        this.commands[this.commandIndex].undo();
        this.commandIndex--;
    }

    static redoCommand() {
        if (this.commands.length < 1 || this.commandIndex == this.commands.length-1) {
            return;
        }
        this.commandIndex++;
        this.commands[this.commandIndex].execute();
    }
}

export class CopyCommand implements ICommand {
    constructor 
    (
        private gridElements: Array<GridElement>,
        private selector: ElementSelectorModule
        ) {}
   
    execute() {
        if (this.gridElements.length < 1) {
            return
        }

        console.log("Copy")
        const clipboard = []
        const sortedElements = this.gridElements.sort((a, b) => a.transform.position.x - b.transform.position.x)
        sortedElements.forEach((element) => {
            if (element instanceof Timestamp) {
                clipboard.push(element)
                element.positionWhenCopy = element.transform.position
                element.deselect();
            }
        });

        const firstElement = sortedElements[0]

        if (firstElement !== undefined) {
            this.selector.clipboardCopiedFrom = firstElement.transform.position
        }

        this.selector.copyScale = this.selector.editor.transform.scale
        this.selector.deselectAll();
        this.selector.clipboardElements = clipboard
    }

    undo() {
    }
}

export class PasteCommand implements ICommand {
    constructor 
    (
        private selector: ElementSelectorModule,
        private to: Vec2
        ) {}
   
    execute() {
        if (this.selector.clipboardElements.length < 1)
            return

        let howMuchToMove = this.to.x - this.selector.clipboardCopiedFrom.x
        const currentScale = this.selector.editor.transform.scale

        const scaleFactor = new Vec2(
            this.selector.editor.transform.scale.x / this.selector.copyScale.x,
            this.selector.editor.transform.scale.y / this.selector.copyScale.y)

        console.log(`Pasting ${this.selector.clipboardElements.length} elements to ${howMuchToMove}!`)

        let i = 0
        let firstTimestampX = 0

        this.selector.clipboardElements.forEach((element) => {
            //element.restore()
            //element.move(new Vec2(element.transform.localPosition.x + howManyCopied, element.transform.localPosition.y))
            //element.transform.position = new Vec2(element.transform.position.x + howManyCopied, element.transform.position.y)
            let afterX = element.positionWhenCopy.x + howMuchToMove

            if (i == 0) {
                this.selector.timestamps.createTimestamp(new Vec2(afterX, element.positionWhenCopy.y))
            } else {
                let distanceBetweenX = (afterX - firstTimestampX) * scaleFactor.x

                this.selector.timestamps.createTimestamp(new Vec2(firstTimestampX + distanceBetweenX, element.positionWhenCopy.y))
            }

            if (i == 0) {
                firstTimestampX = element.positionWhenCopy.x + howMuchToMove
            }
            i++
        })
    }

    undo() {
    }
}

export class CutCommand implements ICommand {
    constructor 
    (
        private gridElements: Array<GridElement>,
        private selector: ElementSelectorModule
        ) {}
   
    execute() {
        if (this.gridElements.length < 1) {
            return
        }

        console.log("Copy")
        const clipboard = []
        const sortedElements = this.gridElements.sort((a, b) => a.transform.position.x - b.transform.position.x)
        sortedElements.forEach((element) => {
            if (element instanceof Timestamp) {
                clipboard.push(element)
                element.positionWhenCopy = element.transform.position
                element.delete(); // added
                element.deselect();
            }
        });

        const firstElement = sortedElements[0]

        if (firstElement !== undefined) {
            this.selector.clipboardCopiedFrom = firstElement.transform.position
        }

        this.selector.copyScale = this.selector.editor.transform.scale
        this.selector.deselectAll();
        this.selector.clipboardElements = clipboard
    }

    undo() {
        this.gridElements.forEach((element) => {
           element.restore();
        });
        this.selector.setSelectedElements(this.gridElements);
    }
}

export class MakeConnectionCommand implements ICommand {
    constructor(
        private firstTimestamp: Timestamp,
        private secondTimestamp: Timestamp
    ) {}
    
    execute() {
        this.firstTimestamp.connectToTimestamp(this.secondTimestamp);
    }
    undo() {
        this.firstTimestamp.removeConnection(this.secondTimestamp);
    }
}

export class RemoveConnectionCommand implements ICommand {
    constructor(
        private firstTimestamp: Timestamp,
        private secondTimestamp: Timestamp
    ) {}
    
    execute() {
        this.firstTimestamp.removeConnection(this.secondTimestamp);
    }
    undo() {
        this.firstTimestamp.connectToTimestamp(this.secondTimestamp);
    }

}

export class SelectElementsCommand implements ICommand {

    constructor (
        private elements: Array<GridElement>, 
        private selector: ElementSelectorModule) {}

    execute() {
        this.elements.forEach((element) => {
            this.selector.selectElement(element);
        });
    }

    undo() {
        this.elements.forEach((element) => {
            this.selector.deselectElement(element);
        });
    }
}

export class DeselectElementsCommand implements ICommand {
    
    constructor (
        protected elements: Array<GridElement>, 
        protected selector: ElementSelectorModule) {}

    execute() {
        this.elements.forEach((element) => {
            this.selector.deselectElement(element);
        });
    }

    undo() {
        this.elements.forEach((element) => {
            this.selector.selectElement(element);
        });
    }
}

export class DeselectAllElementsCommand extends DeselectElementsCommand {
    execute() {
        this.selector.deselectAll();
    }
}

export class DeleteElementsCommand implements ICommand {
    
    constructor 
    (
        private gridElements: Array<GridElement>,
        private selector: ElementSelectorModule
        ) {}
   
    execute() {
        this.gridElements.forEach((element) => {
            element.delete();
        });
        this.selector.deselectAll();
    }
    undo() {
        this.gridElements.forEach((element) => {
           element.restore();
        });
        this.selector.setSelectedElements(this.gridElements);
    }
}

export class CreateElememtsCommand implements ICommand {
    
    constructor (private gridElements: Array<GridElement>) {}
   
    execute() {
        this.gridElements.forEach((element) => {
            element.restore();
        });
    }
    undo() {
        this.gridElements.forEach((element) => {
            element.delete();
        });
    }
 }

export class MoveElementsCommand implements ICommand{
    
    private lastPositions = new Array<Vec2>();

    constructor(private movedElements: GridElement[], private newPositions: Vec2[]) {}
    
    execute() {
        this.movedElements.forEach(element => {
            this.lastPositions.push(element.transform.position);
        });
        for(let i = 0; i<this.movedElements.length; i++) {
            this.movedElements[i].transform.localPosition = this.newPositions[i];
        }
    }

    undo() {
        for(let i = 0; i<this.movedElements.length; i++) {
            this.movedElements[i].transform.localPosition = this.lastPositions[i];
        }
    }

}

CommandsController.init();