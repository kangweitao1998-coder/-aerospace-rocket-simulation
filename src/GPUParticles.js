/**
 * GPU 粒子系统
 * 基于 Cesium DrawCommand + 自定义 GLSL Shader
 * 粒子位置/大小/颜色全部在 GPU 顶点着色器中基于时间计算
 * CPU 每帧仅更新 uTime uniform，可渲染数千粒子
 */

const Cesium = window.Cesium

const defaultValue = (value, fallback) => (value !== undefined ? value : fallback)

export default class GPUParticlePrimitive {
  constructor(options) {
    this._destroyed = false
    this._context = null
    this._command = null

    this._show = defaultValue(options.show, true)
    this._time = 0.0
    this._globalOpacity = defaultValue(options.globalOpacity, 1.0)
    this._modelMatrix = defaultValue(options.modelMatrix, Cesium.Matrix4.clone(Cesium.Matrix4.IDENTITY))

    // 发射器配置
    this._particleCount = defaultValue(options.particleCount, 500)
    this._emitterPos = defaultValue(options.emitterPosition, [0, 0, 0])
    this._emitterRadius = defaultValue(options.emitterRadius, 2.0)
    this._direction = defaultValue(options.direction, [0, 0, -1])
    this._speed = defaultValue(options.speed, 50.0)
    this._speedVar = defaultValue(options.speedVariance, 20.0)
    this._spreadAngle = defaultValue(options.spreadAngle, 10.0) // 度

    // 生命周期 & 尺寸
    this._minLife = defaultValue(options.minLife, 0.3)
    this._maxLife = defaultValue(options.maxLife, 1.0)
    this._minSize = defaultValue(options.minSize, 5.0)
    this._maxSize = defaultValue(options.maxSize, 15.0)
    this._sizeGrowth = defaultValue(options.sizeGrowth, 1.0)

    // 颜色 & 物理
    this._startColor = defaultValue(options.startColor, [1.0, 0.9, 0.3])
    this._mid1Color  = defaultValue(options.mid1Color, [1.0, 0.5, 0.1])
    this._mid2Color  = defaultValue(options.mid2Color, [0.8, 0.2, 0.0])
    this._endColor   = defaultValue(options.endColor, [1.0, 0.1, 0.0])
    this._gravity = defaultValue(options.gravity, [0, 0, 0])
    this._drag = defaultValue(options.drag, 0.0)
    this._turbulence = defaultValue(options.turbulence, 0.3)
    this._additive = defaultValue(options.additive, true)
    this._smokeMode = defaultValue(options.smokeMode, false)
    const maxTravel = (this._speed + Math.abs(this._speedVar)) * this._maxLife
    const maxGravityTravel = Math.abs(this._gravity[2]) * this._maxLife * this._maxLife * 0.5
    this._localBoundingSphere = new Cesium.BoundingSphere(
      new Cesium.Cartesian3(this._emitterPos[0], this._emitterPos[1], this._emitterPos[2]),
      this._emitterRadius + maxTravel + maxGravityTravel + this._maxSize * 2,
    )
    this._worldBoundingSphere = new Cesium.BoundingSphere()

    // 预计算 uniform 值
    this._gravityC3 = new Cesium.Cartesian3(this._gravity[0], this._gravity[1], this._gravity[2])
    this._colorStartC3 = new Cesium.Cartesian3(this._startColor[0], this._startColor[1], this._startColor[2])
    this._colorMid1C3  = new Cesium.Cartesian3(this._mid1Color[0], this._mid1Color[1], this._mid1Color[2])
    this._colorMid2C3  = new Cesium.Cartesian3(this._mid2Color[0], this._mid2Color[1], this._mid2Color[2])
    this._colorEndC3   = new Cesium.Cartesian3(this._endColor[0], this._endColor[1], this._endColor[2])

    // 生成粒子初始数据
    this._generateParticles()
  }

