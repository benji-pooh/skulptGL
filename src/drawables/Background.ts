import Buffer from '../render/Buffer';
import Shader from '../render/ShaderLib';
import Enums from '../misc/Enums';

/**
 * Handles drawing a background for a 3D scene
 */
class Background {

  /** WebGL Context */
  #gl;
  /** Owning scene */
  #main;
  /** VertexBuffer */
  #vertexBuffer;
  /** Texture coordinates buffer */
  #texCoordBuffer;
  /** Should canvas be filled by background @type {boolean} */
  #fill;
  /** One pixel texture used as background if no other is supplied */
  #monoTex;
  /** Background texture ( if one is provided ) */
  #texture;
  /** Height of the texture */
  #texWidth;
  /** Width of the texture */
  #texHeight;
  /** Texture type,  0: fixed grey, 1 env spec, 2 env ambient */
  #type;
  /** Should the texture be blurred @type {boolean} */
  #blur;

  constructor(gl, main) {
    this.#gl = gl;
    this.#main = main;
    this.#vertexBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
    this.#texCoordBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
    this.#fill = true;
    this.#monoTex = null;
    this.#texture = null;
    this.#texWidth = 1;
    this.#texHeight = 1;
    this.#type = 0;
    this.#blur = 0.0;
    this.init();
  }

  init() {
    this.#texCoordBuffer.update(new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0]));
    this.#monoTex = this.createOnePixelTexture(50, 50, 50, 255);
    let element = document
      .getElementById('backgroundopen');
    if (element !== null) {
      element.addEventListener('change', this.loadBackground.bind(this), false);
    } else {
      console.error('Could not find DOM element with id of "background"')
    }
  }

  loadBackground(event) {
    if (event.target.files.length === 0)
      return;

    var file = event.target.files[0];
    if (!file.type.match('image.*'))
      return;

    var self = this;
    var reader = new FileReader();
    reader.onload = function (evt) {
      var bg = new Image();
      if (evt.target !== null && typeof evt.target.result === "string") {
        bg.src = evt.target.result;
      } else {
        console.error("Could not load image");
      }
      bg.onload = function () {

        var canvas = self.#main.getCanvas();
        self.loadBackgroundTexture(bg);
        self.onResize(canvas.width, canvas.height);
        self.main.render();
      };
    };

    let element = <HTMLInputElement>document.getElementById('backgroundopen')
    if (element !== null) {
      element.value = '';
    }
    reader.readAsDataURL(file);
  }

  get gl() {
    return this.#gl;
  }

  get main() {
    return this.#main;
  }

  get blur() {
    return this.#blur;
  }

  get vertexBuffer() {
    return this.#vertexBuffer;
  }

  get texCoordBuffer() {
    return this.#texCoordBuffer;
  }

  release() {
    this.deleteTexture();
    this.#vertexBuffer().release();
    this.#texCoordBuffer().release();
  }

  get type() {
    return this.#type;
  }

  set type(val) {
    this.#type = val;
  }

  onResize(width, height) {
    var ratio = (width / height) / (this.#texWidth / this.#texHeight);
    var comp = this.#fill || this.#type !== 0 ? 1.0 / ratio : ratio;
    var x = comp < 1.0 ? 1.0 : 1.0 / ratio;
    var y = comp < 1.0 ? ratio : 1.0;
    this.#vertexBuffer.update(new Float32Array([-x, -y, x, -y, -x, y, x, y]));
  }

  getTexture() {
    return this.#texture ? this.#texture : this.#monoTex;
  }

  createOnePixelTexture(r, g, b, a) {
    var gl = this.#gl;
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([r, g, b, a])
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }

  loadBackgroundTexture(tex) {
    var gl = this.#gl;
    this.deleteTexture();

    this.#texWidth = tex.width;
    this.#texHeight = tex.height;
    this.#texture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this.#texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  deleteTexture() {
    if (this.#texture) {
      this.#texWidth = this.#texHeight = 1;
      this.#gl.deleteTexture(this.#texture);
      this.#texture = null;
    }
  }

  render() {
    Shader[Enums.Shader.BACKGROUND].getOrCreate(this.#gl).draw(this);
  }
}

export default Background;
