/*
 *                        _oo0oo_
 *                       o8888888o
 *                       88" . "88
 *                       (| -_- |)
 *                       0\  =  /0
 *                     ___/`---'\___
 *                   .' \\|     |// '.
 *                  / \\|||  :  |||// \
 *                 / _||||| -:- |||||- \
 *                |   | \\\  - /// |   |
 *                | \_|  ''\---/''  |_/ |
 *                \  .-\__  '-'  ___/-. /
 *              ___'. .'  /--.--\  `. .'___
 *           ."" '<  `.___\_<|>_/___.' >' "".
 *          | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *          \  \ `_.   \_ __\ /__ _/   .-` /  /
 *      =====`-.____`.___ \_____/___.-`___.-'=====
 *                        `=---='
 *
 *
 *      ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 *           佛曰:
 *                   写字楼里写字间，写字间里程序员；
 *                   程序人员写程序，又拿程序换酒钱。
 *                   酒醒只在网上坐，酒醉还来网下眠；
 *                   酒醉酒醒日复日，网上网下年复年。
 *                   但愿老死电脑间，不愿鞠躬老板前；
 *                   奔驰宝马贵者趣，公交自行程序员。
 *                   别人笑我忒疯癫，我笑自己命太贱；
 *                   不见满街漂亮妹，哪个归得程序员？
 */

/*
 * @Author: giser_康伟涛 kangweitao1998@163.com
 * @Date: 2024-11-26 10:25:32
 * @LastEditors: giser_康伟涛 kangweitao1998@163.com
 * @LastEditTime: 2024-12-02 10:21:05
 * @FilePath: \cesium space_earth\lib\SensorPyramidPrimitive.js
 * @Description: 棱锥载荷Primitive drawCommand版本
 */

/**
 *棱锥载荷Primitive
 *
 * @export
 * @class SensorPyramidPrimitive
 */
const defaultValue = (value, fallback) =>
  value === undefined || value === null ? fallback : value;

export default class SensorPyramidPrimitive {
  constructor(options) {
    this._context = null;

    this._drawCommand1 = null;
    this._drawCommand2 = null;

    this._direction = null;

    this._destroyed = false;
    this._offset = 0.0;

    this._onCreateDrawCommand = () => {};

    this.id = defaultValue(options.id, Cesium.createGuid());

    this.name = defaultValue(options.name, "棱锥载荷");

    this._show = defaultValue(options.show, true);

    this._outline = defaultValue(options.outline, true);

    this._outlineColor = defaultValue(
      options.outlineColor,
      new Cesium.Color(1.0, 1.0, 1.0, 1.0)
    );

    this._animation = defaultValue(options.animation, false);

    this._animationSpeed = defaultValue(options.animationSpeed, 10.0);

    this._position = defaultValue(
      options.position,
      Cesium.Cartesian3.ZERO
    );

    this._orientation = defaultValue(
      options.orientation,
      Cesium.Quaternion.IDENTITY
    );

    this._scale = defaultValue(options.scale, 1.0);

    this._modelMatrix = defaultValue(
      options.modelMatrix,
      Cesium.Matrix4.ZERO
    );

    this._color = defaultValue(
      options.color,
      new Cesium.Color(1.0, 0.0, 0.0, 1.0)
    );

    this._length = Math.abs(defaultValue(options.length, 1000.0));
    this._xHalfAngle = Math.abs(defaultValue(options.xHalfAngle, 15.0));
    this._yHalfAngle = Math.abs(defaultValue(options.yHalfAngle, 15.0));
    if (this._modelMatrix === Cesium.Matrix4.ZERO) {
      this._computeModelMatrix();
    }
  }

