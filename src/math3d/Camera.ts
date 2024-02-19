import { vec2, vec3, mat3, mat4, quat, ReadonlyVec3 } from 'gl-matrix';
import getOptionsURL from '../misc/getOptionsURL';
import Enums from '../misc/Enums';
import Utils from '../misc/Utils';
import Geometry from './Geometry';

function easeOutQuart(r) {
  r = Math.min(1.0, r) - 1.0;
  return -(r * r * r * r - 1.0);
};

// Constants
const DELAY_SNAP = 200;
const DELAY_ROTATE = -1;
const DELAY_TRANSLATE = -1;
const DELAY_MOVE_TO = 200;
const UP: vec3 = [0.0, 1.0, 0.0];
const _sq = Math.SQRT1_2;
const _d = 0.5;
const _QUAT_COMP = [
  quat.fromValues(1, 0, 0, 0),
  quat.fromValues(0, 1, 0, 0),
  quat.fromValues(0, 0, 1, 0),
  quat.fromValues(0, 0, 0, 1),
  quat.fromValues(_sq, _sq, 0, 0),
  quat.fromValues(_sq, -_sq, 0, 0),
  quat.fromValues(_sq, 0, _sq, 0),
  quat.fromValues(_sq, 0, -_sq, 0),
  quat.fromValues(_sq, 0, 0, _sq),
  quat.fromValues(_sq, 0, 0, -_sq),
  quat.fromValues(0, _sq, _sq, 0),
  quat.fromValues(0, _sq, -_sq, 0),
  quat.fromValues(0, _sq, 0, _sq),
  quat.fromValues(0, _sq, 0, -_sq),
  quat.fromValues(0, 0, _sq, _sq),
  quat.fromValues(0, 0, _sq, -_sq),
  quat.fromValues(_d, _d, _d, _d),
  quat.fromValues(_d, _d, _d, -_d),
  quat.fromValues(_d, _d, -_d, _d),
  quat.fromValues(_d, _d, -_d, -_d),
  quat.fromValues(_d, -_d, _d, _d),
  quat.fromValues(_d, -_d, _d, -_d),
  quat.fromValues(_d, -_d, -_d, _d),
  quat.fromValues(-_d, _d, _d, _d),
];

class Camera {

  #main;

  #mode; // SPHERICAL / PLANE
  #projectionType; // ORTHOGRAPHIC

  #quatRot: quat = [0.0, 0.0, 0.0, 1.0]; // quaternion rotation
  #view = mat4.create(); // view matrix
  #proj = mat4.create(); // projection matrix
  #viewport = mat4.create(); // viewport matrix

  #lastNormalizedMouseXY: vec2 = [0.0, 0.0]; // last mouse position ( 0..1 )
  #width = 0.0; // viewport width
  #height = 0.0; // viewport height

  #speed = 0.0; // solve scale issue
  #fov; // vertical field of view

  // translation stuffs
  #trans: vec3 = [0.0, 0.0, 30.0];
  #moveX = 0; // free look (strafe), possible values : -1, 0, 1
  #moveZ = 0; // free look (strafe), possible values : -1, 0, 1

  // pivot stuffs
  #usePivot: boolean; // if rotation is centered around the picked point
  #center: vec3 = [0.0, 0.0, 0.0]; // center of rotation
  #offset: vec3 = [0.0, 0.0, 0.0];

  // orbit camera
  #rotX = 0.0; // x rot for orbit camera
  #rotY = 0.0; // y rot for orbit camera

  // near far
  #near = 0.05;
  #far = 5000.0;

  #timers = {}; // animation timers

  #lastBBox: any = null;

  // Scratch values
  #tmp_vec2: vec2 = [0.0, 0.0];
  #tmp_vec3: vec3 = [0.0, 0.0, 0.0];
  #tmp_vec3_2: vec3 = [0.0, 0.0, 0.0];
  #tmp_quat: quat = [0.0, 0.0, 0.0, 1.0];
  #tmp_mat: mat4 = mat4.create();

  constructor(main) {
    this.#main = main;

    // Handle options
    var opts = getOptionsURL();
    this.#mode = opts.cameramode || Enums.CameraMode.ORBIT; // SPHERICAL / PLANE
    this.#projectionType = opts.projection || Enums.Projection.PERSPECTIVE; // ORTHOGRAPHIC
    this.#fov = Math.min(opts.fov, 150); // vertical field of view
    this.#usePivot = opts.pivot; // if rotation is centered around the picked point

    this.resetView();
  }

  setProjectionType(type) {
    this.#projectionType = type;
    this.updateProjection();
    this.updateView();
  }

