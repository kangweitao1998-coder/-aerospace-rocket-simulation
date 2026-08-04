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
 * @FilePath: \cesium space_earth\lib\HtmlPopupPro.js
 * @Description: 提示弹窗类-工具类
 */

/**
 * html弹窗pro
 *
 * @export
 * @class HtmlPopupPro
 */
const defaultValue = (value, fallback) =>
  value !== undefined && value !== null ? value : fallback;

export default class HtmlPopupPro {
  constructor(options) {
    this._viewer = options.viewer;

    this._popupDiv = null;
    this._isDragging = false;
    this._offsetXY = { x: 0, y: 0 };
    this._distanceXY = defaultValue(options.distanceXY, { x: 100, y: -100 });
    this._avoidInsets = defaultValue(options.avoidInsets, {
      top: 110,
      right: 270,
      bottom: 230,
      left: 370,
    });

    this._popupColor = defaultValue(options.popupColor, "#23aaf2");

    this._parentDom = defaultValue(options.parentDom, document.body);

    this._position = defaultValue(
      options.position,
      new Cesium.Cartesian3()
    );

    this._popupHtml = defaultValue(
      options.popupHtml,
      `<div style="padding: 30px; background: #23aaf2;">HtmlPopupPro</div>`
    );
    this._renderedHtml = null;
    this._onClose = options.onClose;
    this._boundMouseDown = this._mouseDownEvent.bind(this);
    this._boundMouseMove = this._mouseMoveEvent.bind(this);
    this._boundMouseUp = this._mouseUpEvent.bind(this);
    this._boundPopupClick = (event) => {
      if (event.target.closest("[data-popup-close]")) {
        event.preventDefault();
        event.stopPropagation();
        this.close();
        this._onClose?.();
      }
    };

    this._init();
  }

  _init() {
    this._popupDiv = this._createPopupDiv();

    this._popupWrap = this._popupDiv.querySelector("#popup_wrap");
    this._pointWrap = this._popupDiv.querySelector("#point_wrap");
    this._lineWrap = this._popupDiv.querySelector("#line_wrap");
    this._line = this._popupDiv.querySelector("#line_wrap line");
  }

  _createPopupDiv() {
    let popupWrapStyle = `
        background: transparent;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index:99;
        user-select: none;
    `;
    let pointWrapStyle = `
        width: 8px;
        height: 8px;
        background: ${this._popupColor};
        border-radius: 50%;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index:99;
        user-select: none;
    `;
    let lineWrapStyle = `
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0px;
        left: 0px;
        z-index:1;
        user-select: none;
        pointer-events: none;
    `;
    const innerHTML = `
        <div id="popup_wrap" style="${popupWrapStyle}"></div>
        <div id="point_wrap" style="${pointWrapStyle}"></div>
        <svg id="line_wrap" style="${lineWrapStyle}">
            <line stroke="${this._popupColor}" stroke-width="1.5" />
        </svg>
    `;
    const popupDiv = document.createElement("div");
    popupDiv.style.position = "absolute";
    popupDiv.style.inset = "0";
    popupDiv.style.width = "100%";
    popupDiv.style.height = "100%";
    popupDiv.style.zIndex = "99";
    popupDiv.style.pointerEvents = "none";
    popupDiv.innerHTML = innerHTML;
    popupDiv.querySelector("#popup_wrap").style.pointerEvents = "auto";

    return popupDiv;
  }

  _updateLine() {
    // 获取弹窗的的左上点位置
    const popupRect = this._popupWrap.getBoundingClientRect();
    const x2 = popupRect.left - this._parentDom.getBoundingClientRect().left;
    const y2 = popupRect.top - this._parentDom.getBoundingClientRect().top;
    // 获取原点的的中心点位置
    const pointRect = this._pointWrap.getBoundingClientRect();
    const x1 =
      pointRect.left + 4 - this._parentDom.getBoundingClientRect().left;
    const y1 = pointRect.top + 4 - this._parentDom.getBoundingClientRect().top;
    // const x1 = pointRect.left;
    // const y1 = pointRect.top;
    // 设置线段的起始和结束点
    this._line.setAttribute("x1", x1);
    this._line.setAttribute("y1", y1);
    this._line.setAttribute("x2", x2);
    this._line.setAttribute("y2", y2);
    // 计算两点距离
    const distanceXY = { x: x2 - x1, y: y2 - y1 };
    return distanceXY;
  }

