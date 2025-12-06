import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

/* -----------------------------------------------------
   SCENE
----------------------------------------------------- */
const scene = new THREE.Scene()

// HDR
new RGBELoader()
  .setPath('static/sky/')
  .load('night.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping
    scene.environment = texture
  })

/* -----------------------------------------------------
   RENDERER
----------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMappingExposure = 0.8
document.body.appendChild(renderer.domElement)

/* -----------------------------------------------------
   CAMERA + CONTROLS
----------------------------------------------------- */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 2, 5)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.enablePan = true
controls.enableZoom = true
controls.minPolarAngle = 0.4
controls.maxPolarAngle = 1.4

/* -----------------------------------------------------
   LIGHTS
----------------------------------------------------- */
scene.add(new THREE.AmbientLight(0x445566, 0.15))

// Luz principal (moonlight)
const moonLight = new THREE.DirectionalLight(0x88aaff, 0.35)
moonLight.position.set(-4, 6, -2)
moonLight.castShadow = true
moonLight.shadow.mapSize.set(1024, 1024)
scene.add(moonLight)

// Luz de relleno pequeña
const smallLight = new THREE.PointLight(0x7799ff, 0.2)
smallLight.position.set(1, 2, 1)
scene.add(smallLight)

/* -----------------------------------------------------
   GLOW + CONO VOLÉTRICO (BASE)
----------------------------------------------------- */
const coneGeo = new THREE.ConeGeometry(1.2, 3.8, 32, 1, true)
const coneMat = new THREE.MeshBasicMaterial({
  color: 0xffe3b8,
  transparent: true,
  opacity: 0.25,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide
})

/* -----------------------------------------------------
   LOAD MODEL
----------------------------------------------------- */
const loader = new GLTFLoader()

loader.load(
  'static/models/Final Proyect.glb',
  (gltf) => {
    const model = gltf.scene

    // Convertir materiales básicos a Standard y añadir emissive a bulbos
    model.traverse((child) => {
      if (!child.isMesh) return

      child.castShadow = true
      child.receiveShadow = true

      if (child.material?.isMeshBasicMaterial) {
        child.material = new THREE.MeshStandardMaterial({
          map: child.material.map || null,
          emissive: new THREE.Color(0xfff4d6),
          emissiveIntensity: 2.5 // Emisión más fuerte
        })
      }
    })

    scene.add(model)

    // Sistema de luces de lámparas
    model.traverse((child) => {
      if (!child.isMesh) return

      if (/^Lamp\d+$/i.test(child.name)) {
        const pos = child.getWorldPosition(new THREE.Vector3())

        // Luz principal de la lámpara (más intensa)
        const lampLight = new THREE.PointLight(0xffe3b8, 25, 30, 1.2)
        lampLight.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0))
        lampLight.castShadow = true
        lampLight.shadow.mapSize.set(1024, 1024)
        lampLight.shadow.bias = -0.0002
        scene.add(lampLight)

        // Glow más visible
        const glowGeo = new THREE.SphereGeometry(0.22, 16, 16)
        const glowMat = new THREE.MeshBasicMaterial({
          color: 0xfff4d6,
          transparent: true,
          opacity: 1.0,
          blending: THREE.AdditiveBlending
        })
        const glow = new THREE.Mesh(glowGeo, glowMat)
        glow.position.copy(pos).add(new THREE.Vector3(0, 1.2, 0))
        scene.add(glow)

        // Cono de luz volumétrico
        const cone = new THREE.Mesh(coneGeo, coneMat)
        cone.position.copy(pos).add(new THREE.Vector3(0, -0.2, 0))
        cone.rotation.x = Math.PI
        cone.scale.set(1.4, 1.4, 1.4)
        scene.add(cone)
      }
    })
  },
  undefined,
  console.error
)

/* -----------------------------------------------------
   VOLUMETRIC RAIN
----------------------------------------------------- */
const RAIN_COUNT = 900
const RAIN_AREA = 30
const RAIN_HEIGHT = 25

const dropGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6)
const dropMat = new THREE.MeshBasicMaterial({
  color: 0x99ccff,
  transparent: true,
  opacity: 0.7
})
const rainMesh = new THREE.InstancedMesh(dropGeo, dropMat, RAIN_COUNT)
scene.add(rainMesh)

const dropPositions = []
const dropVelocities = []

for (let i = 0; i < RAIN_COUNT; i++) {
  dropPositions.push(
    new THREE.Vector3(
      (Math.random() - 0.5) * RAIN_AREA,
      Math.random() * RAIN_HEIGHT,
      (Math.random() - 0.5) * RAIN_AREA
    )
  )
  dropVelocities.push(new THREE.Vector3(0, -1.2 - Math.random() * 0.5, 0))
}

/* -----------------------------------------------------
   SPLASH
----------------------------------------------------- */
const SPLASH_COUNT = 300
const splashGeo = new THREE.CircleGeometry(0.05, 8)
const splashMat = new THREE.MeshBasicMaterial({
  color: 0x99ccff,
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  side: THREE.DoubleSide
})
const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, SPLASH_COUNT)
scene.add(splashMesh)

let splashData = []
for (let i = 0; i < SPLASH_COUNT; i++) {
  splashData.push({
    active: false,
    age: 0,
    maxAge: 12 + Math.random() * 6,
    pos: new THREE.Vector3(),
    scale: 0.05
  })
  const m = new THREE.Matrix4()
  m.makeScale(0.0001, 0.0001, 0.0001)
  splashMesh.setMatrixAt(i, m)
}
splashMesh.instanceMatrix.needsUpdate = true

/* -----------------------------------------------------
   UPDATE RAIN
----------------------------------------------------- */
function updateVolumetricRain() {
  const m = new THREE.Matrix4()
  for (let i = 0; i < RAIN_COUNT; i++) {
    const pos = dropPositions[i]
    const vel = dropVelocities[i]

    pos.add(vel)

    if (pos.y < 0) {
      // splash
      for (let s = 0; s < SPLASH_COUNT; s++) {
        const sp = splashData[s]
        if (!sp.active) {
          sp.active = true
          sp.age = 0
          sp.scale = 0.05
          sp.pos.set(pos.x, 0.01, pos.z)
          break
        }
      }

      // reset drop
      pos.y = RAIN_HEIGHT
      pos.x = (Math.random() - 0.5) * RAIN_AREA
      pos.z = (Math.random() - 0.5) * RAIN_AREA
    }

    m.makeTranslation(pos.x, pos.y, pos.z)
    rainMesh.setMatrixAt(i, m)
  }
  rainMesh.instanceMatrix.needsUpdate = true
}

/* -----------------------------------------------------
   UPDATE SPLASHES
----------------------------------------------------- */
function updateSplashes() {
  const m = new THREE.Matrix4()
  for (let i = 0; i < SPLASH_COUNT; i++) {
    const sp = splashData[i]
    if (!sp.active) continue

    sp.age++
    sp.scale += 0.025
    const opacity = THREE.MathUtils.lerp(0.5, 0.0, sp.age / sp.maxAge)
    splashMat.opacity = opacity

    m.makeScale(sp.scale, sp.scale, sp.scale)
    m.setPosition(sp.pos)
    splashMesh.setMatrixAt(i, m)

    if (sp.age >= sp.maxAge) {
      sp.active = false
      const m0 = new THREE.Matrix4()
      m0.makeScale(0.0001, 0.0001, 0.0001)
      splashMesh.setMatrixAt(i, m0)
    }
  }
  splashMesh.instanceMatrix.needsUpdate = true
}

/* -----------------------------------------------------
   ANIMATION LOOP
----------------------------------------------------- */
function animate() {
  controls.update()
  updateVolumetricRain()
  updateSplashes()
  renderer.render(scene, camera)
}

renderer.setAnimationLoop(animate)

/* -----------------------------------------------------
   WINDOW RESIZE
----------------------------------------------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
