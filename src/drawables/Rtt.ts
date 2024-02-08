import Buffer from '../render/Buffer';
import Shader from '../render/ShaderLib';
import WebGLCaps from '../render/WebGLCaps';

var singletonBuffer;

/**
 * RenderToTexture target implementation.
 */
class Rtt {

  #gl;
  #texture;
  #depth;
  #framebuffer;
  #shaderType;
  inverseSize; 
  #vertexBuffer; 
  #type;
  #wrapRepeat;
  #filterNearest;

  constructor(gl, shaderName = null, depth = gl.createRenderbuffer(), halfFloat = false) {
    this.#gl = gl; // webgl context

    this.#texture = gl.createTexture();
    this.#depth = depth;
    this.#framebuffer = gl.createFramebuffer();

    this.#shaderType = shaderName;
    this.inverseSize = new Float32Array(2);
    this.#vertexBuffer = null;

    if (halfFloat && WebGLCaps.hasRTTHalfFloat()) this.#type = WebGLCaps.HALF_FLOAT_OES;
    else if (halfFloat && WebGLCaps.hasRTTFloat()) this.#type = gl.FLOAT;
    else this.#type = gl.UNSIGNED_BYTE;

    this.setWrapRepeat(false);
    this.setFilterNearest(false);
    this.init();
  }

  getGL() {
    return this.#gl;
  }

  getVertexBuffer() {
    return this.#vertexBuffer;
  }

  getFramebuffer() {
    return this.#framebuffer;
  }

  getTexture() {
    return this.#texture;
  }

  getDepth() {
    return this.#depth;
  }

  getInverseSize() {
    return this.inverseSize;
  }

  init() {
    var gl = this.#gl;

    if (!singletonBuffer) {
      singletonBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
      singletonBuffer.update(new Float32Array([-1.0, -1.0, 4.0, -1.0, -1.0, 4.0]));
    }

    this.#vertexBuffer = singletonBuffer;
  }

  setWrapRepeat(bool) {
    this.#wrapRepeat = bool;
  }

  setFilterNearest(bool) {
    this.#filterNearest = bool;
  }

  onResize(width, height) {
    var gl = this.#gl;

    this.inverseSize[0] = 1.0 / width;
    this.inverseSize[1] = 1.0 / height;

    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, this.#type, null);

    var filter = this.#filterNearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);

    var wrap = this.#wrapRepeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);

    if (this.#depth) {
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.#depth);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, width, height);
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.#framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.#texture, 0);
    gl.framebufferRenderbuffer(
      gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.#depth
    );

    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  release() {
    if (this.#texture) this.#gl.deleteTexture(this.#texture);
    this.getVertexBuffer().release();
  }

  render(main) {
    Shader[this.#shaderType].getOrCreate(this.#gl).draw(this, main);
  }
}

export default Rtt;
