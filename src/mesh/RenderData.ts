import getOptionsURL from '../misc/getOptionsURL';
import Buffer from '../render/Buffer';
import ShaderMatcap from '../render/shaders/ShaderMatcap';

class RenderData {

  static ONLY_DRAW_ARRAYS = false;

  _gl: any;

  _shaderType: any;
  _flatShading: any
  _showWireframe: any;
  // matcap id
  _matcap: number;
  _curvature: number;
  _texture0: null | any = null;

  _useDrawArrays = false;
  _vertexBuffer: Buffer;
  _normalBuffer: Buffer;
  _colorBuffer: Buffer;
  _materialBuffer: Buffer;
  _texCoordBuffer: Buffer;
  _indexBuffer: Buffer;
  _wireframeBuffer: Buffer;

  // these material values overrides the vertex attributes
  // it's here for debug or preview
  _albedo = new Float32Array([-1.0, -1.0, -1.0]);
  _roughness = -0.18;
  _metallic = -0.78;
  _alpha = 1.0;

  _flatColor = new Float32Array([1.0, 0.0, 0.0]);
  _mode = WebGLRenderingContext.TRIANGLES

  constructor(gl: any) {
    var opts = getOptionsURL();
    this._gl = gl;

    this._shaderType = opts.shader;
    this._flatShading = opts.flatshading;
    this._showWireframe = opts.wireframe;
    this._matcap = Math.min(opts.matcap, ShaderMatcap.matcaps.length - 1), // matcap id
      this._curvature = Math.min(opts.curvature, 5.0);

    this._useDrawArrays = false;
    this._vertexBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    this._normalBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    this._colorBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    this._materialBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
    this._texCoordBuffer = new Buffer(gl, gl.ARRAY_BUFFER, gl.STATIC_DRAW);
    this._indexBuffer = new Buffer(gl, gl.ELEMENT_ARRAY_BUFFER, gl.STATIC_DRAW);
    this._wireframeBuffer = new Buffer(gl, gl.ELEMENT_ARRAY_BUFFER, gl.STATIC_DRAW);


  };
};

RenderData

export default RenderData;
