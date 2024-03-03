import { vec3, mat4 } from 'gl-matrix';
import Geometry from './Geometry';
import Tablet from '../misc/Tablet';
import Utils from '../misc/Utils';
import TR from '../gui/GuiTR';
import alphaSkin from '../../app/resources/alpha/skin.jpg';
import alphaSquare from '../../app/resources/alpha/square.jpg';
import ImageLoader from '../misc/ImageLoader';

/** Hardcoded alphas embedded in the program */
const HARDCODED_ALPHAS: { [k: string]: any } = {
  alphaSkin: alphaSkin,
  alphaSquare: alphaSquare
}

class Picking {

  _mesh: any; // mesh
  _main: any; // the camera
  _pickedFace = -1; // face picked
  _pickedVertices: Uint32Array; // vertices selected
  _interPoint: vec3 = [0.0, 0.0, 0.0]; // intersection point (mesh local space)
  _rLocal2 = 0.0; // radius of the selection area (local/object space)
  _rWorld2 = 0.0; // radius of the selection area (world space)
  _eyeDir: vec3 = [0.0, 0.0, 0.0]; // eye direction

  _xSym: boolean

  _pickedNormal: vec3 = [0.0, 0.0, 0.0];
  // alpha stuffs
  _alphaOrigin: vec3 = [0.0, 0.0, 0.0];
  _alphaSide = 0.0;
  _alphaLookAt: mat4 = mat4.create();
  _alpha: { [k: string]: any };

  // Scratch vars to reduce allocations
  _tmpNear: vec3 = [0.0, 0.0, 0.0];
  _tmpNear1: vec3 = [0.0, 0.0, 0.0];
  _tmpFar: vec3 = [0.0, 0.0, 0.0];
  _tmpInv: mat4 = mat4.create();
  _tmpInter: vec3 = [0.0, 0.0, 0.0];
  _tmpInter1: vec3 = [0.0, 0.0, 0.0];
  _tmpV1: vec3 = [0.0, 0.0, 0.0];
  _tmpV2: vec3 = [0.0, 0.0, 0.0];
  _tmpV3: vec3 = [0.0, 0.0, 0.0];

  static ALPHAS: { [k: string]: any } = {};
  static ALPHAS_NAMES: { [k: string]: string } = {};

