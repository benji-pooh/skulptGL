import Enums from '../../misc/Enums';
import Brush from './Brush';
import Inflate from './Inflate';
import Twist from './Twist';
import Smooth from './Smooth';
import Flatten from './Flatten';
import Pinch from './Pinch';
import Crease from './Crease';
import Drag from './Drag';
import Paint from './Paint';
import Move from './Move';
import Masking from './Masking';
import LocalScale from './LocalScale';
import Transform from './Transform';
import SculptBase from './SculptBase';

let Tools: Array<typeof SculptBase> = [];

Tools[Enums.Tools.BRUSH] = Brush;
Tools[Enums.Tools.INFLATE] = Inflate;
Tools[Enums.Tools.TWIST] = Twist;
Tools[Enums.Tools.SMOOTH] = Smooth;
Tools[Enums.Tools.FLATTEN] = Flatten;
Tools[Enums.Tools.PINCH] = Pinch;
Tools[Enums.Tools.CREASE] = Crease;
Tools[Enums.Tools.DRAG] = Drag;
Tools[Enums.Tools.PAINT] = Paint;
Tools[Enums.Tools.MOVE] = Move;
Tools[Enums.Tools.MASKING] = Masking;
Tools[Enums.Tools.LOCALSCALE] = LocalScale;
Tools[Enums.Tools.TRANSFORM] = Transform;

Tools[Enums.Tools.BRUSH].uiName = 'sculptBrush';
Tools[Enums.Tools.INFLATE].uiName = 'sculptInflate';
Tools[Enums.Tools.TWIST].uiName = 'sculptTwist';
Tools[Enums.Tools.SMOOTH].uiName = 'sculptSmooth';
Tools[Enums.Tools.FLATTEN].uiName = 'sculptFlatten';
Tools[Enums.Tools.PINCH].uiName = 'sculptPinch';
Tools[Enums.Tools.CREASE].uiName = 'sculptCrease';
Tools[Enums.Tools.DRAG].uiName = 'sculptDrag';
Tools[Enums.Tools.PAINT].uiName = 'sculptPaint';
Tools[Enums.Tools.MOVE].uiName = 'sculptMove';
Tools[Enums.Tools.MASKING].uiName = 'sculptMasking';
Tools[Enums.Tools.LOCALSCALE].uiName = 'sculptLocalScale';
Tools[Enums.Tools.TRANSFORM].uiName = 'sculptTransform';

export default Tools;
