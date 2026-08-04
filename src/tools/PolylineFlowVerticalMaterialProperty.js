/*
 * @Description:垂直流动线材质
 * @Version: 1.0
 * @Autor: Kangweitao
 * @Date: 2023-10-25 10:26:58
 * @LastEditors: giser_康伟涛 kangweitao1998@163.com
 * @LastEditTime: 2025-04-16 10:49:09
 */
class PolylineFlowVerticalMaterialProperty {
  // 类构造函数
  constructor(options) {
    this._definitionChanged = new Cesium.Event();
    this._color = new Cesium.Color(1.0, 0.0, 0.0, 1.0);
    this._speed = 1.0;
    this._count = 10.0;
    this._image = "../../images/colors1.png";
    this.color = options && options.color ? options.color : this._color;
    this.speed = options && options.speed ? options.speed : this._speed;
    this.count = options && options.count ? options.count : this._count;
    this.image = options && options.image ? options.image : this._image;
    this.initMaterialProperty();
  }

  // 返回 false。这表示该类属性值不是常量，而是可以随时间变化的。
  get isConstant() {
    return false;
  }
  // 返回 _definitionChanged 事件。表示该事件在材质属性的定义发生改变时被触发
  get definitionChanged() {
    return this._definitionChanged;
  }

  // 获取材质类型
  getType(time) {
    return Cesium.Material.PolylineFlowVerticalMaterialType;
  }

  // 获取uniforms中的属性
  getValue(time, result) {
    if (!Cesium.defined(result)) {
      result = {};
    }
    result = {
      color: this.color,
      speed: this.speed,
      count: this.count,
      image: this.image,
    };
    return result;
  }

  // 用于比较两个 材质类 实例是否相等。
  equals(other) {
    return (
      this === other || other instanceof PolylineFlowVerticalMaterialProperty
    );
  }

  // 初始化材质类
  initMaterialProperty() {
    // 将材质类添加到Cesium中
    Cesium.PolylineFlowVerticalMaterialProperty =
      PolylineFlowVerticalMaterialProperty;
    // 将材质类名添加到Cesium.Material中
    Cesium.Material.PolylineFlowVerticalMaterialProperty =
      "PolylineFlowVerticalMaterialProperty";
    // 将材质类型名添加到Cesium.Material中
    Cesium.Material.PolylineFlowVerticalMaterialType =
      "PolylineFlowVerticalMaterialType";
    // 将材质的 GLSL 着色器代码添加到Cesium.Material中
    Cesium.Material.CustomMaterialSource = `
            uniform vec4 color;
            uniform float speed;
            uniform float count;
            uniform sampler2D image;

            czm_material czm_getMaterial(czm_materialInput materialInput)
            {     
                    // 获取默认的基础材质
                    czm_material material = czm_getDefaultMaterial(materialInput);
                    // 使用czm_frameNumber 得到当前屏幕的刷新率
                    float animation = czm_frameNumber * speed /1000.0; //animation从0到1  
                    // 使用materialInput.st 得到材质的uv坐标
                    vec2 materialUV = materialInput.st * count; 
                    // 从图片纹理中获取材质的uv坐标位置的像素颜色值。
                    vec4 imgColor = texture(image,vec2(fract(materialUV.y - animation) ,materialUV.y));
                    // 设置材质颜色
                    material.diffuse = vec3(imgColor.rgb);
                    // 设置材质颜色
                    material.diffuse = 3.0* color.rgb;
                    //设置材质透明度
                    material.alpha = imgColor.a;
                    return material;
              }`;
    // 将自定义材质添加到Cesium材质缓存中
    Cesium.Material._materialCache.addMaterial(
      Cesium.Material.PolylineFlowVerticalMaterialType,
      {
        // 材质属性
        fabric: {
          type: Cesium.Material.PolylineFlowVerticalMaterialType,
          uniforms: {
            color: this.color,
            speed: this.speed,
            image: this.image,
            count: this.count,
          },
          source: Cesium.Material.CustomMaterialSource,
        },
        // 材质透明效果
        translucent: function (material) {
          return true;
        },
      }
    );
  }
}

export default PolylineFlowVerticalMaterialProperty;
