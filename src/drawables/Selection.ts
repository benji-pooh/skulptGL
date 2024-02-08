import { mat3, mat4, vec3 } from 'gl-matrix';
import Buffer from '../render/Buffer';
import ShaderLib from '../render/ShaderLib';
import Enums from '../misc/Enums';



/** Handles rendering the selection tool */
class Selection {

  #gl;

  #circleBuffer;
  #dotBuffer;

  #cacheDotMVP = mat4.create();
  #cacheDotSymMVP = mat4.create();
  #cacheCircleMVP = mat4.create();
  #color = new Float32Array([0.8, 0.0, 0.0]);

  // TODO: These are scratch variables and the names should be fixed up
  #tmp_matpv = mat4.create();
  #tmp_mat = mat4.create();
  #tmp_mat3 = mat3.create();
  #tmp_vec = new Float32Array([0.0, 0.0, 0.0]);
  #tmp_axis = new Float32Array([0.0, 0.0, 0.0]);
  #base = new Float32Array([0.0, 0.0, 1.0]);

  #dot_radius = 50.0;

  /** horizontal offset (when editing the radius) */
  #offsetX = 0.0;
  #isEditMode = false;

  constructor(gl) {
    this.#gl = gl;

    this.#circleBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
    this.#dotBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.STATIC_DRAW);

    this.init();
  }

  getGL() {
    return this.#gl;
  }

  getCircleBuffer() {
    return this.#circleBuffer;
  }

  getDotBuffer() {
    return this.#dotBuffer;
  }

  getCircleMVP() {
    return this.#cacheCircleMVP;
  }

  getDotMVP() {
    return this.#cacheDotMVP;
  }

  getDotSymmetryMVP() {
    return this.#cacheDotSymMVP;
  }

  getColor() {
    return this.#color;
  }

  setIsEditMode(bool) {
    this.#isEditMode = bool;
  }

  getIsEditMode() {
    return this.#isEditMode;
  }

  setOffsetX(offset) {
    this.#offsetX = offset;
  }

  getOffsetX() {
    return this.#offsetX;
  }

  init() {
    this.getCircleBuffer().update(this.#getCircleVertices(1.0));
    this.getDotBuffer().update(this.#getDotVertices(0.05, 10));
  }

  release() {
    this.getCircleBuffer().release();
    this.getDotBuffer().release();
  }

  #getCircleVertices(radius = 1.0, nbVertices = 50, full = false) {
    var arc = Math.PI * 2;

    var start = full ? 1 : 0;
    var end = full ? nbVertices + 2 : nbVertices;
    var vertices = new Float32Array(end * 3);
    for (var i = start; i < end; ++i) {
      var j = i * 3;
      var segment = (arc * i) / nbVertices;
      vertices[j] = Math.cos(segment) * radius;
      vertices[j + 1] = Math.sin(segment) * radius;
    }
    return vertices;
  }

  #getDotVertices(r, nb) {
    return this.#getCircleVertices(r, nb, true);
  }

  #updateMatricesBackground(camera, main) {

    var screenRadius = main.getSculptManager().getCurrentTool().getScreenRadius();

