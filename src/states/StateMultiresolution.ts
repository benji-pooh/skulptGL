class StateMultiresolution {

  static get SUBDIVISION() { return 0; } // subdivision of the mesh
  static get REVERSION() { return 1; } // reversion of the mesh
  static get SELECTION() { return 2; } // change selection of resolution
  static get DELETE_LOWER() { return 3; } // deletes lower resolution
  static get DELETE_HIGHER() { return 4; } // deletes higher resolution

  _main: any; // main application
  _multimesh: any; // the multires mesh
  _mesh: any; // the sub multimesh
  _type: any; // the type of action

  _deletedMeshes: any[]; // deleted meshes
  _vMappingState: any; // vertex mapping low to high res
  _vArState: Float32Array; // copies of vertices coordinates
  _cArState: Float32Array; // copies of colors
  _mArState: Float32Array; // copies of materials

  constructor(main, multimesh, type, isRedo = false) {
    this._main = main;
    this._multimesh = multimesh;
    this._mesh = multimesh.getCurrentMesh();
    this._type = type;

    switch (type) {
      case StateMultiresolution.DELETE_LOWER:
        this._deletedMeshes = multimesh._meshes.slice(0, multimesh._sel);
        break;
      case StateMultiresolution.DELETE_HIGHER:
        this._deletedMeshes = multimesh._meshes.slice(multimesh._sel + 1);
        if (!isRedo)
          this._vMappingState = this._mesh.getVerticesMapping();
        break;
      case StateMultiresolution.SUBDIVISION:
      case StateMultiresolution.REVERSION:
        if (!isRedo) {
          this._vArState = new Float32Array(this._mesh.getVertices());
          this._cArState = new Float32Array(this._mesh.getColors());
          this._mArState = new Float32Array(this._mesh.getMaterials());
        }
        break;
    }
  }

  isNoop() {
    return false;
  }

  undo() {
    var mul = this._multimesh;
    switch (this._type) {
      case StateMultiresolution.SELECTION:
        mul.selectMesh(this._mesh);
        break;
      case StateMultiresolution.DELETE_LOWER:
        Array.prototype.unshift.apply(mul._meshes, this._deletedMeshes);
        break;
      case StateMultiresolution.DELETE_HIGHER:
        Array.prototype.push.apply(mul._meshes, this._deletedMeshes);
        this._mesh.setVerticesMapping(this._vMappingState);
        break;
      case StateMultiresolution.SUBDIVISION:
      case StateMultiresolution.REVERSION:
        var nbVerts = this._mesh.getNbVertices();
        this._mesh.setVertices(new Float32Array(this._vArState));
        this._mesh.setColors(new Float32Array(this._cArState));
        this._mesh.setMaterials(new Float32Array(this._mArState));
        this._mesh.setNbVertices(nbVerts);
        if (this._type === StateMultiresolution.SUBDIVISION) {
          mul.popMesh();
        } else {
          mul.shiftMesh();
        }
        break;
    }

    mul.setSelection(mul.findIndexFromMesh(this._mesh));
    this._main.setMesh(mul);
  }

  redo() {
    var mul = this._multimesh;
    switch (this._type) {
      case StateMultiresolution.SELECTION:
        mul.selectMesh(this._mesh);
        break;
      case StateMultiresolution.DELETE_LOWER:
        mul.deleteLower();
        break;
      case StateMultiresolution.DELETE_HIGHER:
        mul.deleteHigher();
        break;
      case StateMultiresolution.SUBDIVISION:
        mul.pushMesh(this._mesh);
        break;
      case StateMultiresolution.REVERSION:
        mul.unshiftMesh(this._mesh);
        break;
    }

    mul.setSelection(mul.findIndexFromMesh(this._mesh));
    this._main.setMesh(mul);
  }

  createRedo() {
    return new StateMultiresolution(this._main, this._multimesh, this._type, true);
  }
}

export default StateMultiresolution;
