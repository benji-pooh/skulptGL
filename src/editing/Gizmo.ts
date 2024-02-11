import { vec2, vec3, mat4, quat } from 'gl-matrix';
import Primitives from '../drawables/Primitives';
import Enums from '../misc/Enums';

// configs colors
const COLOR_X = vec3.fromValues(0.7, 0.2, 0.2);
const COLOR_Y = vec3.fromValues(0.2, 0.7, 0.2);
const COLOR_Z = vec3.fromValues(0.2, 0.2, 0.7);
const COLOR_GREY = vec3.fromValues(0.4, 0.4, 0.4);
const COLOR_SW = vec3.fromValues(0.8, 0.4, 0.2);

// overall scale of the gizmo
const GIZMO_SIZE = 80.0;
// arrow
const ARROW_LENGTH = 2.5;
const ARROW_CONE_THICK = 6.0;
const ARROW_CONE_LENGTH = 0.25;
// thickness of tori and arrows
const THICKNESS = 0.02;
const THICKNESS_PICK = THICKNESS * 5.0;
// radius of tori
const ROT_RADIUS = 1.5;
const SCALE_RADIUS = ROT_RADIUS * 1.3;
// size of cubes
const CUBE_SIDE = 0.35;
const CUBE_SIDE_PICK = CUBE_SIDE * 1.2;

const _TMP_QUAT = quat.create();

class GizmoBehavior {

  _finalMatrix = mat4.create();
  _baseMatrix = mat4.create();
  _color = vec3.create();
  _colorSelect = vec3.fromValues(1.0, 1.0, 0.0);
  _drawGeo: any = null;
  _pickGeo: any = null;
  _isSelected = false;
  _type
  _nbAxis;
  _lastInter: vec3 = [0.0, 0.0, 0.0];

  constructor(type, nbAxis = -1) {
    this._type = type;
    this._nbAxis = nbAxis;
  }

  updateMatrix() {
    if (this._drawGeo !== null) {
      mat4.copy(this._drawGeo.getMatrix(), this._finalMatrix);
    }
    if (this._pickGeo !== null) {
      mat4.copy(this._pickGeo.getMatrix(), this._finalMatrix);
    }
  }

  updateFinalMatrix(mat) {
    mat4.mul(this._finalMatrix, mat, this._baseMatrix);
  }
}

// edit masks
const TRANS_X = 1 << 0;
const TRANS_Y = 1 << 1;
const TRANS_Z = 1 << 2;
const ROT_X = 1 << 3;
const ROT_Y = 1 << 4;
const ROT_Z = 1 << 5;
const ROT_W = 1 << 6;
const PLANE_X = 1 << 7;
const PLANE_Y = 1 << 8;
const PLANE_Z = 1 << 9;
const SCALE_X = 1 << 10;
const SCALE_Y = 1 << 11;
const SCALE_Z = 1 << 12;
const SCALE_W = 1 << 13;

const TRANS_XYZ = TRANS_X | TRANS_Y | TRANS_Z;
const ROT_XYZ = ROT_X | ROT_Y | ROT_Z;
const PLANE_XYZ = PLANE_X | PLANE_Y | PLANE_Z;
const SCALE_XYZW = SCALE_X | SCALE_Y | SCALE_Z | SCALE_W;

class Gizmo {
  static get TRANS_X() {
    return TRANS_X;
  }
  static get TRANS_Y() {
    return TRANS_Y;
  }
  static get TRANS_Z() {
    return TRANS_Z;
  }
  static get ROT_X() {
    return ROT_X;
  }
  static get ROT_Y() {
    return ROT_Y;
  }
  static get ROT_Z() {
    return ROT_Z;
  }
  static get ROT_W() {
    return ROT_W;
  }
  static get PLANE_X() {
    return PLANE_X;
  }
  static get PLANE_Y() {
    return PLANE_Y;
  }
  static get PLANE_Z() {
    return PLANE_Z;
  }
  static get SCALE_X() {
    return SCALE_X;
  }
  static get SCALE_Y() {
    return SCALE_Y;
  }
  static get SCALE_Z() {
    return SCALE_Z;
  }
  static get SCALE_W() {
    return SCALE_W;
  }