  setMode(mode) {
    this.#mode = mode;
    if (mode === Enums.CameraMode.ORBIT)
      this.resetViewFront();
  }

  setFov(fov) {
    this.#fov = fov;
    this.updateView();
    this.optimizeNearFar();
  }

  setUsePivot(bool) {
    this.#usePivot = bool;
  }

  toggleUsePivot() {
    this.#usePivot = !this.#usePivot;
  }

  getView() {
    return this.#view;
  }

  getProjection() {
    return this.#proj;
  }

  getProjectionType() {
    return this.#projectionType;
  }

  isOrthographic() {
    return this.#projectionType === Enums.Projection.ORTHOGRAPHIC;
  }

  getMode() {
    return this.#mode;
  }

  getFov() {
    return this.#fov;
  }

  getUsePivot() {
    return this.#usePivot;
  }

  getConstantScreen() {
    var cwidth = this.#main.getCanvas().clientWidth;
    if (this.#projectionType === Enums.Projection.ORTHOGRAPHIC)
      return cwidth / this.getOrthoZoom();
    return cwidth * this.#proj[0];
  }

  start(mouseX, mouseY) {
    this.#lastNormalizedMouseXY = Geometry.normalizedMouse(mouseX, mouseY, this.#width, this.#height);
    if (!this.#usePivot)
      return;
    var main = this.#main;
    var picking = main.getPicking();
    picking.intersectionMouseMeshes(main.getMeshes(), mouseX, mouseY);
    if (picking.getMesh()) {
      vec3.transformMat4(this.#tmp_vec3, picking.getIntersectionPoint(), picking.getMesh().getMatrix());
      this.setPivot(this.#tmp_vec3);
    }
  }

  setPivot(pivot) {
    vec3.transformQuat(this.#offset, this.#offset, quat.invert(this.#tmp_quat, this.#quatRot));
    vec3.sub(this.#offset, this.#offset, this.#center);

    // set new pivot
    vec3.copy(this.#center, pivot);
    vec3.add(this.#offset, this.#offset, this.#center);
    vec3.transformQuat(this.#offset, this.#offset, this.#quatRot);

    // adjust zoom
    if (this.#projectionType === Enums.Projection.PERSPECTIVE) {
      var oldZoom = this.getTransZ();
      this.#trans[2] = vec3.dist(this.computePosition(), this.#center) * this.#fov / 45;
      this.#offset[2] += this.getTransZ() - oldZoom;
    } else {
      this.#offset[2] = 0.0;
    }
  }

  /** Compute rotation values (by updating the quaternion) */
  rotate(mouseX, mouseY) {
    var axisRot = this.#tmp_vec3;
    var diff = this.#tmp_vec2;

    var normalizedMouseXY = Geometry.normalizedMouse(mouseX, mouseY, this.#width, this.#height);
    if (this.#mode === Enums.CameraMode.ORBIT) {
      vec2.sub(diff, normalizedMouseXY, this.#lastNormalizedMouseXY);
      this.setOrbit(this.#rotX - diff[1] * 2, this.#rotY + diff[0] * 2);

      this.rotateDelay([-diff[1] * 6, diff[0] * 6], DELAY_ROTATE);

    } else if (this.#mode === Enums.CameraMode.PLANE) {
      var length = vec2.dist(this.#lastNormalizedMouseXY, normalizedMouseXY);
      vec2.sub(diff, normalizedMouseXY, this.#lastNormalizedMouseXY);
      vec3.normalize(axisRot, vec3.set(axisRot, -diff[1], diff[0], 0.0));
      quat.mul(this.#quatRot, quat.setAxisAngle(this.#tmp_quat, axisRot, length * 2.0), this.#quatRot);

      this.rotateDelay([axisRot[0], axisRot[1], axisRot[2], length * 6], DELAY_ROTATE);

    } else if (this.#mode === Enums.CameraMode.SPHERICAL) {
      var mouseOnSphereBefore = Geometry.mouseOnUnitSphere(this.#lastNormalizedMouseXY);
      var mouseOnSphereAfter = Geometry.mouseOnUnitSphere(normalizedMouseXY);
      var angle = Math.acos(Math.min(1.0, vec3.dot(mouseOnSphereBefore, mouseOnSphereAfter)));
      vec3.normalize(axisRot, vec3.cross(axisRot, mouseOnSphereBefore, mouseOnSphereAfter));
      quat.mul(this.#quatRot, quat.setAxisAngle(this.#tmp_quat, axisRot, angle * 2.0), this.#quatRot);

      this.rotateDelay([axisRot[0], axisRot[1], axisRot[2], angle * 6], DELAY_ROTATE);
    }

    this.#lastNormalizedMouseXY = normalizedMouseXY;
    this.updateView();
  }

  setOrbit(rx, ry) {
    var radLimit = Math.PI * 0.49;
    this.#rotX = Math.max(Math.min(rx, radLimit), -radLimit);
    this.#rotY = ry;
    var qrt = this.#quatRot;
    quat.identity(qrt);
    quat.rotateX(qrt, qrt, this.#rotX);
    quat.rotateY(qrt, qrt, this.#rotY);
  }

  getTransZ() {
    return this.#projectionType === Enums.Projection.PERSPECTIVE ? this.#trans[2] * 45 / this.#fov : 1000.0;
  }

  updateView() {
    var center = this.#tmp_vec3;

    var view = this.#view;
    var tx = this.#trans[0];
    var ty = this.#trans[1];

    var off = this.#offset;
    vec3.set(this.#tmp_vec3_2, tx - off[0], ty - off[1], this.getTransZ() - off[2]);
    vec3.set(center, tx - off[0], ty - off[1], -off[2]);
    mat4.lookAt(view, this.#tmp_vec3_2, center, UP);

    mat4.mul(view, view, mat4.fromQuat(this.#tmp_mat, this.#quatRot));
    mat4.translate(view, view, vec3.negate(this.#tmp_vec3, this.#center));
  }

  optimizeNearFar(bb?) {
    if (!bb) bb = this.#lastBBox;
    if (!bb) return;
    this.#lastBBox = bb;

    var eye = this.computePosition(this.#tmp_vec3_2);
    var boxCenter = vec3.set(this.#tmp_vec3, (bb[0] + bb[3]) * 0.5, (bb[1] + bb[4]) * 0.5, (bb[2] + bb[5]) * 0.5);
    var distToBoxCenter = vec3.dist(eye, boxCenter);

    var boxRadius = 0.5 * vec3.dist(bb, vec3.set(this.#tmp_vec3, bb[3], bb[4], bb[5]));
    this.#near = Math.max(0.01, distToBoxCenter - boxRadius);
    this.#far = boxRadius + distToBoxCenter;
    this.updateProjection();
  }

  updateProjection() {
    if (this.#projectionType === Enums.Projection.PERSPECTIVE) {
      mat4.perspective(this.#proj, this.#fov * Math.PI / 180.0, this.#width / this.#height, this.#near, this.#far);
      this.#proj[10] = -1.0;
      this.#proj[14] = -2 * this.#near;
    } else {
      this.updateOrtho();
    }
  }

  updateTranslation() {
    var trans = this.#trans;
    trans[0] += this.#moveX * this.#speed * trans[2] / 50 / 400.0;
    trans[2] = Math.max(0.00001, trans[2] + this.#moveZ * this.#speed / 400.0);
    if (this.#projectionType === Enums.Projection.ORTHOGRAPHIC)
      this.updateOrtho();
    this.updateView();
  }

  translate(dx, dy) {
    var factor = this.#speed * this.#trans[2] / 54;
    var delta: vec3 = [-dx * factor, dy * factor, 0.0];
    this.setTrans(vec3.add(this.#trans, this.#trans, delta));

    vec3.scale(delta, delta, 5);
    this.translateDelay(delta, DELAY_TRANSLATE);
  }

  zoom(df) {
    var delta: vec3 = [0.0, 0.0, 0.0];
    vec3.sub(delta, this.#offset, this.#trans);
    vec3.scale(delta, delta, df * this.#speed / 54);
    if (df < 0.0)
      delta[0] = delta[1] = 0.0;
    this.setTrans(vec3.add(this.#trans, this.#trans, delta));

    vec3.scale(delta, delta, 5);
    this.translateDelay(delta, DELAY_TRANSLATE);
  }

  setAndFocusOnPivot(pivot, zoom) {
    this.setPivot(pivot);
    this.moveToDelay(this.#offset[0], this.#offset[1], this.#offset[2] + zoom);
  }

  moveToDelay(x, y, z) {
    var delta: vec3 = [x, y, z];
    this.translateDelay(vec3.sub(delta, delta, this.#trans), DELAY_MOVE_TO);
  }

  setTrans(trans) {
    vec3.copy(this.#trans, trans);
    if (this.#projectionType === Enums.Projection.ORTHOGRAPHIC)
      this.updateOrtho();
    this.updateView();
  }

  getOrthoZoom() {
    return Math.abs(this.#trans[2]) * 0.00055;
  }

  updateOrtho() {
    var delta = this.getOrthoZoom();
    var w = this.#width * delta;
    var h = this.#height * delta;
    mat4.ortho(this.#proj, -w, w, -h, h, -this.#near, this.#far);
  }

  computePosition(out: vec3 = [0, 0, 0]) {

    var view = this.#view;
    vec3.set(out, -view[12], -view[13], -view[14]);

    mat3.fromMat4(<mat3><unknown>this.#tmp_mat, view);
    mat3.transpose(<mat3><unknown>this.#tmp_mat, <mat3><unknown>this.#tmp_mat);
    return vec3.transformMat3(out, out, <mat3><unknown>this.#tmp_mat);
  }

  resetView() {
    this.#speed = Utils.SCALE * 1.5;
    this.centerDelay([0.0, 0.0, 0.0], DELAY_MOVE_TO);
    this.offsetDelay([0.0, 0.0, 0.0], DELAY_MOVE_TO);
    var delta: vec3 = [0.0, 0.0, 30.0 + this.#speed / 3.0];
    vec3.sub(delta, delta, this.#trans);
    this.translateDelay(delta, DELAY_MOVE_TO);
    this.quatDelay([0.0, 0.0, 0.0, 1.0], DELAY_MOVE_TO);
  }

  resetViewFront() {
    this.quatDelay([0.0, 0.0, 0.0, 1.0], DELAY_SNAP);
  }

  resetViewBack() {
    this.quatDelay([0.0, 1.0, 0.0, 0.0], DELAY_SNAP);
  }

  resetViewTop() {
    this.quatDelay([Math.SQRT1_2, 0.0, 0.0, Math.SQRT1_2], DELAY_SNAP);
  }

  resetViewBottom() {
    this.quatDelay([-Math.SQRT1_2, 0.0, 0.0, Math.SQRT1_2], DELAY_SNAP);
  }

  resetViewLeft() {
    this.quatDelay([0.0, -Math.SQRT1_2, 0.0, Math.SQRT1_2], DELAY_SNAP);
  }

  resetViewRight() {
    this.quatDelay([0.0, Math.SQRT1_2, 0.0, Math.SQRT1_2], DELAY_SNAP);
  }

  toggleViewFront() {
    if (Math.abs(this.#quatRot[3]) > 0.99) this.resetViewBack();
    else this.resetViewFront();
  }

  toggleViewTop() {
    var dot = this.#quatRot[0] * Math.SQRT1_2 + this.#quatRot[3] * Math.SQRT1_2;
    if (dot * dot > 0.99) this.resetViewBottom();
    else this.resetViewTop();
  }

  toggleViewLeft() {
    var dot = -this.#quatRot[1] * Math.SQRT1_2 + this.#quatRot[3] * Math.SQRT1_2;
    if (dot * dot > 0.99) this.resetViewRight();
    else this.resetViewLeft();
  }

  computeWorldToScreenMatrix(mat) {
    mat = mat || mat4.create();
    return mat4.mul(mat, mat4.mul(mat, this.#viewport, this.#proj), this.#view);
  }

  /** Project the mouse coordinate into the world coordinate at a given z */
  unproject(mouseX, mouseY, z) {
    var out: vec3 = [0.0, 0.0, 0.0];
    mat4.invert(this.#tmp_mat, this.computeWorldToScreenMatrix(this.#tmp_mat));
    return vec3.transformMat4(out, vec3.set(out, mouseX, this.#height - mouseY, z), this.#tmp_mat);
  }

  /** Project a vertex onto the screen */
  project(vector) {
    var out: vec3 = [0.0, 0.0, 0.0];
    vec3.transformMat4(out, vector, this.computeWorldToScreenMatrix(this.#tmp_mat));
    out[1] = this.#height - out[1];
    return out;
  }

  onResize(width, height) {
    this.#width = width;
    this.#height = height;

    var vp = this.#viewport;
    mat4.identity(vp);
    mat4.scale(vp, vp, vec3.set(this.#tmp_vec3, 0.5 * width, 0.5 * height, 0.5));
    mat4.translate(vp, vp, vec3.set(this.#tmp_vec3, 1.0, 1.0, 1.0));

    this.updateProjection();
  }

  snapClosestRotation() {
    var qrot = this.#quatRot;
    var min = Infinity;
    var id = 0;
    var nbQComp = _QUAT_COMP.length;
    for (var i = 0; i < nbQComp; ++i) {
      var dot = quat.dot(qrot, _QUAT_COMP[i]);
      dot = 1 - dot * dot;
      if (min < dot)
        continue;
      min = dot;
      id = i;
    }
    this.quatDelay(_QUAT_COMP[id], DELAY_SNAP);
  }

  clearTimerN(n) {
    window.clearInterval(this.#timers[n]);
    this.#timers[n] = 0;
  }

  delay(cb, duration, name) {
    var nTimer = name || 'default';
    if (this.#timers[nTimer])
      this.clearTimerN(nTimer);

    if (duration === 0.0)
      return cb(1.0);
    else if (duration < 0.0)
      return;

    var lastR = 0;
    var tStart = (new Date()).getTime();
    this.#timers[nTimer] = window.setInterval(function () {
      var r = ((new Date()).getTime() - tStart) / duration;
      r = easeOutQuart(r);
      cb(r - lastR, r);
      lastR = r;
      if (r >= 1.0)
        this.clearTimerN(nTimer);
    }.bind(this), 16.6);
  }

  private _translateDelta(delta, dr) {
    var trans = this.#trans;
    vec3.scaleAndAdd(trans, trans, delta, dr);
    this.setTrans(trans);
    this.#main.render();
  }

  translateDelay(delta, duration) {
    var cb = this._translateDelta.bind(this, delta);
    this.delay(cb, duration, 'translate');
  }

  private _rotDelta(delta, dr) {
    if (this.#mode === Enums.CameraMode.ORBIT) {
      var rx = this.#rotX + delta[0] * dr;
      var ry = this.#rotY + delta[1] * dr;
      this.setOrbit(rx, ry);
    } else {
      quat.mul(this.#quatRot, quat.setAxisAngle(this.#tmp_quat, delta, delta[3] * dr), this.#quatRot);
    }
    this.updateView();
    this.#main.render();
  }

  rotateDelay(delta, duration) {
    var cb = this._rotDelta.bind(this, delta);
    this.delay(cb, duration, 'rotate');
  }

  private _quatDelta(qDelta, dr) {
    quat.identity(this.#tmp_quat);
    quat.slerp(this.#tmp_quat, this.#tmp_quat, qDelta, dr);
    var qrt = this.#quatRot;
    quat.mul(this.#quatRot, this.#quatRot, this.#tmp_quat);

    if (this.#mode === Enums.CameraMode.ORBIT) {
      var qx = qrt[0];
      var qy = qrt[1];
      var qz = qrt[2];
      var qw = qrt[3];
      // find back euler values
      this.#rotY = Math.atan2(2 * (qw * qy + qz * qx), 1 - 2 * (qy * qy + qz * qz));
      this.#rotX = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qz * qz + qx * qx));
    }

    this.updateView();
    this.#main.render();
  }

  quatDelay(target, duration) {
    var qDelta: quat = [0.0, 0.0, 0.0, 0.0];
    quat.conjugate(qDelta, this.#quatRot);
    quat.mul(qDelta, qDelta, target);
    quat.normalize(qDelta, qDelta);

    var cb = this._quatDelta.bind(this, qDelta);
    this.delay(cb, duration, 'quat');
  }

  private _centerDelta(delta, dr) {
    vec3.scaleAndAdd(this.#center, this.#center, delta, dr);
    this.updateView();
    this.#main.render();
  }

  centerDelay(target, duration) {
    var delta: vec3 = [0.0, 0.0, 0.0];
    vec3.sub(delta, target, this.#center);
    var cb = this._centerDelta.bind(this, delta);
    this.delay(cb, duration, 'center');
  }

  private _offsetDelta(delta, dr) {
    vec3.scaleAndAdd(this.#offset, this.#offset, delta, dr);
    this.updateView();
    this.#main.render();
  }

  offsetDelay(target, duration) {
    var delta: vec3 = [0.0, 0.0, 0.0];
    vec3.sub(delta, target, this.#offset);
    var cb = this._offsetDelta.bind(this, delta);
    this.delay(cb, duration, 'offset');
  }

  computeFrustumFit() {
    var near = this.#near;
    var x;

    if (this.#projectionType === Enums.Projection.ORTHOGRAPHIC) {
      x = Math.min(this.#width, this.#height) / near * 0.5;
      return Math.sqrt(1.0 + x * x) / x;
    }

    var proj = this.#proj;
    var left = near * (proj[8] - 1.0) / proj[0];
    var right = near * (1.0 + proj[8]) / proj[0];
    var top = near * (1.0 + proj[9]) / proj[5];
    var bottom = near * (proj[9] - 1.0) / proj[5];
    var vertical2 = Math.abs(right - left);
    var horizontal2 = Math.abs(top - bottom);

    x = Math.min(horizontal2, vertical2) / near * 0.5;
    return (this.#fov / 45.0) * Math.sqrt(1.0 + x * x) / x;
  }
}

export default Camera;