    var w = camera._width * 0.5;
    var h = camera._height * 0.5;
    // no need to recompute the ortho proj each time though
    mat4.ortho(this.#tmp_matpv, -w, w, -h, h, -10.0, 10.0);

    mat4.identity(this.#tmp_mat);
    mat4.translate(
      this.#tmp_mat,
      this.#tmp_mat,
      vec3.set(this.#tmp_vec, -w + main._mouseX + this.#offsetX, h - main._mouseY, 0.0)
    );
    // circle mvp
    mat4.scale(
      this.#cacheCircleMVP,
      this.#tmp_mat,
      vec3.set(this.#tmp_vec, screenRadius, screenRadius, screenRadius)
    );
    mat4.mul(this.#cacheCircleMVP, this.#tmp_matpv, this.#cacheCircleMVP);
    // dot mvp
    mat4.scale(
      this.#cacheDotMVP,
      this.#tmp_mat,
      vec3.set(this.#tmp_vec, this.#dot_radius, this.#dot_radius, this.#dot_radius)
    );
    mat4.mul(this.#cacheDotMVP, this.#tmp_matpv, this.#cacheDotMVP);
    // symmetry mvp
    mat4.scale(this.#cacheDotSymMVP, this.#cacheDotSymMVP, [0.0, 0.0, 0.0]);
  }

  #updateMatricesMesh(camera, main) {
    var picking = main.getPicking();
    var pickingSym = main.getPickingSymmetry();
    var worldRadius = Math.sqrt(picking.computeWorldRadius2(true));
    var screenRadius = main.getSculptManager().getCurrentTool().getScreenRadius();

    var mesh = picking.getMesh();
    var constRadius = this.#dot_radius * (worldRadius / screenRadius);

    picking.polyLerp(mesh.getNormals(), this.#tmp_axis);
    vec3.transformMat3(
      this.#tmp_axis,
      this.#tmp_axis,
      mat3.normalFromMat4(this.#tmp_mat3, mesh.getMatrix())
    );
    vec3.normalize(this.#tmp_axis, this.#tmp_axis);
    var rad = Math.acos(vec3.dot(this.#base, this.#tmp_axis));
    vec3.cross(this.#tmp_axis, this.#base, this.#tmp_axis);

    mat4.identity(this.#tmp_mat);
    mat4.translate(
      this.#tmp_mat,
      this.#tmp_mat,
      vec3.transformMat4(this.#tmp_vec, picking.getIntersectionPoint(), mesh.getMatrix())
    );
    mat4.rotate(this.#tmp_mat, this.#tmp_mat, rad, this.#tmp_axis);

    mat4.mul(this.#tmp_matpv, camera.getProjection(), camera.getView());

    // circle mvp
    mat4.scale(
      this.#cacheCircleMVP,
      this.#tmp_mat,
      vec3.set(this.#tmp_vec, worldRadius, worldRadius, worldRadius)
    );
    mat4.mul(this.#cacheCircleMVP, this.#tmp_matpv, this.#cacheCircleMVP);
    // dot mvp
    mat4.scale(
      this.#cacheDotMVP,
      this.#tmp_mat,
      vec3.set(this.#tmp_vec, constRadius, constRadius, constRadius)
    );
    mat4.mul(this.#cacheDotMVP, this.#tmp_matpv, this.#cacheDotMVP);
    // symmetry mvp
    vec3.transformMat4(this.#tmp_vec, pickingSym.getIntersectionPoint(), mesh.getMatrix());
    mat4.identity(this.#tmp_mat);
    mat4.translate(this.#tmp_mat, this.#tmp_mat, this.#tmp_vec);
    mat4.rotate(this.#tmp_mat, this.#tmp_mat, rad, this.#tmp_axis);

    mat4.scale(
      this.#tmp_mat,
      this.#tmp_mat,
      vec3.set(this.#tmp_vec, constRadius, constRadius, constRadius)
    );
    mat4.mul(this.#cacheDotSymMVP, this.#tmp_matpv, this.#tmp_mat);
  }

  render(main) {
    // if there's an offset then it means we are editing the tool radius
    var pickedMesh = main.getPicking().getMesh() && !this.#isEditMode;
    if (pickedMesh) this.#updateMatricesMesh(main.getCamera(), main);
    else this.#updateMatricesBackground(main.getCamera(), main);

    var drawCircle = main._action === Enums.Action.NOTHING;
    vec3.set(this.#color, 0.8, drawCircle && pickedMesh ? 0.0 : 0.4, 0.0);
    ShaderLib[Enums.Shader.SELECTION]
      .getOrCreate(this.#gl)
      .draw(this, drawCircle, main.getSculptManager().getSymmetry());

    this.#isEditMode = false;
  }
}

export default Selection;