  _computeModelMatrix() {
    if (this._orientation === Cesium.Quaternion.IDENTITY) {
      // 未设置姿态
      this._modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
        this._position
      );
    } else {
      // 已设置姿态
      // this._modelMatrix = Cesium.Matrix4.multiply(
      //   Cesium.Transforms.eastNorthUpToFixedFrame(this._position),
      //   Cesium.Matrix4.fromTranslationQuaternionRotationScale(
      //     new Cesium.Cartesian3(0, 0, 0),
      //     this._orientation,
      //     new Cesium.Cartesian3(this._scale, this._scale, this._scale),
      //     new Cesium.Matrix4()
      //   ),
      //   new Cesium.Matrix4()
      // );
      this._modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
        this._position,
        this._orientation,
        new Cesium.Cartesian3(this._scale, this._scale, this._scale),
        new Cesium.Matrix4()
      );
    }
  }

  _generateGeometry() {
    //  定义顶点坐标数组
    const positions = new Float64Array(5 * 3);
    const x = this._length * Math.tan(Cesium.Math.toRadians(this._xHalfAngle));
    const y = this._length * Math.tan(Cesium.Math.toRadians(this._yHalfAngle));
    // position 0
    positions[0] = x;
    positions[1] = y;
    positions[2] = -this._length;

    // position 1
    positions[3] = -x;
    positions[4] = y;
    positions[5] = -this._length;

    // position 2
    positions[6] = -x;
    positions[7] = -y;
    positions[8] = -this._length;

    // position 3
    positions[9] = x;
    positions[10] = -y;
    positions[11] = -this._length;

    // position （顶部）
    positions[12] = 0.0;
    positions[13] = 0.0;
    positions[14] = 0.0;

    //  定义纹理坐标数组
    const sts = new Float32Array(5 * 2);
    // position 0
    sts[0] = 1.0;
    sts[1] = 1.0;

    // position 1
    sts[2] = 1.0;
    sts[3] = 1.0;

    // position 2
    sts[4] = 1.0;
    sts[5] = 1.0;

    // position 3
    sts[6] = 1.0;
    sts[7] = 1.0;

    // position  （顶部）
    sts[8] = 0.5;
    sts[9] = 0.5;

    //  定义索引数组
    const indices = new Uint16Array(4 * 3);
    // triangle 0
    indices[0] = 4;
    indices[1] = 0;
    indices[2] = 1;

    // triangle 1
    indices[3] = 4;
    indices[4] = 1;
    indices[5] = 2;

    // triangle 2
    indices[6] = 4;
    indices[7] = 2;
    indices[8] = 3;

    // triangle 3
    indices[9] = 4;
    indices[10] = 3;
    indices[11] = 0;

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: positions,
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2, // 每连续的两个值组成一个UV坐标
          values: sts,
        }),
      },
      indices: indices,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: Cesium.BoundingSphere.fromVertices(positions),
    });
    return geometry;
  }

  _generateBoundingVolume() {
    const center = this._position;
    const radius = this._length;
    const boundingVolume = new Cesium.BoundingSphere(center, radius * radius);
    return boundingVolume;
  }

  _generateGeometryPositions() {
    const num = 9;
    const x = this._length * Math.tan(Cesium.Math.toRadians(this._xHalfAngle));
    const y = this._length * Math.tan(Cesium.Math.toRadians(this._yHalfAngle));
    const positions = [];
    for (let i = 0; i <= num; i++) {
      const position = new Cesium.Cartesian3(
        x - (i / num) * (x * 2),
        y,
        -this._length
      );
      positions.push(position);
    }
    for (let i = 0; i <= num; i++) {
      const position = new Cesium.Cartesian3(
        -x,
        y - (i / num) * (y * 2),
        -this._length
      );
      positions.push(position);
    }
    for (let i = 0; i <= num; i++) {
      const position = new Cesium.Cartesian3(
        -x + (i / num) * (x * 2),
        -y,
        -this._length
      );
      positions.push(position);
    }
    for (let i = 0; i <= num; i++) {
      const position = new Cesium.Cartesian3(
        x,
        -y + (i / num) * (y * 2),
        -this._length
      );
      positions.push(position);
    }
    // 底部边坐标
    const borderPositions = positions.map((position) =>
      Cesium.Matrix4.multiplyByPoint(
        this._modelMatrix,
        position,
        new Cesium.Cartesian3()
      )
    );
    // 顶部点坐标
    const topPosition = Cesium.Matrix4.multiplyByPoint(
      this._modelMatrix,
      new Cesium.Cartesian3(0, 0, 0),
      new Cesium.Cartesian3()
    );
    // 底部点坐标
    const bottomPosition = Cesium.Matrix4.multiplyByPoint(
      this._modelMatrix,
      new Cesium.Cartesian3(0, 0, -this._length),
      new Cesium.Cartesian3()
    );
    // 方向向量
    const direction = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.subtract(
        bottomPosition,
        topPosition,
        new Cesium.Cartesian3()
      ),
      new Cesium.Cartesian3()
    );
    return { borderPositions, topPosition, bottomPosition, direction };
  }

  _createCommand(context) {
    if (!context) return;
    const geometry = this._generateGeometry();
    const boundingVolume = this._generateBoundingVolume();
    const vertexArray = Cesium.VertexArray.fromGeometry({
      geometry: geometry,
      context: context,
      attributeLocation:
        Cesium.GeometryPipeline.createAttributeLocations(geometry),
    });

    const shaderProgram = Cesium.ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: `
            precision highp float;
            in vec3 position;
            in vec2 st;
            out vec3 v_position;
            out vec2 v_st;
            void main() {
                v_position = position;
                v_st = st;
                gl_Position = czm_projection * czm_modelView * vec4(position, 1.0);
            }
        `,
      fragmentShaderSource: `
        in vec2 v_st;
        uniform bool animation;
        uniform float animationSpeed;
        uniform vec4 color;
        uniform float count;
        void main() {
          vec2 st = v_st;
          vec4 fragColor = color;
          if(!animation){
            out_FragColor=fragColor;
            return;
          };
          float dis = distance(st, vec2(0.5, 0.5));
          float per = fract(czm_frameNumber * animationSpeed / 1000.0);
          if(count == 1.0){
            fragColor.a = color.a  * dis * (1.0 +  10.0 * (1.0 - 0.8));
            out_FragColor=fragColor;
          } else {
            float perDis = 1.0 / count;
            float disNum;
            float bl = 0.0;
            for(int i = 0; i <= 10; i++){
                if(float(i) <= count){
                disNum = perDis * float(i) - dis + per / count;
                if(disNum > 0.0){
                  if(disNum < perDis){
                  bl = 1.0 - disNum / perDis;
                  }
                  else if(disNum - perDis < perDis){
                    bl = 1.0 - abs(1.0 - disNum / perDis);
                  }
                  fragColor.a = pow(bl,(1.0 + 10.0 * (1.0 - 0.8)));
                  out_FragColor=fragColor;
                }
              }
            }
          }
        }
        `,
      attributeLocation:
        Cesium.GeometryPipeline.createAttributeLocations(geometry),
    });

    const uniformMap = {
      // color: () => {
      //   return this._color;
      // },
      animation: () => {
        return this._animation;
      },
      animationSpeed: () => {
        return this._animationSpeed;
      },
      count: () => {
        return 10.0;
      },
    };

    const renderState = Cesium.RenderState.fromCache({
      depthTest: {
        enabled: true, // 开启深度检测
      },
      cull: {
        enabled: false,
      },
    });

    // DrawCommand详情：  https://blog.csdn.net/esoft_weixiuyong/article/details/122338351
    this._drawCommand1 = new Cesium.DrawCommand({
      vertexArray: vertexArray,
      shaderProgram: shaderProgram,
      uniformMap: {
        ...uniformMap,
        color: () => {
          return this._color;
        },
      },
      renderState: renderState,
      boundingVolume: boundingVolume,
      pass: Cesium.Pass.TRANSLUCENT,
      receiveShadows: true,
      castShadows: true,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      modelMatrix: this._modelMatrix,
    });

    this._drawCommand2 = new Cesium.DrawCommand({
      vertexArray: vertexArray,
      shaderProgram: shaderProgram,
      uniformMap: {
        ...uniformMap,
        color: () => {
          return this._outlineColor;
        },
      },
      renderState: renderState,
      boundingVolume: boundingVolume,
      pass: Cesium.Pass.TRANSLUCENT,
      receiveShadows: true,
      castShadows: true,
      primitiveType: Cesium.PrimitiveType.LINES,
      modelMatrix: this._modelMatrix,
    });

    const geometryPositions = this._generateGeometryPositions();
    this._onCreateDrawCommand({ geometryPositions });
  }

  destroy() {
    this._destroyed = true;
    return Cesium.destroyObject(this);
  }

  isDestroyed() {
    return this._destroyed;
  }

  // 显隐
  set show(show) {
    this._show = show;
  }
  get show() {
    return this._show;
  }

  // 边框
  set outline(outline) {
    this._outline = outline;
  }
  get outline() {
    return this._outline;
  }

  // 边框颜色
  set outlineColor(outlineColor) {
    this._outlineColor = outlineColor;
  }
  get outlineColor() {
    return this._outlineColor;
  }

  // 动画
  set animation(animation) {
    this._animation = animation;
    this._createCommand(this._context);
  }
  get animation() {
    return this._animation;
  }

  // 动画速度
  set animationSpeed(animationSpeed) {
    this._animationSpeed = animationSpeed;
    this._createCommand(this._context);
  }
  get animationSpeed() {
    return this._animationSpeed;
  }

  // 位置
  set position(position) {
    this._position = position;
    this._computeModelMatrix();
    this._createCommand(this._context);
  }
  get position() {
    return this._position;
  }

  // 姿态
  set orientation(orientation) {
    this._orientation = orientation;
    this._computeModelMatrix();
    this._createCommand(this._context);
  }
  get orientation() {
    return this._orientation;
  }

  // 缩放
  set scale(scale) {
    this._scale = scale;
    this._computeModelMatrix();
    this._createCommand(this._context);
  }
  get scale() {
    return this._scale;
  }

  // 模型矩阵
  set modelMatrix(modelMatrix) {
    this._modelMatrix = modelMatrix;
    this._createCommand(this._context);
  }
  get modelMatrix() {
    return this._modelMatrix;
  }

  // color
  set color(color) {
    this._color = color;
    this._createCommand(this._context);
  }
  get color() {
    return this._color;
  }

  // length
  set length(length) {
    this._length = Math.abs(length);
    this._createCommand(this._context);
  }
  get length() {
    return this._length;
  }

  // xHalfAngle
  set xHalfAngle(xHalfAngle) {
    this._xHalfAngle = Math.abs(xHalfAngle);
    this._createCommand(this._context);
  }
  get xHalfAngle() {
    return this._xHalfAngle;
  }

  // yHalfAngle
  set yHalfAngle(yHalfAngle) {
    this._yHalfAngle = Math.abs(yHalfAngle);
    this._createCommand(this._context);
  }
  get yHalfAngle() {
    return this._yHalfAngle;
  }

  update(frameState) {
    this._context = frameState.context;
    if (!this._show) return;
    if (!this._drawCommand1 && !this._drawCommand2) {
      this._createCommand(frameState.context);
    }
    frameState.commandList.push(this._drawCommand1);

    if (!this._outline) return;
    frameState.commandList.push(this._drawCommand2);
  }
}