  static get TRANS_XYZ() {
    return TRANS_XYZ;
  }
  static get ROT_XYZ() {
    return ROT_XYZ;
  }
  static get PLANE_XYZ() {
    return PLANE_XYZ;
  }
  static get SCALE_XYZW() {
    return SCALE_XYZW;
  }

  #main;
  #gl;
  #lineHelper;

  // activated gizmos
  #activatedType =
    Gizmo.TRANS_XYZ | Gizmo.ROT_XYZ | Gizmo.PLANE_XYZ | Gizmo.SCALE_XYZW | Gizmo.ROT_W;

  // trans arrow 1 dim
  #transX = new GizmoBehavior(Gizmo.TRANS_X, 0);
  #transY = new GizmoBehavior(Gizmo.TRANS_Y, 1);
  #transZ = new GizmoBehavior(Gizmo.TRANS_Z, 2);

  // trans plane 2 dim
  #planeX = new GizmoBehavior(Gizmo.PLANE_X, 0);
  #planeY = new GizmoBehavior(Gizmo.PLANE_Y, 1);
  #planeZ = new GizmoBehavior(Gizmo.PLANE_Z, 2);

  // scale cube 1 dim
  #scaleX = new GizmoBehavior(Gizmo.SCALE_X, 0);
  #scaleY = new GizmoBehavior(Gizmo.SCALE_Y, 1);
  #scaleZ = new GizmoBehavior(Gizmo.SCALE_Z, 2);
  // scale cube 3 dim
  #scaleW = new GizmoBehavior(Gizmo.SCALE_W);

  // rot arc 1 dim
  #rotX = new GizmoBehavior(Gizmo.ROT_X, 0);
  #rotY = new GizmoBehavior(Gizmo.ROT_Y, 1);
  #rotZ = new GizmoBehavior(Gizmo.ROT_Z, 2);
  // full arc display
  #rotW = new GizmoBehavior(Gizmo.ROT_W);



  #lastDistToEye = 0.0;
  #isEditing = false;

  #selected: GizmoBehavior | null = null;
  #pickables = [];

  // editing lines stuffs
  #editLineOrigin: vec3 = [0.0, 0.0, 0.0];
  #editLineDirection: vec3 = [0.0, 0.0, 0.0];
  #editOffset: vec3 = [0.0, 0.0, 0.0];

  // cached matrices when starting the editing operations
  #editLocal: mat4[] = [];
  #editTrans = mat4.create();
  #editScaleRot: mat4[] = [];
  // same for inv
  #editLocalInv: mat4[] = [];
  #editTransInv = mat4.create();
  #editScaleRotInv: mat4[] = [];

  constructor(main) {
    this.#main = main;
    this.#gl = main._gl;

    // line helper
    this.#lineHelper = Primitives.createLine2D(this.#gl);
    this.#lineHelper.setShaderType(Enums.Shader.FLAT);

    this.#initTranslate();
    this.#initRotate();
    this.#initScale();
    this.#initPickables();
  }

  setActivatedType(type) {
    this.#activatedType = type;
    this.#initPickables();
  }

  #initPickables() {
    var pickables: any[] = this.#pickables;
    pickables.length = 0;
    var type = this.#activatedType;

