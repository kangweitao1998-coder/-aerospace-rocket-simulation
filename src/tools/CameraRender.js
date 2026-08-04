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
 * @FilePath: \cesium space_earth\lib\CameraRender.js
 * @Description: 离屏渲染-工具类
 */

/**
 *离屏渲染
 *
 * @export
 * @class CameraRender
 */
const defaultValue = (value, fallback) =>
  value !== undefined && value !== null ? value : fallback;

export default class CameraRender {
  /**
   * Creates an instance of CameraRender.
   * @param {*} options
   * @memberof CameraRender
   */
  constructor(options) {
    this._viewer = options.viewer;

    this._rendering = false;

    this._canvasElement = null;
    this._sourceCamera = null;
    this._framebuffer = null;

    this._volum = null;

    this._iv = null;
    this._lastRenderTime = 0;
    this._renderQueued = false;
    this._renderTimer = null;

    this.id = defaultValue(options.id, crypto.randomUUID());

    this.name = defaultValue(options.name, "离屏渲染");

    this._debug = defaultValue(options.debug, true);

    this._position = defaultValue(
      options.position,
      new Cesium.Cartesian3()
    );

    this._rotation = defaultValue(options.rotation, {
      heading: 0.0,
      pitch: 0.0,
      roll: 0.0,
    });

    this._cameraConfigs = defaultValue(options.cameraConfigs, {
      fov: 5.0,
      near: 1.0,
      far: 40000000.0,
      aspectRatio: 1.0,
    });

    this._cameraFocused = defaultValue(options.cameraFocused, false);
    this._includedPrimitives = new Set(defaultValue(options.includedPrimitives, []));
    this._model = options.model;
    this._includedModelNodes = new Set(defaultValue(options.includedModelNodes, []));

    this._canvasElement = defaultValue(
      options.canvasElement,
      document.createElement("canvas")
    );
    this._renderWidth = this._canvasElement.width || 270;
    this._renderHeight = this._canvasElement.height || 240;

    this._init();
  }

  _init() {
    this._canvasElement = this._canvasElement;

    this._sourceCamera = this._createCamera();
    this._framebuffer = this._createFramebuffer();
  }

  // 渲染事件
  _preRenderEvent() {
    this._updateFramebuffer(
      this._framebuffer,
      this._sourceCamera,
      this._cameraFocused
    );
    this._renderFramebuffer(this._framebuffer, this._canvasElement);
  }

  // 创建相机
  _createCamera() {
    let camera = new Cesium.Camera(this._viewer.scene);
    // 配置相机
    camera.setView({
      destination: this._position,
      orientation: {
        heading: Cesium.Math.toRadians(this._rotation.heading),
        pitch: Cesium.Math.toRadians(this._rotation.pitch),
        range: Cesium.Math.toRadians(this._rotation.range),
      },
    });

    camera.frustum.fov = Cesium.Math.toRadians(this._cameraConfigs.fov);
    camera.frustum.near = this._cameraConfigs.near;
    camera.frustum.far = this._cameraConfigs.far;
    camera.frustum.aspectRatio = this._cameraConfigs.aspectRatio;

    return camera;
  }

  // 更新相机
  _udpateCamera(camera) {
    if (!camera) return;
    //配置相机
    camera.setView({
      destination: this._position,
      orientation: {
        heading: Cesium.Math.toRadians(this._rotation.heading),
        pitch: Cesium.Math.toRadians(this._rotation.pitch),
        roll: Cesium.Math.toRadians(this._rotation.roll),
      },
    });

    camera.frustum.fov = Cesium.Math.toRadians(this._cameraConfigs.fov);
    camera.frustum.near = this._cameraConfigs.near;
    camera.frustum.far = this._cameraConfigs.far;
    camera.frustum.aspectRatio = this._cameraConfigs.aspectRatio;
  }

  // 创建帧缓冲区
  _createFramebuffer() {
    let scene = this._viewer.scene;
    let context = scene.context;
    var width = this._renderWidth;
    var height = this._renderHeight;
    const framebuffer = new Cesium.Framebuffer({
      context: context,
      colorTextures: [
        new Cesium.Texture({
          context: context,
          width: width,
          height: height,
          pixelFormat: Cesium.PixelFormat.RGBA,
        }),
      ],
      depthTexture: new Cesium.Texture({
        context: context,
        width: width,
        height: height,
        pixelFormat: Cesium.PixelFormat.DEPTH_COMPONENT,
        pixelDatatype: Cesium.PixelDatatype.UNSIGNED_SHORT,
      }),
    });
    return framebuffer;
  }

