class Attribute {

  _gl: WebGL2RenderingContext;
  _location: GLint;
  _size: number;
  _type: number;

  constructor(gl: WebGL2RenderingContext, program, name, size, type) {
    this._gl = gl; // webgl context
    this._location = gl.getAttribLocation(program, name); // the location
    this._size = size; // numbe of components
    this._type = type; // type of the components
  }

  unbind() {
    this._gl.disableVertexAttribArray(this._location);
  }

  bindToBuffer(buffer) {
    var gl = this._gl;
    buffer.bind();
    gl.enableVertexAttribArray(this._location);
    gl.vertexAttribPointer(this._location, this._size, this._type, false, 0, 0);
  }
}

export default Attribute;
