"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveElementsCommand = exports.CreateElememtsCommand = exports.DeleteElementsCommand = exports.DeselectAllElementsCommand = exports.DeselectElementsCommand = exports.SelectElementsCommand = exports.RemoveConnectionCommand = exports.MakeConnectionCommand = exports.CutCommand = exports.PasteCommand = exports.CopyCommand = exports.CommandsController = void 0;
var GridElements_1 = require("./GridElements");
var Input_1 = require("./Input");
var Vec2_1 = require("./Utils/Vec2");
var CommandsController = /** @class */ (function () {
    function CommandsController() {
    }
    CommandsController.init = function () {
        var _this = this;
        this._init = true;
        this.undoBind.keysList = ["ControlLeft", "KeyZ"];
        this.redoBind.keysList = ["ControlLeft", "KeyY"];
        this.undoBind.onBindPress.addListener(function () { return _this.undoCommand(); });
        this.redoBind.onBindPress.addListener(function () { return _this.redoCommand(); });
        Input_1.Input.registerKeyBinding(this.undoBind);
        Input_1.Input.registerKeyBinding(this.redoBind);
    };
    CommandsController.executeCommand = function (executedCommand) {
        if (this.commandIndex != this.commands.length - 1) {
            this.commands.splice(this.commandIndex);
        }
        if (this.commands.length > this.commandsCapacity) {
            this.commands.shift();
        }
        this.commands.push(executedCommand);
        this.commandIndex = this.commands.length - 1;
        executedCommand.execute();
    };
    CommandsController.undoCommand = function () {
        if (this.commands.length < 1 || this.commandIndex < 0)
            return;
        this.commands[this.commandIndex].undo();
        this.commandIndex--;
    };
    CommandsController.redoCommand = function () {
        if (this.commands.length < 1 || this.commandIndex == this.commands.length - 1) {
            return;
        }
        this.commandIndex++;
        this.commands[this.commandIndex].execute();
    };
    CommandsController.commandsCapacity = 50;
    CommandsController.commandIndex = 0;
    CommandsController.commands = new Array();
    CommandsController._init = false;
    CommandsController.undoBind = new Input_1.KeyBinding();
    CommandsController.redoBind = new Input_1.KeyBinding();
    return CommandsController;
}());
exports.CommandsController = CommandsController;
var CopyCommand = /** @class */ (function () {
    function CopyCommand(gridElements, selector) {
        this.gridElements = gridElements;
        this.selector = selector;
    }
    CopyCommand.prototype.execute = function () {
        if (this.gridElements.length < 1) {
            return;
        }
        console.log("Copy");
        var clipboard = [];
        var sortedElements = this.gridElements.sort(function (a, b) { return a.transform.position.x - b.transform.position.x; });
        sortedElements.forEach(function (element) {
            if (element instanceof GridElements_1.Timestamp) {
                clipboard.push(element);
                element.positionWhenCopy = element.transform.position;
                element.deselect();
            }
        });
        var firstElement = sortedElements[0];
        if (firstElement !== undefined) {
            this.selector.clipboardCopiedFrom = firstElement.transform.position;
        }
        this.selector.copyScale = this.selector.editor.transform.scale;
        this.selector.deselectAll();
        this.selector.clipboardElements = clipboard;
    };
    CopyCommand.prototype.undo = function () {
    };
    return CopyCommand;
}());
exports.CopyCommand = CopyCommand;
var PasteCommand = /** @class */ (function () {
    function PasteCommand(selector, to) {
        this.selector = selector;
        this.to = to;
    }
    PasteCommand.prototype.execute = function () {
        var _this = this;
        if (this.selector.clipboardElements.length < 1)
            return;
        var howMuchToMove = this.to.x - this.selector.clipboardCopiedFrom.x;
        var currentScale = this.selector.editor.transform.scale;
        var scaleFactor = new Vec2_1.Vec2(this.selector.editor.transform.scale.x / this.selector.copyScale.x, this.selector.editor.transform.scale.y / this.selector.copyScale.y);
        console.log("Pasting ".concat(this.selector.clipboardElements.length, " elements to ").concat(howMuchToMove, "!"));
        var i = 0;
        var firstTimestampX = 0;
        this.selector.clipboardElements.forEach(function (element) {
            //element.restore()
            //element.move(new Vec2(element.transform.localPosition.x + howManyCopied, element.transform.localPosition.y))
            //element.transform.position = new Vec2(element.transform.position.x + howManyCopied, element.transform.position.y)
            var afterX = element.positionWhenCopy.x + howMuchToMove;
            if (i == 0) {
                _this.selector.timestamps.createTimestamp(new Vec2_1.Vec2(afterX, element.positionWhenCopy.y));
            }
            else {
                var distanceBetweenX = (afterX - firstTimestampX) * scaleFactor.x;
                _this.selector.timestamps.createTimestamp(new Vec2_1.Vec2(firstTimestampX + distanceBetweenX, element.positionWhenCopy.y));
            }
            if (i == 0) {
                firstTimestampX = element.positionWhenCopy.x + howMuchToMove;
            }
            i++;
        });
    };
    PasteCommand.prototype.undo = function () {
    };
    return PasteCommand;
}());
exports.PasteCommand = PasteCommand;
var CutCommand = /** @class */ (function () {
    function CutCommand() {
    }
    CutCommand.prototype.execute = function () {
        throw new Error("Method not implemented.");
    };
    CutCommand.prototype.undo = function () {
        throw new Error("Method not implemented.");
    };
    return CutCommand;
}());
exports.CutCommand = CutCommand;
var MakeConnectionCommand = /** @class */ (function () {
    function MakeConnectionCommand(firstTimestamp, secondTimestamp) {
        this.firstTimestamp = firstTimestamp;
        this.secondTimestamp = secondTimestamp;
    }
    MakeConnectionCommand.prototype.execute = function () {
        this.firstTimestamp.connectToTimestamp(this.secondTimestamp);
    };
    MakeConnectionCommand.prototype.undo = function () {
        this.firstTimestamp.removeConnection(this.secondTimestamp);
    };
    return MakeConnectionCommand;
}());
exports.MakeConnectionCommand = MakeConnectionCommand;
var RemoveConnectionCommand = /** @class */ (function () {
    function RemoveConnectionCommand(firstTimestamp, secondTimestamp) {
        this.firstTimestamp = firstTimestamp;
        this.secondTimestamp = secondTimestamp;
    }
    RemoveConnectionCommand.prototype.execute = function () {
        this.firstTimestamp.removeConnection(this.secondTimestamp);
    };
    RemoveConnectionCommand.prototype.undo = function () {
        this.firstTimestamp.connectToTimestamp(this.secondTimestamp);
    };
    return RemoveConnectionCommand;
}());
exports.RemoveConnectionCommand = RemoveConnectionCommand;
var SelectElementsCommand = /** @class */ (function () {
    function SelectElementsCommand(elements, selector) {
        this.elements = elements;
        this.selector = selector;
    }
    SelectElementsCommand.prototype.execute = function () {
        var _this = this;
        this.elements.forEach(function (element) {
            _this.selector.selectElement(element);
        });
    };
    SelectElementsCommand.prototype.undo = function () {
        var _this = this;
        this.elements.forEach(function (element) {
            _this.selector.deselectElement(element);
        });
    };
    return SelectElementsCommand;
}());
exports.SelectElementsCommand = SelectElementsCommand;
var DeselectElementsCommand = /** @class */ (function () {
    function DeselectElementsCommand(elements, selector) {
        this.elements = elements;
        this.selector = selector;
    }
    DeselectElementsCommand.prototype.execute = function () {
        var _this = this;
        this.elements.forEach(function (element) {
            _this.selector.deselectElement(element);
        });
    };
    DeselectElementsCommand.prototype.undo = function () {
        var _this = this;
        this.elements.forEach(function (element) {
            _this.selector.selectElement(element);
        });
    };
    return DeselectElementsCommand;
}());
exports.DeselectElementsCommand = DeselectElementsCommand;
var DeselectAllElementsCommand = /** @class */ (function (_super) {
    __extends(DeselectAllElementsCommand, _super);
    function DeselectAllElementsCommand() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    DeselectAllElementsCommand.prototype.execute = function () {
        this.selector.deselectAll();
    };
    return DeselectAllElementsCommand;
}(DeselectElementsCommand));
exports.DeselectAllElementsCommand = DeselectAllElementsCommand;
var DeleteElementsCommand = /** @class */ (function () {
    function DeleteElementsCommand(gridElements, selector) {
        this.gridElements = gridElements;
        this.selector = selector;
    }
    DeleteElementsCommand.prototype.execute = function () {
        this.gridElements.forEach(function (element) {
            element.delete();
        });
        this.selector.deselectAll();
    };
    DeleteElementsCommand.prototype.undo = function () {
        this.gridElements.forEach(function (element) {
            element.restore();
        });
        this.selector.setSelectedElements(this.gridElements);
    };
    return DeleteElementsCommand;
}());
exports.DeleteElementsCommand = DeleteElementsCommand;
var CreateElememtsCommand = /** @class */ (function () {
    function CreateElememtsCommand(gridElements) {
        this.gridElements = gridElements;
    }
    CreateElememtsCommand.prototype.execute = function () {
        this.gridElements.forEach(function (element) {
            element.restore();
        });
    };
    CreateElememtsCommand.prototype.undo = function () {
        this.gridElements.forEach(function (element) {
            element.delete();
        });
    };
    return CreateElememtsCommand;
}());
exports.CreateElememtsCommand = CreateElememtsCommand;
var MoveElementsCommand = /** @class */ (function () {
    function MoveElementsCommand(movedElements, newPositions) {
        this.movedElements = movedElements;
        this.newPositions = newPositions;
        this.lastPositions = new Array();
    }
    MoveElementsCommand.prototype.execute = function () {
        var _this = this;
        this.movedElements.forEach(function (element) {
            _this.lastPositions.push(element.transform.position);
        });
        for (var i = 0; i < this.movedElements.length; i++) {
            this.movedElements[i].move(this.newPositions[i]);
        }
    };
    MoveElementsCommand.prototype.undo = function () {
        for (var i = 0; i < this.movedElements.length; i++) {
            this.movedElements[i].move(this.lastPositions[i]);
        }
    };
    return MoveElementsCommand;
}());
exports.MoveElementsCommand = MoveElementsCommand;
CommandsController.init();