  // ─── 生成粒子初始数据（CPU 一次性计算）───
  _generateParticles() {
    const n = this._particleCount
    const positions = new Float32Array(n * 3)
    const velocities = new Float32Array(n * 3)
    const lifetimes = new Float32Array(n)
    const sizes = new Float32Array(n)
    const startTimes = new Float32Array(n)
    const seeds = new Float32Array(n)

    // 归一化方向向量
    const dir = this._direction
    const dLen = Math.sqrt(dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2) || 1
    const dx = dir[0] / dLen, dy = dir[1] / dLen, dz = dir[2] / dLen

    // 构建垂直基向量（用于锥形发射）
    let px, py, pz
    if (Math.abs(dz) < 0.99) {
      px = dy; py = -dx; pz = 0
    } else {
      px = 1; py = 0; pz = 0
    }
    const pLen = Math.sqrt(px * px + py * py + pz * pz) || 1
    px /= pLen; py /= pLen; pz /= pLen
    // q = dir × p
    const qx = dy * pz - dz * py
    const qy = dz * px - dx * pz
    const qz = dx * py - dy * px

    const spreadRad = Cesium.Math.toRadians(this._spreadAngle)

    for (let i = 0; i < n; i++) {
      // 随机发射位置（圆形面内）
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * this._emitterRadius
      positions[i * 3] = this._emitterPos[0] + Math.cos(a) * r
      positions[i * 3 + 1] = this._emitterPos[1] + Math.sin(a) * r
      positions[i * 3 + 2] = this._emitterPos[2]

      // 锥形随机速度
      const speed = this._speed + (Math.random() - 0.5) * 2 * this._speedVar
      const theta = Math.random() * spreadRad
      const phi = Math.random() * Math.PI * 2
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      const cosp = Math.cos(phi), sinp = Math.sin(phi)

      velocities[i * 3] = (dx * cosT + (px * cosp + qx * sinp) * sinT) * speed
      velocities[i * 3 + 1] = (dy * cosT + (py * cosp + qy * sinp) * sinT) * speed
      velocities[i * 3 + 2] = (dz * cosT + (pz * cosp + qz * sinp) * sinT) * speed

      // 随机生命周期 & 尺寸
      lifetimes[i] = this._minLife + Math.random() * (this._maxLife - this._minLife)
      sizes[i] = this._minSize + Math.random() * (this._maxSize - this._minSize)

      // 随机时间偏移（使粒子连续发射）
      startTimes[i] = Math.random() * this._maxLife

      // 随机种子（用于 shader 中每粒子独立噪声）
      seeds[i] = Math.random() * 1000.0
    }

    this._data = { positions, velocities, lifetimes, sizes, startTimes, seeds }
  }

