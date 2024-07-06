import Mesh from '../Mesh';
import TransformData from '../TransformData';
import MeshData from '../MeshData';
import RenderData from '../RenderData';

class MeshStatic extends Mesh {

  constructor(gl = null) {
    super();

    this._id = Mesh.ID++; // useful id to retrieve a mesh (dynamic mesh, multires mesh, voxel mesh)

    if (gl) this._renderData = new RenderData(gl);
    this._meshData = MeshData();
    this._transformData = TransformData();
  }
}

export default MeshStatic;
