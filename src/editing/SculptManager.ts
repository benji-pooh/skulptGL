import Selection from '../drawables/Selection';
import Tools from './tools/Tools';
import Enums from '../misc/Enums';

class SculptManager {

  _main;
  /** Sculpting mode */
  _toolIndex = Enums.Tools.BRUSH;
  /** The sculpting tools */
  _tools: any[] = [];
  /** Symmetry */
  _symmetry = true;
  /** Continuous sculpting */
  _continuous = false;
  /** Continuous sculpting times */
  _sculptTimer = -1;
  /** Selector geometry ( the red hover circle ) */
  _selection;

  constructor(main) {
    this._main = main;
    this._selection = new Selection(main._gl);
    this.init();
  }

  setToolIndex(id) {
    this._toolIndex = id;
  }

  getToolIndex() {
    return this._toolIndex;
  }

  getCurrentTool() {
    return this._tools[this._toolIndex];
  }

  getSymmetry() {
    return this._symmetry;
  }

  getTool(index) {
    return this._tools[index];
  }

  getSelection() {
    return this._selection;
  }

  init() {
    var main = this._main;
    var tools = this._tools;
    for (var i = 0, nb = Tools.length; i < nb; ++i) {
      if (Tools[i]) tools[i] = new Tools[i](main);
    }
  }

  // TODO Should this be refactored onto tools themselves?
  canBeContinuous() {
    switch (this._toolIndex) {
      case Enums.Tools.TWIST:
      case Enums.Tools.MOVE:
      case Enums.Tools.DRAG:
      case Enums.Tools.LOCALSCALE:
      case Enums.Tools.TRANSFORM:
        return false;
      default:
        return true;
    }
  }

  isUsingContinuous() {
    return this._continuous && this.canBeContinuous();
  }

  start(ctrl) {
    var tool = this.getCurrentTool();
    var canEdit = tool.start(ctrl);
    if (this._main.getPicking().getMesh() && this.isUsingContinuous())
      this._sculptTimer = window.setInterval(tool._cbContinuous, 16.6);
    return canEdit;
  }

  end() {
    this.getCurrentTool().end();
    if (this._sculptTimer !== -1) {
      clearInterval(this._sculptTimer);
      this._sculptTimer = -1;
    }
  }

  preUpdate() {
    this.getCurrentTool().preUpdate(this.canBeContinuous());
  }

  update() {
    if (this.isUsingContinuous())
      return;
    this.getCurrentTool().update();
  }

  postRender() {
    this.getCurrentTool().postRender(this._selection);
  }

  addSculptToScene(scene) {
    return this.getCurrentTool().addSculptToScene(scene);
  }
}

export default SculptManager;