  // ─── 创建 DrawCommand（含自定义 Shader）───
  _createCommand(context) {
    const { positions, velocities, lifetimes, sizes, startTimes, seeds } = this._data
    const n = this._particleCount

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: positions,
        }),
        velocity: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: velocities,
        }),
        lifetime: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 1,
          values: lifetimes,
        }),
        psize: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 1,
          values: sizes,
        }),
        startTime: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 1,
          values: startTimes,
        }),
        seed: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 1,
          values: seeds,
        }),
      },
      indices: new Uint16Array(Array.from({ length: n }, (_, i) => i)),
      primitiveType: Cesium.PrimitiveType.POINTS,
      boundingSphere: new Cesium.BoundingSphere(
        new Cesium.Cartesian3(this._emitterPos[0], this._emitterPos[1], this._emitterPos[2]),
        100000
      ),
    })

    const attributeLocations = Cesium.GeometryPipeline.createAttributeLocations(geometry)

    const vertexArray = Cesium.VertexArray.fromGeometry({
      geometry: geometry,
      context: context,
      attributeLocations: attributeLocations,
    })

    const shaderProgram = Cesium.ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: `
        in vec3 position;
        in vec3 velocity;
        in float lifetime;
        in float psize;
        in float startTime;
        in float seed;

        uniform float uTime;
        uniform vec3  uGravity;
        uniform float uDrag;
        uniform float uSizeGrowth;
        uniform float uSmokeMode;

        out float vAge01;
        out float vSeed;
        out float vSmokeMode;

        // 简易 hash 噪声
        float hash(float n) { return fract(sin(n) * 43758.5453); }

        // 多层 sin 湍流（烟雾用，比单层更自然）
        vec3 smokeTurbulence(float age, float seed, float strength) {
          float t = age * 1.5;
          float h1 = hash(seed) * 6.28;
          float h2 = hash(seed + 7.3) * 6.28;
          float h3 = hash(seed + 13.7) * 6.28;
          // 低频大范围 + 中频细节
          vec3 turb;
          turb.x = sin(t * 0.8 + h1) * 0.6 + sin(t * 2.1 + h2) * 0.3;
          turb.y = cos(t * 1.1 + h2) * 0.6 + cos(t * 1.7 + h3) * 0.3;
          turb.z = sin(t * 0.6 + h3) * 0.6 + sin(t * 1.9 + h1) * 0.3;
          return turb * strength;
        }

        void main() {
          float age = mod(uTime + startTime, lifetime);
          vAge01 = age / lifetime;
          vSeed = seed;
          vSmokeMode = uSmokeMode;

          // 基础位移
          vec3 displacement = velocity * age + uGravity * age * age * 0.5;

          // 阻力衰减
          float dragFactor = exp(-uDrag * age);
          displacement *= dragFactor;

          if (uSmokeMode > 0.5) {
            // 烟雾：被火箭反推的扩散感
            // 1) 湍流随年龄增强（初期紧凑，后期翻滚扩散）
            float turbStrength = (1.0 - dragFactor) * 22.0 * smoothstep(0.0, 0.25, vAge01);
            vec3 turb = smokeTurbulence(age, seed, turbStrength);
            turb.z *= 0.3; // 压制垂直湍流
            // 2) 径向扩散：基于初始位置方向向外推开（仅水平方向）
            vec3 radialDir = normalize(position - vec3(0.0, 0.0, 0.0));
            radialDir.z *= 0.2; // 压制垂直扩散
            float radialPush = smoothstep(0.0, 0.5, vAge01) * 35.0 * (1.0 - dragFactor);
            displacement += radialDir * radialPush + turb;
            // 3) 向下反推（被火箭排气推向地面）
            displacement.z -= smoothstep(0.0, 0.3, vAge01) * 20.0 * (1.0 - dragFactor);
          } else {
            // 火焰：高速随机抖动
            float turbStrength = (1.0 - dragFactor) * 8.0;
            float t = age * 3.0;
            displacement.x += sin(t + hash(seed) * 6.28) * turbStrength * hash(seed);
            displacement.y += cos(t * 1.3 + hash(seed + 1.0) * 6.28) * turbStrength * hash(seed + 1.0);
            displacement.z += sin(t * 0.7 + hash(seed + 2.0) * 6.28) * turbStrength * hash(seed + 2.0);
          }

          vec3 pos = position + displacement;
          vec4 viewPos = czm_modelView * vec4(pos, 1.0);
          gl_Position = czm_projection * viewPos;

          float sizeFade = 1.0 - smoothstep(0.7, 1.0, vAge01);

          if (uSmokeMode > 0.5) {
            // 烟雾：稳定缓慢增长，无闪烁
            float currentSize = psize * (1.0 + vAge01 * uSizeGrowth);
            gl_PointSize = max(1.0, currentSize * sizeFade * (300.0 / max(1.0, -viewPos.z)));
          } else {
            // 火焰：高频闪烁
            float flicker = 0.8 + 0.2 * sin(uTime * 15.0 + seed * 10.0);
            float currentSize = psize * (1.0 + vAge01 * uSizeGrowth) * flicker;
            gl_PointSize = max(1.0, currentSize * sizeFade * (300.0 / max(1.0, -viewPos.z)));
          }
        }
      `,
      fragmentShaderSource: `
        in float vAge01;
        in float vSeed;
        in float vSmokeMode;

        uniform vec3  uColorStart;
        uniform vec3  uColorMid1;
        uniform vec3  uColorMid2;
        uniform vec3  uColorEnd;
        uniform float uGlobalOpacity;
        uniform float uTurbulence;
        uniform float uTime;

        // 2D hash & value noise
        float hash21(vec2 p) {
          p = fract(p * vec2(443.897, 441.423));
          p += dot(p, p.yx + 19.19);
          return fract((p.x + p.y) * p.x);
        }
        float noise2D(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash21(i);
          float b = hash21(i + vec2(1, 0));
          float c = hash21(i + vec2(0, 1));
          float d = hash21(i + vec2(1, 1));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        // fbm 分形噪声（烟雾体积感）
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise2D(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);

          if (vSmokeMode > 0.5) {
            // ═══ 烟雾模式 ═══
            // 低频噪声扭曲坐标（有机翻滚边缘）
            float n1 = fbm(coord * 4.0 + vec2(vSeed, uTime * 0.15));
            float n2 = fbm(coord * 7.0 + vec2(vSeed + 10.0, uTime * 0.1));
            vec2 distortedCoord = coord + (n1 - 0.5) * uTurbulence + (n2 - 0.5) * uTurbulence * 0.3;

            float dist = length(distortedCoord);
            if (dist > 0.5) discard;

            // 软边缘：更柔和的渐变
            float alpha = 1.0 - smoothstep(0.15, 0.5, dist);

            // fbm 密度调制：模拟烟团体积感
            float density = fbm(coord * 5.0 + vec2(vSeed * 0.3, uTime * 0.08));
            density = mix(0.3, 1.0, density);
            alpha *= density;

            // 颜色渐变
            vec3 color;
            if (vAge01 < 0.33) {
              color = mix(uColorStart, uColorMid1, vAge01 / 0.33);
            } else if (vAge01 < 0.66) {
              color = mix(uColorMid1, uColorMid2, (vAge01 - 0.33) / 0.33);
            } else {
              color = mix(uColorMid2, uColorEnd, (vAge01 - 0.66) / 0.34);
            }

            // 烟雾不增亮，边缘轻微暗化
            float edgeDarken = mix(0.85, 1.0, 1.0 - dist * 1.5);
            color *= edgeDarken;

            // 生命淡出：前 10% 淡入，后 50% 缓慢淡出
            float lifeFade = smoothstep(0.0, 0.1, vAge01) * (1.0 - smoothstep(0.5, 1.0, vAge01));

            out_FragColor = vec4(color, alpha * lifeFade * uGlobalOpacity * 0.9);
          } else {
            // ═══ 火焰模式 ═══
            float n1 = noise2D(coord * 8.0 + vec2(vSeed, uTime * 0.5));
            float n2 = noise2D(coord * 12.0 + vec2(vSeed + 10.0, uTime * 0.3));
            vec2 distortedCoord = coord + (n1 - 0.5) * uTurbulence + (n2 - 0.5) * uTurbulence * 0.5;

            float dist = length(distortedCoord);
            if (dist > 0.5) discard;

            float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
            float density = noise2D(coord * 6.0 + vec2(vSeed * 0.1, uTime * 0.2));
            alpha *= 0.5 + 0.5 * density;
            alpha = clamp(alpha, 0.0, 1.0);

            vec3 color;
            if (vAge01 < 0.33) {
              color = mix(uColorStart, uColorMid1, vAge01 / 0.33);
            } else if (vAge01 < 0.66) {
              color = mix(uColorMid1, uColorMid2, (vAge01 - 0.33) / 0.33);
            } else {
              color = mix(uColorMid2, uColorEnd, (vAge01 - 0.66) / 0.34);
            }

            float lifeFade = 1.0 - smoothstep(0.5, 1.0, vAge01);
            float coreBoost = 1.0 + (1.0 - dist * 2.0) * 0.4;
            color *= coreBoost;

            out_FragColor = vec4(color, alpha * lifeFade * uGlobalOpacity);
          }
        }
      `,
      attributeLocations: attributeLocations,
    })

    const renderState = Cesium.RenderState.fromCache({
      depthTest: { enabled: true },
      depthMask: false,
      blending: this._additive
        ? Cesium.BlendingState.ADDITIVE_BLEND
        : Cesium.BlendingState.ALPHA_BLEND,
    })

    this._command = new Cesium.DrawCommand({
      vertexArray: vertexArray,
      shaderProgram: shaderProgram,
      uniformMap: {
        uTime: () => this._time,
        uGravity: () => this._gravityC3,
        uDrag: () => this._drag,
        uSizeGrowth: () => this._sizeGrowth,
        uColorStart: () => this._colorStartC3,
        uColorMid1: () => this._colorMid1C3,
        uColorMid2: () => this._colorMid2C3,
        uColorEnd: () => this._colorEndC3,
        uGlobalOpacity: () => this._globalOpacity,
        uTurbulence: () => this._turbulence,
        uSmokeMode: () => this._smokeMode ? 1.0 : 0.0,
      },
      renderState: renderState,
      pass: Cesium.Pass.TRANSLUCENT,
      primitiveType: Cesium.PrimitiveType.POINTS,
      modelMatrix: this._modelMatrix,
      boundingVolume: this._worldBoundingSphere,
    })
  }

  // ─── 属性 ───
  get show() { return this._show }
  set show(v) { this._show = v }

  get time() { return this._time }
  set time(v) { this._time = v }

  get globalOpacity() { return this._globalOpacity }
  set globalOpacity(v) { this._globalOpacity = v }

  get modelMatrix() { return this._modelMatrix }
  set modelMatrix(v) { this._modelMatrix = v }

  // ─── Primitive 接口 ───
  update(frameState) {
    if (!this._show) return
    if (!this._command) this._createCommand(frameState.context)
    this._command.modelMatrix = this._modelMatrix
    Cesium.BoundingSphere.transform(
      this._localBoundingSphere,
      this._modelMatrix,
      this._worldBoundingSphere,
    )
    frameState.commandList.push(this._command)
  }

  isDestroyed() { return this._destroyed }
  destroy() {
    this._destroyed = true
    return Cesium.destroyObject(this)
  }
}