  private static getContext() {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx == null) {
      throw new Error("Canvas2D not supported!");
    }
    return ctx;
  }

  /** Load a single alpha from a url 
   * Returns the name ( possibly translated ) of the new alpha
   */
  static async loadAlpha(name: string, url_or_blob: string | Blob, _ctx: CanvasRenderingContext2D | null): Promise<string> {
    let ctx = _ctx == null ? this.getContext() : _ctx;
    let img = await ImageLoader.loadImage(url_or_blob)
    try {
      ctx.canvas.width = img.width;
      ctx.canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      var u8rgba = ctx.getImageData(0, 0, img.width, img.height).data;
      var u8lum = u8rgba.subarray(0, u8rgba.length / 4);
      for (var i = 0, j = 0, n = u8lum.length; i < n; ++i, j += 4) {
        u8lum[i] = Math.round((u8rgba[j] + u8rgba[j + 1] + u8rgba[j + 2]) / 3);
      }
      return Picking.addAlpha(u8lum, img.width, img.height, TR(name))._name;
    } finally {
      img.close()
    }
  }

  /** Init the hardcoded alphas 
   * Returns a list consisting of the names of the just added alphas
   */
  static async initAlphas() {
    // Add the empty alpha
    let none = TR('alphaNone');
    Picking.ALPHAS[none] = null;
    Picking.ALPHAS_NAMES[none] = none;

    let names: string[] = [none];

    // Add the hardcoded alphas
    let ctx = Picking.getContext();
    for (let alphaName of Object.keys(HARDCODED_ALPHAS)) {
      let name = await this.loadAlpha(alphaName, HARDCODED_ALPHAS[alphaName], ctx);
      names.push(name);
    }
    return names;
  }



  static addAlpha(u8, width, height, name) {
    var newAlpha = <{ [k: string]: any }>{};
    newAlpha._name = name;
    newAlpha._texture = u8;
    newAlpha._ratioX = Math.max(1.0, width / height);
    newAlpha._ratioY = Math.max(1.0, height / width);
    newAlpha._ratioMax = Math.max(newAlpha._ratioX, newAlpha._ratioY);
    newAlpha._width = width;
    newAlpha._height = height;
    var i = 1;
    while (Picking.ALPHAS[newAlpha._name]) {
      newAlpha._name = name + (i++);
    }
    Picking.ALPHAS[newAlpha._name] = newAlpha;
    Picking.ALPHAS_NAMES[newAlpha._name] = newAlpha._name;
    return newAlpha;
  }

  constructor(main, xSym) {
    this._main = main; // the camera
    this._xSym = !!xSym;
  }

  setIdAlpha(id) {
    this._alpha = Picking.ALPHAS[id];
  }

  getAlpha(x, y, z) {
    var alpha = this._alpha;
    if (!alpha || !alpha._texture) return 1.0;

    var m = this._alphaLookAt;
    var rs = this._alphaSide;

    var xn = alpha._ratioY * (m[0] * x + m[4] * y + m[8] * z + m[12]) / (this._xSym ? -rs : rs);
    if (Math.abs(xn) > 1.0) return 0.0;

    var yn = alpha._ratioX * (m[1] * x + m[5] * y + m[9] * z + m[13]) / rs;
    if (Math.abs(yn) > 1.0) return 0.0;

    var aw = alpha._width;
    xn = (0.5 - xn * 0.5) * aw;
    yn = (0.5 - yn * 0.5) * alpha._height;
    return alpha._texture[(xn | 0) + aw * (yn | 0)] / 255.0;
  }

  updateAlpha(keepOrigin = false) {
    var dir = this._tmpV1;
    var nor = this._tmpV2;

    var radius = Math.sqrt(this._rLocal2);
    this._alphaSide = radius * Math.SQRT1_2;

    vec3.sub(dir, this._interPoint, this._alphaOrigin);
    if (vec3.len(dir) === 0) return;
    vec3.normalize(dir, dir);

    var normal = this._pickedNormal;
    vec3.scaleAndAdd(dir, dir, normal, -vec3.dot(dir, normal));
    vec3.normalize(dir, dir);

    if (!keepOrigin)
      vec3.copy(this._alphaOrigin, this._interPoint);

    vec3.scaleAndAdd(nor, this._alphaOrigin, normal, radius);
    mat4.lookAt(this._alphaLookAt, this._alphaOrigin, nor, dir);
  }

  initAlpha() {
    this.computePickedNormal();
    this.updateAlpha();
  }

  getMesh() {
    return this._mesh;
  }

  setLocalRadius2(radius) {
    this._rLocal2 = radius;
  }

  getLocalRadius2() {
    return this._rLocal2;
  }

  getLocalRadius() {
    return Math.sqrt(this._rLocal2);
  }

  getWorldRadius2() {
    return this._rWorld2;
  }

  getWorldRadius() {
    return Math.sqrt(this._rWorld2);
  }

  setIntersectionPoint(inter) {
    this._interPoint = inter;
  }

  getEyeDirection() {
    return this._eyeDir;
  }

  getIntersectionPoint() {
    return this._interPoint;
  }

  getPickedVertices() {
    return this._pickedVertices;
  }

  getPickedFace() {
    return this._pickedFace;
  }

  getPickedNormal() {
    return this._pickedNormal;
  }

  /** Intersection between a ray the mouse position for every meshes */
  intersectionMouseMeshes(meshes = this._main.getMeshes(), mouseX = this._main._mouseX, mouseY = this._main._mouseY) {

    var vNear = this.unproject(mouseX, mouseY, 0.0);
    var vFar = this.unproject(mouseX, mouseY, 0.1);
    var nearDistance = Infinity;
    var nearMesh = null;
    var nearFace = -1;

    for (var i = 0, nbMeshes = meshes.length; i < nbMeshes; ++i) {
      var mesh = meshes[i];
      if (!mesh.isVisible())
        continue;

      mat4.invert(this._tmpInv, mesh.getMatrix());
      vec3.transformMat4(this._tmpNear1, vNear, this._tmpInv);
      vec3.transformMat4(this._tmpFar, vFar, this._tmpInv);
      if (!this.intersectionRayMesh(mesh, this._tmpNear1, this._tmpFar))
        continue;

      var interTest = this.getIntersectionPoint();
      var testDistance = vec3.dist(this._tmpNear1, interTest) * mesh.getScale();
      if (testDistance < nearDistance) {
        nearDistance = testDistance;
        nearMesh = mesh;
        vec3.copy(this._tmpInter1, interTest);
        nearFace = this.getPickedFace();
      }
    }

    this._mesh = nearMesh;
    vec3.copy(this._interPoint, this._tmpInter1);
    this._pickedFace = nearFace;
    if (nearFace !== -1)
      this.updateLocalAndWorldRadius2();
    return !!nearMesh;
  }

  /** Intersection between a ray the mouse position */
  intersectionMouseMesh(mesh = this._main.getMesh(), mouseX = this._main._mouseX, mouseY = this._main._mouseY) {
    var vNear = this.unproject(mouseX, mouseY, 0.0);
    var vFar = this.unproject(mouseX, mouseY, 0.1);
    var matInverse = mat4.create();
    mat4.invert(matInverse, mesh.getMatrix());
    vec3.transformMat4(vNear, vNear, matInverse);
    vec3.transformMat4(vFar, vFar, matInverse);
    return this.intersectionRayMesh(mesh, vNear, vFar);
  }

  /** Intersection between a ray and a mesh */
  intersectionRayMesh(mesh, vNearOrig, vFarOrig) {
    // resest picking
    this._mesh = null;
    this._pickedFace = -1;
    // resest picking
    vec3.copy(this._tmpNear, vNearOrig);
    vec3.copy(this._tmpFar, vFarOrig);
    // apply symmetry
    if (this._xSym) {
      var ptPlane = mesh.getSymmetryOrigin();
      var nPlane = mesh.getSymmetryNormal();
      Geometry.mirrorPoint(this._tmpNear, ptPlane, nPlane);
      Geometry.mirrorPoint(this._tmpFar, ptPlane, nPlane);
    }
    var vAr = mesh.getVertices();
    var fAr = mesh.getFaces();
    // compute eye direction
    var eyeDir = this.getEyeDirection();
    vec3.sub(eyeDir, this._tmpFar, this._tmpNear);
    vec3.normalize(eyeDir, eyeDir);
    var iFacesCandidates = mesh.intersectRay(this._tmpNear, eyeDir);
    var distance = Infinity;
    var nbFacesCandidates = iFacesCandidates.length;
    for (var i = 0; i < nbFacesCandidates; ++i) {
      var indFace = iFacesCandidates[i] * 4;
      var ind1 = fAr[indFace] * 3;
      var ind2 = fAr[indFace + 1] * 3;
      var ind3 = fAr[indFace + 2] * 3;
      this._tmpV1[0] = vAr[ind1];
      this._tmpV1[1] = vAr[ind1 + 1];
      this._tmpV1[2] = vAr[ind1 + 2];
      this._tmpV2[0] = vAr[ind2];
      this._tmpV2[1] = vAr[ind2 + 1];
      this._tmpV2[2] = vAr[ind2 + 2];
      this._tmpV3[0] = vAr[ind3];
      this._tmpV3[1] = vAr[ind3 + 1];
      this._tmpV3[2] = vAr[ind3 + 2];
      var hitDist = Geometry.intersectionRayTriangle(this._tmpNear, eyeDir, this._tmpV1, this._tmpV2, this._tmpV3, this._tmpInter);
      if (hitDist < 0.0) {
        ind2 = fAr[indFace + 3];
        if (ind2 !== Utils.TRI_INDEX) {
          ind2 *= 3;
          this._tmpV2[0] = vAr[ind2];
          this._tmpV2[1] = vAr[ind2 + 1];
          this._tmpV2[2] = vAr[ind2 + 2];
          hitDist = Geometry.intersectionRayTriangle(this._tmpNear, eyeDir, this._tmpV1, this._tmpV3, this._tmpV2, this._tmpInter);
        }
      }
      if (hitDist >= 0.0 && hitDist < distance) {
        distance = hitDist;
        vec3.copy(this._interPoint, this._tmpInter);
        this._pickedFace = iFacesCandidates[i];
      }
    }
    if (this._pickedFace !== -1) {
      this._mesh = mesh;
      this.updateLocalAndWorldRadius2();
      return true;
    }
    this._rLocal2 = 0.0;
    return false;
  }

  /** Find all the vertices inside the sphere */
  pickVerticesInSphere(rLocal2) {
    var mesh = this._mesh;
    var vAr = mesh.getVertices();
    var vertSculptFlags = mesh.getVerticesSculptFlags();
    var inter = this.getIntersectionPoint();

    var iFacesInCells = mesh.intersectSphere(inter, rLocal2, true);
    var iVerts = mesh.getVerticesFromFaces(iFacesInCells);
    var nbVerts = iVerts.length;

    var sculptFlag = ++Utils.SCULPT_FLAG;
    var pickedVertices = new Uint32Array(Utils.getMemory(4 * nbVerts), 0, nbVerts);
    var acc = 0;
    var itx = inter[0];
    var ity = inter[1];
    var itz = inter[2];

    for (var i = 0; i < nbVerts; ++i) {
      var ind = iVerts[i];
      var j = ind * 3;
      var dx = itx - vAr[j];
      var dy = ity - vAr[j + 1];
      var dz = itz - vAr[j + 2];
      if ((dx * dx + dy * dy + dz * dz) < rLocal2) {
        vertSculptFlags[ind] = sculptFlag;
        pickedVertices[acc++] = ind;
      }
    }

    this._pickedVertices = new Uint32Array(pickedVertices.subarray(0, acc));
    return this._pickedVertices;
  }

  _isInsideSphere(id, inter, rLocal2) {
    if (id === Utils.TRI_INDEX) return false;
    var iv = id * 3;
    return vec3.sqrDist(inter, this._mesh.getVertices().subarray(iv, iv + 3)) <= rLocal2;
  }

  /** Find all the vertices inside the sphere (with topological check) */
  pickVerticesInSphereTopological(rLocal2) {
    var mesh = this._mesh;
    var nbVertices = mesh.getNbVertices();
    var vAr = mesh.getVertices();
    var fAr = mesh.getFaces();

    var vrvStartCount = mesh.getVerticesRingVertStartCount();
    var vertRingVert = mesh.getVerticesRingVert();
    var ringVerts = vertRingVert instanceof Array ? vertRingVert : null;

    var vertSculptFlags = mesh.getVerticesSculptFlags();
    var vertTagFlags = mesh.getVerticesTagFlags();

    var sculptFlag = ++Utils.SCULPT_FLAG;
    var tagFlag = ++Utils.TAG_FLAG;

    var inter = this.getIntersectionPoint();
    var itx = inter[0];
    var ity = inter[1];
    var itz = inter[2];

    var pickedVertices = new Uint32Array(Utils.getMemory(4 * nbVertices), 0, nbVertices);
    var idf = this.getPickedFace() * 4;
    var acc = 1;

    if (this._isInsideSphere(fAr[idf], inter, rLocal2)) pickedVertices[0] = fAr[idf];
    else if (this._isInsideSphere(fAr[idf + 1], inter, rLocal2)) pickedVertices[0] = fAr[idf + 1];
    else if (this._isInsideSphere(fAr[idf + 2], inter, rLocal2)) pickedVertices[0] = fAr[idf + 2];
    else if (this._isInsideSphere(fAr[idf + 3], inter, rLocal2)) pickedVertices[0] = fAr[idf + 3];
    else acc = 0;

    if (acc === 1) {
      vertSculptFlags[pickedVertices[0]] = sculptFlag;
      vertTagFlags[pickedVertices[0]] = tagFlag;
    }

    for (var i = 0; i < acc; ++i) {
      var id = pickedVertices[i];
      var start, end;
      if (ringVerts) {
        vertRingVert = ringVerts[id];
        start = 0;
        end = vertRingVert.length;
      } else {
        start = vrvStartCount[id * 2];
        end = start + vrvStartCount[id * 2 + 1];
      }

      for (var j = start; j < end; ++j) {
        var idv = vertRingVert[j];
        if (vertTagFlags[idv] === tagFlag)
          continue;
        vertTagFlags[idv] = tagFlag;

        var id3 = idv * 3;
        var dx = itx - vAr[id3];
        var dy = ity - vAr[id3 + 1];
        var dz = itz - vAr[id3 + 2];
        if ((dx * dx + dy * dy + dz * dz) > rLocal2)
          continue;

        vertSculptFlags[idv] = sculptFlag;
        pickedVertices[acc++] = idv;
      }
    }

    this._pickedVertices = new Uint32Array(pickedVertices.subarray(0, acc));
    return this._pickedVertices;
  }

  computeWorldRadius2(ignorePressure = false) {

    vec3.transformMat4(this._tmpInter, this.getIntersectionPoint(), this._mesh.getMatrix());

    var offsetX = this._main.getSculptManager().getCurrentTool().getScreenRadius();
    if (!ignorePressure) offsetX *= Tablet.getPressureRadius();

    var screenInter = this.project(this._tmpInter);
    return vec3.sqrDist(this._tmpInter, this.unproject(screenInter[0] + offsetX, screenInter[1], screenInter[2]));
  }

  updateLocalAndWorldRadius2() {
    if (!this._mesh) return;
    this._rWorld2 = this.computeWorldRadius2();
    this._rLocal2 = this._rWorld2 / this._mesh.getScale2();
  }

  unproject(x, y, z) {
    return this._main.getCamera().unproject(x, y, z);
  }

  project(vec) {
    return this._main.getCamera().project(vec);
  }

  computePickedNormal() {
    if (!this._mesh || this._pickedFace < 0) return;
    this.polyLerp(this._mesh.getNormals(), this._pickedNormal);
    return vec3.normalize(this._pickedNormal, this._pickedNormal);
  }

  polyLerp(vField, out) {
    var vAr = this._mesh.getVertices();
    var fAr = this._mesh.getFaces();
    var id = this._pickedFace * 4;
    var iv1 = fAr[id] * 3;
    var iv2 = fAr[id + 1] * 3;
    var iv3 = fAr[id + 2] * 3;

    var iv4 = fAr[id + 3];
    var isQuad = iv4 !== Utils.TRI_INDEX;
    if (isQuad) iv4 *= 3;

    var len1 = 1.0 / vec3.dist(this._interPoint, vAr.subarray(iv1, iv1 + 3));
    var len2 = 1.0 / vec3.dist(this._interPoint, vAr.subarray(iv2, iv2 + 3));
    var len3 = 1.0 / vec3.dist(this._interPoint, vAr.subarray(iv3, iv3 + 3));
    var len4 = isQuad ? 1.0 / vec3.dist(this._interPoint, vAr.subarray(iv4, iv4 + 3)) : 0.0;

    var invSum = 1.0 / (len1 + len2 + len3 + len4);
    vec3.set(out, 0.0, 0.0, 0.0);
    vec3.scaleAndAdd(out, out, vField.subarray(iv1, iv1 + 3), len1 * invSum);
    vec3.scaleAndAdd(out, out, vField.subarray(iv2, iv2 + 3), len2 * invSum);
    vec3.scaleAndAdd(out, out, vField.subarray(iv3, iv3 + 3), len3 * invSum);
    if (isQuad) vec3.scaleAndAdd(out, out, vField.subarray(iv4, iv4 + 3), len4 * invSum);
    return out;
  }
}

// TODO Re-implement loading from filesystem later
// var readAlphas = function () {
//   // check nodejs
//   if (!window.module || !window.module.exports) return;
//   var fs = eval('require')('fs');
//   var path = eval('require')('path');

//   var directoryPath = path.join(window.__filename, '../resources/alpha');
//   fs.readdir(directoryPath, function (err, files) {
//     if (err) return;
//     for (var i = 0; i < files.length; ++i) {
//       var fname = files[i];
//       if (fname == 'square.jpg' || fname == 'skin.jpg') continue;
//       Picking.INIT_ALPHAS_NAMES.push(fname);
//       Picking.INIT_ALPHAS_PATHS.push(fname);
//     }
//   });
// };

// readAlphas();



export default Picking;