  // 更新帧缓冲区
  _updateFramebuffer(framebuffer, sourceCamera, cameraFocused) {
    if (!framebuffer && !sourceCamera) return;

    const scene = this._viewer.scene;
    const context = scene.context;
    // scene.globe.show = false;
    const frameState = scene._frameState;
    const uniformState = context.uniformState;

    const previousView = scene._view;
    const view = scene._defaultView;
    scene._view = view;

    const camera = scene._defaultView.camera;
    const viewport = view.viewport;
    const savedViewport = Cesium.BoundingRectangle.clone(viewport);
    const passState = view.passState;
    const savedFramebuffer = passState.framebuffer;
    const savedPassViewport = Cesium.BoundingRectangle.clone(passState.viewport);
    const globeVisible = scene.globe?.show;
    const sceneBackgroundColor = Cesium.Color.clone(scene.backgroundColor);
    const environmentObjects = [scene.skyBox, scene.skyAtmosphere, scene.sun, scene.moon];
    const environmentVisibility = environmentObjects.map(object => object?.show);
    const primitiveVisibility = [];
    const modelNodeVisibility = [];
    if (cameraFocused) {
      scene._defaultView.camera = sourceCamera;
    }

    try {
      // A second globe traversal changes the main view's tile LOD and causes flashing.
      if (scene.globe) scene.globe.show = false;
      scene.backgroundColor = Cesium.Color.TRANSPARENT;
      environmentObjects.forEach(object => {
        if (object && "show" in object) object.show = false;
      });
      for (let index = 0; index < scene.primitives.length; index += 1) {
        const primitive = scene.primitives.get(index);
        if (!primitive || !("show" in primitive)) continue;
        primitiveVisibility.push([primitive, primitive.show]);
        if (!this._includedPrimitives.has(primitive)) primitive.show = false;
      }
      if (this._model?.getNode && this._includedModelNodes.size > 0) {
        const nodeNames = ['Stage1', 'Stage2', 'Stage3', 'Booster_F', 'Booster_R', 'Booster_A', 'Booster_L', 'Fairing_L_Parent', 'Fairing_R_Parent', 'Satellite'];
        nodeNames.forEach(name => {
          const node = this._model.getNode(name);
          if (!node || !("show" in node)) return;
          modelNodeVisibility.push([node, node.show]);
          node.show = this._includedModelNodes.has(name);
        });
      }
      scene.updateFrameState();
      frameState.passes.render = true;
      frameState.passes.postProcess = scene.postProcessStages.hasSelected;

      let backgroundColor = defaultValue(scene.backgroundColor, Cesium.Color.BLACK);
      if (scene._hdr) {
        backgroundColor = Cesium.Color.clone(backgroundColor);
        backgroundColor.red = Math.pow(backgroundColor.red, scene.gamma);
        backgroundColor.green = Math.pow(backgroundColor.green, scene.gamma);
        backgroundColor.blue = Math.pow(backgroundColor.blue, scene.gamma);
      }
      frameState.backgroundColor = backgroundColor;
      frameState.atmosphere = scene.atmosphere;
      scene.fog.update(frameState);
      uniformState.update(frameState);

      scene._computeCommandList.length = 0;
      scene._overlayCommandList.length = 0;
      viewport.x = 0;
      viewport.y = 0;
      viewport.width = this._renderWidth;
      viewport.height = this._renderHeight;
      passState.framebuffer = framebuffer;
      passState.blendingEnabled = undefined;
      passState.scissorTest = undefined;
      passState.viewport = Cesium.BoundingRectangle.clone(viewport, passState.viewport);
      scene.updateAndExecuteCommands(passState, backgroundColor);
      scene.resolveFramebuffers(passState);
    } finally {
      if (scene.globe) scene.globe.show = globeVisible;
      scene.backgroundColor = sceneBackgroundColor;
      environmentObjects.forEach((object, index) => {
        if (object && "show" in object) object.show = environmentVisibility[index];
      });
      primitiveVisibility.forEach(([primitive, show]) => {
        primitive.show = show;
      });
      modelNodeVisibility.forEach(([node, show]) => {
        node.show = show;
      });
      scene._defaultView.camera = camera;
      scene._view = previousView;
      Cesium.BoundingRectangle.clone(savedViewport, viewport);
      passState.framebuffer = savedFramebuffer;
      passState.viewport = Cesium.BoundingRectangle.clone(savedPassViewport, passState.viewport);
    }
  }

