const Cesium = window.Cesium;
let registered = false;

export default class PolylineFlowHorizontalMaterialProperty {
  constructor(options = {}) {
    this._definitionChanged = new Cesium.Event();
    this.color = options.color || Cesium.Color.BLUE;
    this.speed = options.speed ?? 1;
    this.count = options.count ?? 10;
    this._register();
  }
  get isConstant() { return false; }
  get definitionChanged() { return this._definitionChanged; }
  getType() { return "PolylineFlowHorizontal"; }
  getValue(_time, result = {}) {
    result.color = this.color;
    result.speed = this.speed;
    result.count = this.count;
    return result;
  }
  equals(other) {
    return this === other || (other instanceof PolylineFlowHorizontalMaterialProperty && other.color === this.color);
  }
  _register() {
    const type = "PolylineFlowHorizontal";
    if (registered) return;
    Cesium.Material._materialCache.addMaterial(type, {
      fabric: {
        type,
        uniforms: { color: this.color, speed: this.speed, count: this.count },
        source: `czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          float t = fract(czm_frameNumber * speed / 1000.0);
          float band = step(0.48, fract(materialInput.st.s * count - t));
          material.diffuse = color.rgb;
          material.alpha = color.a * (0.35 + band * 0.65);
          return material;
        }`,
      },
      translucent: () => true,
    });
    registered = true;
  }
}