    if (type & TRANS_X) pickables.push(this.#transX._pickGeo);
    if (type & TRANS_Y) pickables.push(this.#transY._pickGeo);
    if (type & TRANS_Z) pickables.push(this.#transZ._pickGeo);

    if (type & PLANE_X) pickables.push(this.#planeX._pickGeo);
    if (type & PLANE_Y) pickables.push(this.#planeY._pickGeo);
    if (type & PLANE_Z) pickables.push(this.#planeZ._pickGeo);

    if (type & ROT_X) pickables.push(this.#rotX._pickGeo);
    if (type & ROT_Y) pickables.push(this.#rotY._pickGeo);
    if (type & ROT_Z) pickables.push(this.#rotZ._pickGeo);

    if (type & SCALE_X) pickables.push(this.#scaleX._pickGeo);
    if (type & SCALE_Y) pickables.push(this.#scaleY._pickGeo);
    if (type & SCALE_Z) pickables.push(this.#scaleZ._pickGeo);
    if (type & SCALE_W) pickables.push(this.#scaleW._pickGeo);
  }

  #createArrow(tra, axis, color) {
    var mat = tra._baseMatrix;
    mat4.rotate(mat, mat, Math.PI * 0.5, axis);
    mat4.translate(mat, mat, [0.0, ARROW_LENGTH * 0.5, 0.0]);
    vec3.copy(tra._color, color);

    tra._pickGeo = Primitives.createArrow(
      this.#gl,
      THICKNESS_PICK,
      ARROW_LENGTH,
      ARROW_CONE_THICK * 0.4
    );
    tra._pickGeo._gizmo = tra;
    tra._drawGeo = Primitives.createArrow(
      this.#gl,
      THICKNESS,
      ARROW_LENGTH,
      ARROW_CONE_THICK,
      ARROW_CONE_LENGTH
    );
    tra._drawGeo.setShaderType(Enums.Shader.FLAT);
  }

  #createPlane(pla, color, wx, wy, wz, hx, hy, hz) {
    vec3.copy(pla._color, color);

    pla._pickGeo = Primitives.createPlane(this.#gl, 0.0, 0.0, 0.0, wx, wy, wz, hx, hy, hz);
    pla._pickGeo._gizmo = pla;
    pla._drawGeo = Primitives.createPlane(this.#gl, 0.0, 0.0, 0.0, wx, wy, wz, hx, hy, hz);
    pla._drawGeo.setShaderType(Enums.Shader.FLAT);
  }

  #initTranslate() {
    var axis: vec3 = [0.0, 0.0, 0.0];
    this.#createArrow(this.#transX, vec3.set(axis, 0.0, 0.0, -1.0), COLOR_X);
    this.#createArrow(this.#transY, vec3.set(axis, 0.0, 1.0, 0.0), COLOR_Y);
    this.#createArrow(this.#transZ, vec3.set(axis, 1.0, 0.0, 0.0), COLOR_Z);

    var s = ARROW_LENGTH * 0.2;
    this.#createPlane(this.#planeX, COLOR_X, 0.0, s, 0.0, 0.0, 0.0, s);
    this.#createPlane(this.#planeY, COLOR_Y, s, 0.0, 0.0, 0.0, 0.0, s);
    this.#createPlane(this.#planeZ, COLOR_Z, s, 0.0, 0.0, 0.0, s, 0.0);
  }

  #createCircle(rot, rad, color, radius = ROT_RADIUS, mthick = 1.0) {
    vec3.copy(rot._color, color);
    rot._pickGeo = Primitives.createTorus(
      this.#gl,
      radius,
      THICKNESS_PICK * mthick,
      rad,
      6,
      64
    );
    rot._pickGeo._gizmo = rot;
    rot._drawGeo = Primitives.createTorus(this.#gl, radius, THICKNESS * mthick, rad, 6, 64);
    rot._drawGeo.setShaderType(Enums.Shader.FLAT);
  }

  #initRotate() {
    this.#createCircle(this.#rotX, Math.PI, COLOR_X);
    this.#createCircle(this.#rotY, Math.PI, COLOR_Y);
    this.#createCircle(this.#rotZ, Math.PI, COLOR_Z);
    this.#createCircle(this.#rotW, Math.PI * 2, COLOR_GREY);
  }

  #createCube(sca, axis, color) {
    var mat = sca._baseMatrix;
    mat4.rotate(mat, mat, Math.PI * 0.5, axis);
    mat4.translate(mat, mat, [0.0, ROT_RADIUS, 0.0]);
    vec3.copy(sca._color, color);
    sca._pickGeo = Primitives.createCube(this.#gl, CUBE_SIDE_PICK);
    sca._pickGeo._gizmo = sca;
    sca._drawGeo = Primitives.createCube(this.#gl, CUBE_SIDE);
    sca._drawGeo.setShaderType(Enums.Shader.FLAT);
  }

  #initScale() {
    var axis: vec3 = [0.0, 0.0, 0.0];
    this.#createCube(this.#scaleX, vec3.set(axis, 0.0, 0.0, -1.0), COLOR_X);
    this.#createCube(this.#scaleY, vec3.set(axis, 0.0, 1.0, 0.0), COLOR_Y);
    this.#createCube(this.#scaleZ, vec3.set(axis, 1.0, 0.0, 0.0), COLOR_Z);
    this.#createCircle(this.#scaleW, Math.PI * 2, COLOR_SW, SCALE_RADIUS, 2.0);
  }

  #updateArcRotation(eye) {
    // xyz arc
    _TMP_QUAT[0] = eye[2];
    _TMP_QUAT[1] = 0.0;
    _TMP_QUAT[2] = -eye[0];
    _TMP_QUAT[3] = 1.0 + eye[1];
    quat.normalize(_TMP_QUAT, _TMP_QUAT);
    mat4.fromQuat(this.#rotW._baseMatrix, _TMP_QUAT);
    mat4.fromQuat(this.#scaleW._baseMatrix, _TMP_QUAT);

    // x arc
    quat.rotateZ(_TMP_QUAT, quat.identity(_TMP_QUAT), Math.PI * 0.5);
    quat.rotateY(_TMP_QUAT, _TMP_QUAT, Math.atan2(-eye[1], -eye[2]));
    mat4.fromQuat(this.#rotX._baseMatrix, _TMP_QUAT);

    // y arc
    quat.rotateY(_TMP_QUAT, quat.identity(_TMP_QUAT), Math.atan2(-eye[0], -eye[2]));
    mat4.fromQuat(this.#rotY._baseMatrix, _TMP_QUAT);

    // z arc
    quat.rotateX(_TMP_QUAT, quat.identity(_TMP_QUAT), Math.PI * 0.5);
    quat.rotateY(_TMP_QUAT, _TMP_QUAT, Math.atan2(-eye[0], eye[1]));
    mat4.fromQuat(this.#rotZ._baseMatrix, _TMP_QUAT);
  }

  #computeCenterGizmo(center: vec3 = [0.0, 0.0, 0.0]) {
    var meshes = this.#main.getSelectedMeshes();

    var acc: vec3 = [0.0, 0.0, 0.0];
    var icenter: vec3 = [0.0, 0.0, 0.0];
    for (var i = 0; i < meshes.length; ++i) {
      var mesh = meshes[i];
      vec3.transformMat4(icenter, mesh.getCenter(), mesh.getEditMatrix());
      vec3.transformMat4(icenter, icenter, mesh.getMatrix());
      vec3.add(acc, acc, icenter);
    }
    vec3.scale(center, acc, 1.0 / meshes.length);
    return center;
  }

  #updateMatrices() {
    var camera = this.#main.getCamera();
    var trMesh = this.#computeCenterGizmo();
    var eye = camera.computePosition();

    this.#lastDistToEye = this.#isEditing ? this.#lastDistToEye : vec3.dist(eye, trMesh);
    var scaleFactor = (this.#lastDistToEye * GIZMO_SIZE) / camera.getConstantScreen();

    var traScale = mat4.create();
    mat4.translate(traScale, traScale, trMesh);
    mat4.scale(traScale, traScale, [scaleFactor, scaleFactor, scaleFactor]);

    // manage arc stuffs
    this.#updateArcRotation(vec3.normalize(eye, vec3.sub(eye, trMesh, eye)));

    this.#transX.updateFinalMatrix(traScale);
    this.#transY.updateFinalMatrix(traScale);
    this.#transZ.updateFinalMatrix(traScale);

    this.#planeX.updateFinalMatrix(traScale);
    this.#planeY.updateFinalMatrix(traScale);
    this.#planeZ.updateFinalMatrix(traScale);

    this.#rotX.updateFinalMatrix(traScale);
    this.#rotY.updateFinalMatrix(traScale);
    this.#rotZ.updateFinalMatrix(traScale);
    this.#rotW.updateFinalMatrix(traScale);

    this.#scaleX.updateFinalMatrix(traScale);
    this.#scaleY.updateFinalMatrix(traScale);
    this.#scaleZ.updateFinalMatrix(traScale);
    this.#scaleW.updateFinalMatrix(traScale);
  }

  #drawGizmo(elt) {
    elt.updateMatrix();
    var drawGeo = elt._drawGeo;
    drawGeo.setFlatColor(elt._isSelected ? elt._colorSelect : elt._color);
    drawGeo.updateMatrices(this.#main.getCamera());
    drawGeo.render(this.#main);
  }

  #updateLineHelper(x1, y1, x2, y2) {
    var vAr = this.#lineHelper.getVertices();
    var main = this.#main;
    var width = main.getCanvasWidth();
    var height = main.getCanvasHeight();
    vAr[0] = (x1 / width) * 2.0 - 1.0;
    vAr[1] = ((height - y1) / height) * 2.0 - 1.0;
    vAr[3] = (x2 / width) * 2.0 - 1.0;
    vAr[4] = ((height - y2) / height) * 2.0 - 1.0;
    this.#lineHelper.updateVertexBuffer();
  }

  #saveEditMatrices() {
    var meshes = this.#main.getSelectedMeshes();

    // translation part
    var center = this.#computeCenterGizmo();
    mat4.translate(this.#editTrans, mat4.identity(this.#editTrans), center);
    mat4.invert(this.#editTransInv, this.#editTrans);

    for (var i = 0; i < meshes.length; ++i) {
      this.#editLocal[i] = mat4.create();
      this.#editScaleRot[i] = mat4.create();
      this.#editLocalInv[i] = mat4.create();
      this.#editScaleRotInv[i] = mat4.create();

      // mesh local matrix
      mat4.copy(this.#editLocal[i], meshes[i].getMatrix());

      // rotation + scale part
      mat4.copy(this.#editScaleRot[i], this.#editLocal[i]);
      this.#editScaleRot[i][12] = this.#editScaleRot[i][13] = this.#editScaleRot[i][14] = 0.0;

      // precomputes the invert
      mat4.invert(this.#editLocalInv[i], this.#editLocal[i]);
      mat4.invert(this.#editScaleRotInv[i], this.#editScaleRot[i]);
    }
  }

  #startRotateEdit() {
    if (this.#selected === null) {
      return;
    }
    var main = this.#main;
    var camera = main.getCamera();

    // 3d origin (center of gizmo)
    var projCenter: vec3 = [0.0, 0.0, 0.0];
    this.#computeCenterGizmo(projCenter);
    vec3.copy(projCenter, camera.project(projCenter));

    // compute tangent direction and project it on screen
    var dir = this.#editLineDirection;
    var sign = this.#selected._nbAxis === 0 ? -1.0 : 1.0;
    var lastInter = this.#selected._lastInter;
    vec3.set(dir, -sign * lastInter[2], -sign * lastInter[1], sign * lastInter[0]);
    vec3.transformMat4(dir, dir, this.#selected._finalMatrix);
    vec3.copy(dir, camera.project(dir));

    vec3.normalize(dir, vec3.sub(dir, dir, projCenter));

    vec3.set(this.#editLineOrigin, main._mouseX, main._mouseY, 0.0);
  }

  #startTranslateEdit() {
    if (this.#selected === null) {
      return;
    }
    var main = this.#main;
    var camera = main.getCamera();

    var origin = this.#editLineOrigin;
    var dir = this.#editLineDirection;

    // 3d origin (center of gizmo)
    this.#computeCenterGizmo(origin);

    // 3d direction
    var nbAxis = this.#selected._nbAxis;
    if (nbAxis !== -1)
      // if -1, we don't care about dir vector
      vec3.set(dir, 0.0, 0.0, 0.0)[nbAxis] = 1.0;
    vec3.add(dir, origin, dir);

    // project on screen and get a 2D line
    vec3.copy(origin, camera.project(origin));
    vec3.copy(dir, camera.project(dir));

    vec3.normalize(dir, vec3.sub(dir, dir, origin));

    var offset = this.#editOffset;
    offset[0] = main._mouseX - origin[0];
    offset[1] = main._mouseY - origin[1];
  }

  #startPlaneEdit() {
    var main = this.#main;
    var camera = main.getCamera();

    var origin = this.#editLineOrigin;

    // 3d origin (center of gizmo)
    this.#computeCenterGizmo(origin);

    vec3.copy(origin, camera.project(origin));

    var offset = this.#editOffset;
    offset[0] = main._mouseX - origin[0];
    offset[1] = main._mouseY - origin[1];
    vec3.set(this.#editLineOrigin, main._mouseX, main._mouseY, 0.0);
  }

  #startScaleEdit() {
    this.#startTranslateEdit();
  }

  #updateRotateEdit() {
    if (this.#selected === null) {
      return;
    }

    var main = this.#main;

    var origin = this.#editLineOrigin;
    var dir = this.#editLineDirection;

    var vec: vec3 = [main._mouseX, main._mouseY, 0.0];
    vec3.sub(vec, vec, origin);
    var dist = vec3.dot(vec, dir);

    // helper line
    this.#updateLineHelper(
      origin[0],
      origin[1],
      origin[0] + dir[0] * dist,
      origin[1] + dir[1] * dist
    );

    var angle = (7 * dist) / Math.min(main.getCanvasWidth(), main.getCanvasHeight());
    angle %= Math.PI * 2;
    var nbAxis = this.#selected._nbAxis;

    var meshes = this.#main.getSelectedMeshes();
    for (var i = 0; i < meshes.length; ++i) {
      var mrot = meshes[i].getEditMatrix();
      mat4.identity(mrot);
      if (nbAxis === 0) mat4.rotateX(mrot, mrot, -angle);
      else if (nbAxis === 1) mat4.rotateY(mrot, mrot, -angle);
      else if (nbAxis === 2) mat4.rotateZ(mrot, mrot, -angle);

      this.#scaleRotateEditMatrix(mrot, i);
    }

    main.render();
  }

  #updateTranslateEdit() {
    if (this.#selected === null) {
      return;
    }
    var main = this.#main;
    var camera = main.getCamera();

    var origin = this.#editLineOrigin;
    var dir = this.#editLineDirection;

    var vec: vec3 = [main._mouseX, main._mouseY, 0.0];
    vec3.sub(vec, vec, origin);
    vec3.sub(vec, vec, this.#editOffset);
    vec3.scaleAndAdd(vec, origin, dir, vec3.dot(vec, dir));

    // helper line
    this.#updateLineHelper(origin[0], origin[1], vec[0], vec[1]);

    var near = camera.unproject(vec[0], vec[1], 0.0);
    var far = camera.unproject(vec[0], vec[1], 0.1);

    vec3.transformMat4(near, near, this.#editTransInv);
    vec3.transformMat4(far, far, this.#editTransInv);

    // intersection line line
    vec3.normalize(vec, vec3.sub(vec, far, near));

    var inter: vec3 = [0.0, 0.0, 0.0];
    inter[this.#selected._nbAxis] = 1.0;

    var a01 = -vec3.dot(vec, inter);
    var b0 = vec3.dot(near, vec);
    var det = Math.abs(1.0 - a01 * a01);

    var b1 = -vec3.dot(near, inter);
    inter[this.#selected._nbAxis] = (a01 * b0 - b1) / det;

    this.#updateMatrixTranslate(inter);

    main.render();
  }

  #updatePlaneEdit() {
    if (this.#selected === null) {
      return;
    }
    var main = this.#main;
    var camera = main.getCamera();

    var vec: vec3 = [main._mouseX, main._mouseY, 0.0];
    vec3.sub(vec, vec, this.#editOffset);

    // helper line
    this.#updateLineHelper(
      this.#editLineOrigin[0],
      this.#editLineOrigin[1],
      main._mouseX,
      main._mouseY
    );

    var near = camera.unproject(vec[0], vec[1], 0.0);
    var far = camera.unproject(vec[0], vec[1], 0.1);

    vec3.transformMat4(near, near, this.#editTransInv);
    vec3.transformMat4(far, far, this.#editTransInv);

    // intersection line plane
    var inter: vec3 = [0.0, 0.0, 0.0];
    inter[this.#selected._nbAxis] = 1.0;

    var dist1 = vec3.dot(near, inter);
    var dist2 = vec3.dot(far, inter);
    // ray copplanar to triangle
    if (dist1 === dist2) return false;

    // intersection between ray and triangle
    var val = -dist1 / (dist2 - dist1);
    inter[0] = near[0] + (far[0] - near[0]) * val;
    inter[1] = near[1] + (far[1] - near[1]) * val;
    inter[2] = near[2] + (far[2] - near[2]) * val;

    this.#updateMatrixTranslate(inter);

    main.render();
  }

  #updateMatrixTranslate(inter) {
    var tmp: vec3 = [0, 0, 0];

    var meshes = this.#main.getSelectedMeshes();
    for (var i = 0; i < meshes.length; ++i) {
      vec3.transformMat4(tmp, inter, this.#editScaleRotInv[i]);

      var edim = meshes[i].getEditMatrix();
      mat4.identity(edim);
      mat4.translate(edim, edim, tmp);
    }
  }

  #updateScaleEdit() {
    if (this.#selected === null) {
      return;
    }
    var main = this.#main;
    var mesh = main.getMesh();

    var origin = this.#editLineOrigin;
    var dir = this.#editLineDirection;
    var nbAxis = this.#selected._nbAxis;

    var vec: vec3 = [main._mouseX, main._mouseY, 0.0];
    if (nbAxis !== -1) {
      vec3.sub(vec, vec, origin);
      vec3.scaleAndAdd(vec, origin, dir, vec3.dot(vec, dir));
    }

    // helper line
    this.#updateLineHelper(origin[0], origin[1], vec[0], vec[1]);

    var distOffset = vec3.len(this.#editOffset);
    var inter: vec3 = [1.0, 1.0, 1.0];
    var scaleMult = Math.max(-0.99, (vec3.dist(origin, vec) - distOffset) / distOffset);
    if (nbAxis === -1) {
      inter[0] += scaleMult;
      inter[1] += scaleMult;
      inter[2] += scaleMult;
    } else {
      inter[nbAxis] += scaleMult;
    }

    var meshes = this.#main.getSelectedMeshes();
    for (var i = 0; i < meshes.length; ++i) {
      var edim = meshes[i].getEditMatrix();
      mat4.identity(edim);
      mat4.scale(edim, edim, inter);

      this.#scaleRotateEditMatrix(edim, i);
    }

    main.render();
  }

  #scaleRotateEditMatrix(edit, i) {
    mat4.mul(edit, this.#editTrans, edit);
    mat4.mul(edit, edit, this.#editTransInv);

    mat4.mul(edit, this.#editLocalInv[i], edit);
    mat4.mul(edit, edit, this.#editLocal[i]);
  }

  addGizmoToScene(scene) {
    scene.push(this.#transX._drawGeo);
    scene.push(this.#transY._drawGeo);
    scene.push(this.#transZ._drawGeo);

    scene.push(this.#planeX._drawGeo);
    scene.push(this.#planeY._drawGeo);
    scene.push(this.#planeZ._drawGeo);

    scene.push(this.#rotX._drawGeo);
    scene.push(this.#rotY._drawGeo);
    scene.push(this.#rotZ._drawGeo);
    scene.push(this.#rotW._drawGeo);

    scene.push(this.#scaleX._drawGeo);
    scene.push(this.#scaleY._drawGeo);
    scene.push(this.#scaleZ._drawGeo);
    scene.push(this.#scaleW._drawGeo);

    return scene;
  }

  render() {
    this.#updateMatrices();

    var type = this.#isEditing && this.#selected ? this.#selected._type : this.#activatedType;

    if (type & ROT_W) this.#drawGizmo(this.#rotW);

    if (type & TRANS_X) this.#drawGizmo(this.#transX);
    if (type & TRANS_Y) this.#drawGizmo(this.#transY);
    if (type & TRANS_Z) this.#drawGizmo(this.#transZ);

    if (type & PLANE_X) this.#drawGizmo(this.#planeX);
    if (type & PLANE_Y) this.#drawGizmo(this.#planeY);
    if (type & PLANE_Z) this.#drawGizmo(this.#planeZ);

    if (type & ROT_X) this.#drawGizmo(this.#rotX);
    if (type & ROT_Y) this.#drawGizmo(this.#rotY);
    if (type & ROT_Z) this.#drawGizmo(this.#rotZ);

    if (type & SCALE_X) this.#drawGizmo(this.#scaleX);
    if (type & SCALE_Y) this.#drawGizmo(this.#scaleY);
    if (type & SCALE_Z) this.#drawGizmo(this.#scaleZ);
    if (type & SCALE_W) this.#drawGizmo(this.#scaleW);

    if (this.#isEditing) this.#lineHelper.render(this.#main);
  }

  onMouseOver() {

    if (this.#isEditing && this.#selected !== null) {
      var type = this.#selected._type;
      if (type & ROT_XYZ) this.#updateRotateEdit();
      else if (type & TRANS_XYZ) this.#updateTranslateEdit();
      else if (type & PLANE_XYZ) this.#updatePlaneEdit();
      else if (type & SCALE_XYZW) this.#updateScaleEdit();

      return true;
    }

    var main = this.#main;
    var picking = main.getPicking();
    var mx = main._mouseX;
    var my = main._mouseY;
    var pickables = this.#pickables;
    picking.intersectionMouseMeshes(pickables, mx, my);

    if (this.#selected) {
      this.#selected._isSelected = false;
    }
    var geo = picking.getMesh();
    if (!geo) {
      this.#selected = null;
      return false;
    }

    this.#selected = geo._gizmo;
    if (this.#selected !== null) {
      this.#selected._isSelected = true;
      vec3.copy(this.#selected._lastInter, picking.getIntersectionPoint());
    }
    return true;
  }

  onMouseDown() {
    var sel = this.#selected;
    if (!sel) return false;

    this.#isEditing = true;
    var type = sel._type;
    this.#saveEditMatrices();

    if (type & ROT_XYZ) this.#startRotateEdit();
    else if (type & TRANS_XYZ) this.#startTranslateEdit();
    else if (type & PLANE_XYZ) this.#startPlaneEdit();
    else if (type & SCALE_XYZW) this.#startScaleEdit();

    return true;
  }

  onMouseUp() {
    this.#isEditing = false;
  }
}

export default Gizmo;
