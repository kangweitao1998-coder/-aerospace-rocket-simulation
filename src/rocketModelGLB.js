/**
 * 火箭模型工具模块
 * 提供朝向计算等辅助函数供 LaunchView 使用
 */

const Cesium = window.Cesium

/**
 * 创建火箭朝向属性 — Z 轴对齐速度方向
 */
export function createRocketOrientationProperty(posProp) {
  return new Cesium.CallbackProperty((time) => {
    const pos = posProp.getValue(time)
    if (!pos) return undefined

    const dt = 1.0
    const tNext = Cesium.JulianDate.addSeconds(time, dt, new Cesium.JulianDate())
    const posNext = posProp.getValue(tNext)

    let dir
    if (posNext) {
      const vel = Cesium.Cartesian3.subtract(posNext, pos, new Cesium.Cartesian3())
      const velLen = Cesium.Cartesian3.magnitude(vel)
      if (velLen > 0.1) {
        dir = Cesium.Cartesian3.normalize(vel, new Cesium.Cartesian3())
      }
    }
    if (!dir) {
      // 静止时使用局部 ENU 的上方向（垂直地面）
      const upVec = new Cesium.Cartesian3();
      Cesium.Matrix4.getColumn(Cesium.Transforms.eastNorthUpToFixedFrame(pos), 2, upVec);
      dir = Cesium.Cartesian3.normalize(upVec, new Cesium.Cartesian3());
    }

    let ref = new Cesium.Cartesian3(0, 0, 1)
    if (Math.abs(Cesium.Cartesian3.dot(dir, ref)) > 0.99) {
      ref = new Cesium.Cartesian3(1, 0, 0)
    }

    const xCol = Cesium.Cartesian3.normalize(
      Cesium.Cartesian3.cross(ref, dir, new Cesium.Cartesian3()),
      new Cesium.Cartesian3()
    )
    const yCol = Cesium.Cartesian3.cross(dir, xCol, new Cesium.Cartesian3())

    const rotMat = new Cesium.Matrix3(
      xCol.x, yCol.x, dir.x,
      xCol.y, yCol.y, dir.y,
      xCol.z, yCol.z, dir.z
    )
    return Cesium.Quaternion.fromRotationMatrix(rotMat, new Cesium.Quaternion())
  }, false)
}