  // 渲染帧缓冲区
  _renderFramebuffer(framebuffer, canvasElement) {
    let scene = this._viewer.scene;
    let canvas = canvasElement;
    let width = this._renderWidth;
    let height = this._renderHeight;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    let pixels = scene.context.readPixels({
      x: 0,
      y: 0,
      width: width,
      height: height,
      framebuffer: framebuffer,
    });
    let ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let imgData = new ImageData(new Uint8ClampedArray(pixels), width, height);
    ctx.putImageData(imgData, 0, 0, 0, 0, width, height);
    ctx.translate(0, height);
    ctx.scale(1, -1);
    ctx.drawImage(canvas, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  // 添加视锥体
  _addVolum() {
    this._volum = new Cesium.DebugCameraPrimitive({
      camera: this._sourceCamera,
      color: Cesium.Color.GREEN,
      show: this._debug,
    });
    this._viewer.scene.primitives.add(this._volum);
  }

  // 删除视锥体
  _delVolum() {
    if (this._volum) this._viewer.scene.primitives.remove(this._volum);
  }

  open() {
    if (!this._rendering) {
      this._canvasElement
        .getContext("2d")
        .clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
      this._lastRenderTime = 0;
      this._iv = this._viewer.scene.postRender.addEventListener(() => {
        const now = performance.now();
        if (now - this._lastRenderTime < 180 || this._renderQueued) return;
        this._lastRenderTime = now;
        this._renderQueued = true;
        // Run after Cesium has completely closed the main frame.
        this._renderTimer = setTimeout(() => {
          this._renderQueued = false;
          this._renderTimer = null;
          if (this._rendering) this._preRenderEvent();
        }, 0);
      });

      this._addVolum();
      this._rendering = true;
    }
  }

  close() {
    if (this._rendering) {
      this._canvasElement
        .getContext("2d")
        .clearRect(0, 0, this._canvasElement.width, this._canvasElement.height);
      if (this._iv) this._iv();
      this._iv = null;
      if (this._renderTimer) clearTimeout(this._renderTimer);
      this._renderTimer = null;
      this._renderQueued = false;
      this._delVolum();
      this._rendering = false;
    }
  }

  lookAt(target, offset) {
    if (!this._sourceCamera || !target) return;
    this._sourceCamera.lookAt(target, offset);
  }

  setView(destination, direction, up) {
    if (!this._sourceCamera || !destination || !direction || !up) return;
    this._sourceCamera.setView({
      destination,
      orientation: { direction, up },
    });
  }

  destroy() {
    this.close();
    if (this._framebuffer && !this._framebuffer.isDestroyed()) {
      this._framebuffer.destroy();
    }
    this._framebuffer = null;
    this._sourceCamera = null;
  }

  set debug(debug) {
    this._debug = debug;
    if (this._volum && this._debug) {
      // 显示视锥
      this._volum.show = true;
    }
    if (this._volum && !this._debug) {
      // 隐藏视锥体
      this._volum.show = false;
    }
  }
  get debug() {
    return this._debug;
  }

  set cameraFocused(cameraFocused) {
    this._cameraFocused = cameraFocused;
  }
  get cameraFocused() {
    return this._cameraFocused;
  }

  set cameraConfigs(cameraConfigs) {
    this._cameraConfigs = cameraConfigs;
    this._udpateCamera(this._sourceCamera);
  }
  get cameraConfigs() {
    return this._cameraConfigs;
  }

  set position(position) {
    this._position = position;
    this._udpateCamera(this._sourceCamera);
  }
  get position() {
    return this._position;
  }

  set rotation(rotation) {
    this._rotation = rotation;
    this._udpateCamera(this._sourceCamera);
  }
  get rotation() {
    return this._rotation;
  }
}
