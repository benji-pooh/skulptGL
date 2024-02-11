import Selection from '../drawables/Selection';
import Tools from './tools/Tools';
import Enums from '../misc/Enums';

class SculptManager {

  #main;
  /** Sculpting mode */
  #toolIndex = Enums.Tools.BRUSH;
  /** The sculpting tools */
  #tools: any[] = [];
  /** Symmetry */
  #symmetry = true;
  /** Continuous sculpting */
  #continuous = false;
  /** Continuous sculpting times */
  #sculptTimer = -1;
  /** Selector geometry ( the red hover circle ) */
  #selection;

  constructor(main) {
    this.#main = main;
    this.#selection = new Selection(main._gl);
    this.init();
  }

  setToolIndex(id) {
    this.#toolIndex = id;
  }

  getToolIndex() {
    return this.#toolIndex;
  }

  getCurrentTool() {
    return this.#tools[this.#toolIndex];
  }

  getSymmetry() {
    return this.#symmetry;
  }

  getTool(index) {
    return this.#tools[index];
  }

  getSelection() {
    return this.#selection;
  }

  init() {
    var main = this.#main;
    var tools = this.#tools;
    for (var i = 0, nb = Tools.length; i < nb; ++i) {
      if (Tools[i]) tools[i] = new Tools[i](main);
    }
  }

  // TODO Should this be refactored onto tools themselves?
  canBeContinuous() {
    switch (this.#toolIndex) {
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
    return this.#continuous && this.canBeContinuous();
  }

  start(ctrl) {
    var tool = this.getCurrentTool();
    var canEdit = tool.start(ctrl);
    if (this.#main.getPicking().getMesh() && this.isUsingContinuous())
      this.#sculptTimer = window.setInterval(tool._cbContinuous, 16.6);
    return canEdit;
  }

  end() {
    this.getCurrentTool().end();
    if (this.#sculptTimer !== -1) {
      clearInterval(this.#sculptTimer);
      this.#sculptTimer = -1;
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
    this.getCurrentTool().postRender(this.#selection);
  }

  addSculptToScene(scene) {
    return this.getCurrentTool().addSculptToScene(scene);
  }
}

export default SculptManager;