  _clampPopupPosition(x, y) {
    const parentWidth = this._parentDom.clientWidth;
    const parentHeight = this._parentDom.clientHeight;
    const popupWidth = this._popupWrap.offsetWidth || 250;
    const popupHeight = this._popupWrap.offsetHeight || 250;
    const padding = 12;
    let minX = this._avoidInsets.left;
    let maxX = parentWidth - this._avoidInsets.right - popupWidth;
    let minY = this._avoidInsets.top;
    let maxY = parentHeight - this._avoidInsets.bottom - popupHeight;
    if (maxX < minX) {
      minX = padding;
      maxX = Math.max(padding, parentWidth - popupWidth - padding);
    }
    if (maxY < minY) {
      minY = padding;
      maxY = Math.max(padding, parentHeight - popupHeight - padding);
    }
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y)),
    };
  }

  _preRenderEvent() {
    try {
      // 更新内部html
      if (this._renderedHtml !== this._popupHtml) {
        this._popupWrap.innerHTML = this._popupHtml;
        this._renderedHtml = this._popupHtml;
      }

      // 更新场景位置
      const pointPosiiton = this._position;
      const camera = this._viewer.camera;
      const scene = this._viewer.scene;
      const cameraPosiiton = camera.positionWC;

      // 实时计算弹窗和相机距离
      // 实时计算弹窗是否遮挡;
      const visible = new Cesium.EllipsoidalOccluder(
        Cesium.Ellipsoid.WGS84,
        cameraPosiiton
      ).isPointVisible(pointPosiiton);

      // 实时计算弹窗的窗口坐标
      const transform = Cesium.SceneTransforms;
      const toWindowCoordinates =
        transform.worldToWindowCoordinates ||
        transform.wgs84ToWindowCoordinates;
      const windowCoordinates = toWindowCoordinates
        ? toWindowCoordinates(scene, pointPosiiton)
        : null;

      // 判断是否更改弹窗位置+ 判断是否隐藏弹窗可见
      if (windowCoordinates && this._popupDiv) {
        this._pointWrap.style.left = `${windowCoordinates.x - 4}px`;
        this._pointWrap.style.top = `${windowCoordinates.y - 4}px`;
        const popupPosition = this._clampPopupPosition(
          windowCoordinates.x + this._distanceXY.x,
          windowCoordinates.y + this._distanceXY.y
        );
        this._popupWrap.style.left = `${popupPosition.x}px`;
        this._popupWrap.style.top = `${popupPosition.y}px`;
        this._updateLine();
        this._popupDiv.style.visibility = visible ? "visible" : "hidden";
      } else {
        this._popupDiv.style.visibility = "hidden";
      }
    } catch (error) {
      throw error;
    }
  }

  _mouseDownEvent(e) {
    if (e.target.closest("[data-popup-close]")) return;
    this._isDragging = true;
    this._offsetXY = { x: e.offsetX, y: e.offsetY };
  }

  _mouseMoveEvent(e) {
    if (this._isDragging) {
      const x = e.clientX - this._offsetXY.x;
      const y = e.clientY - this._offsetXY.y;
      const popupPosition = this._clampPopupPosition(
        x - this._parentDom.getBoundingClientRect().left,
        y - this._parentDom.getBoundingClientRect().top
      );
      this._popupWrap.style.left = `${popupPosition.x}px`;
      this._popupWrap.style.top = `${popupPosition.y}px`;
      this._distanceXY = this._updateLine();
    }
  }

  _mouseUpEvent(e) {
    this._isDragging = false;
    this._offsetXY = { x: 0, y: 0 };
  }

  open() {
    if (!this._parentDom.contains(this._popupDiv)) {
      this._parentDom.appendChild(this._popupDiv);
      // 绑定拖拽事件
      this._popupWrap.addEventListener(
        "mousedown",
        this._boundMouseDown
      );
      this._popupWrap.addEventListener("pointerdown", this._boundPopupClick);
      document.addEventListener("mousemove", this._boundMouseMove);
      document.addEventListener("mouseup", this._boundMouseUp);
      // 绑定渲染事件
      this._viewer.scene.preRender.addEventListener(this._preRenderEvent, this);
    }
  }

  close() {
    if (this._parentDom.contains(this._popupDiv)) {
      this._parentDom.removeChild(this._popupDiv);
      //  解绑拖拽事件
      this._popupWrap.removeEventListener(
        "mousedown",
        this._boundMouseDown
      );
      this._popupWrap.removeEventListener("pointerdown", this._boundPopupClick);
      document.removeEventListener(
        "mousemove",
        this._boundMouseMove
      );
      document.removeEventListener("mouseup", this._boundMouseUp);
      // 解绑渲染事件
      this._viewer.scene.preRender.removeEventListener(
        this._preRenderEvent,
        this
      );
    }
  }

  destroy() {
    this.close();
    this._popupDiv = null;
  }

  set position(position) {
    this._position = position;
  }
  get position() {
    return this._position;
  }

  set popupHtml(popupHtml) {
    this._popupHtml = popupHtml;
  }
  get popupHtml() {
    return this._popupHtml;
  }

  set popupColor(popupColor) {
    this._popupColor = popupColor;
    this._popupDiv.querySelector("#point_wrap").style.background =
      this._popupColor;
    this._popupDiv
      .querySelector("#line_wrap line")
      .setAttribute("stroke", this._popupColor);
  }
  get popupColor() {
    return this._popupColor;
  }
}
