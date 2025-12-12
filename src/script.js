import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

/* -----------------------------------------------------
   SCENE
----------------------------------------------------- */
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x08090f)
scene.fog = new THREE.FogExp2(0x0a0c12, 0.05)

/* -----------------------------------------------------
   RENDERER
----------------------------------------------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMappingExposure = 0.75
renderer.physicallyCorrectLights = true
document.body.appendChild(renderer.domElement)

/* -----------------------------------------------------
   CAMERA + CONTROLS
----------------------------------------------------- */
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000)
camera.position.set(0, 2, 5)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.minPolarAngle = 0.4
controls.maxPolarAngle = 1.4

/* -----------------------------------------------------
   SUNSET LIGHTING
----------------------------------------------------- */
scene.background = new THREE.Color(0xffb380)
scene.fog = new THREE.FogExp2(0xffc9a6, 0.035)

const ambientSunset = new THREE.AmbientLight(0xffd1a3, 0.55)
scene.add(ambientSunset)

const sunsetLight = new THREE.DirectionalLight(0xffbb66, 3.8)
sunsetLight.position.set(20, 12, -10)
sunsetLight.castShadow = true
sunsetLight.shadow.bias = -0.0003
sunsetLight.shadow.mapSize.set(2048, 2048)
scene.add(sunsetLight)

const sunGeo = new THREE.SphereGeometry(1.8, 32, 32)
const sunMat = new THREE.MeshBasicMaterial({
  color: 0xffdd88,
  emissive: 0xffaa44,
  emissiveIntensity: 3.5
})
const sun = new THREE.Mesh(sunGeo, sunMat)
sun.position.set(50, 15, -20)
scene.add(sun)

/* -----------------------------------------------------
   DAY / NIGHT CYCLE
----------------------------------------------------- */
let time = 0
const sunLight = sunsetLight
const sunSphere = sun

const DAY_SKY = new THREE.Color(0x87ceeb)
const SUNSET_SKY = new THREE.Color(0xffb380)
const NIGHT_SKY = new THREE.Color(0x08090f)

const DAY_FOG = new THREE.Color(0xbfd1e5)
const SUNSET_FOG = new THREE.Color(0xffc9a6)
const NIGHT_FOG = new THREE.Color(0x0a0c12)

function updateDayNightCycle(delta) {
  if (!sunLight || !sunSphere) return
  time += delta * 0.05
  const cycle = (Math.sin(time) + 1) / 2

  const sunX = Math.sin(time) * 60
  const sunY = Math.cos(time) * 35
  sunLight.position.set(sunX, sunY, -20)
  sunSphere.position.set(sunX, sunY, -20)

  const sunIntensity = THREE.MathUtils.lerp(0.0, 4.0, cycle)
  sunLight.intensity = sunIntensity
  sunSphere.material.emissiveIntensity = sunIntensity * 0.5

  if (cycle < 0.25) {
    scene.background.lerpColors(NIGHT_SKY, NIGHT_SKY, 1)
    scene.fog.color.lerpColors(NIGHT_FOG, NIGHT_FOG, 1)
  } else if (cycle < 0.40) {
    let t = (cycle - 0.25) / 0.15
    scene.background.lerpColors(NIGHT_SKY, SUNSET_SKY, t)
    scene.fog.color.lerpColors(NIGHT_FOG, SUNSET_FOG, t)
  } else if (cycle < 0.75) {
    let t = (cycle - 0.40) / 0.35
    scene.background.lerpColors(SUNSET_SKY, DAY_SKY, t)
    scene.fog.color.lerpColors(SUNSET_FOG, DAY_FOG, t)
  } else {
    let t = (cycle - 0.75) / 0.25
    scene.background.lerpColors(DAY_SKY, SUNSET_SKY, t)
    scene.fog.color.lerpColors(DAY_FOG, SUNSET_FOG, t)
  }
}

/* -----------------------------------------------------
   3D CLOUDS
----------------------------------------------------- */
const CLOUD_COUNT = 30
const clouds = []

for (let i = 0; i < CLOUD_COUNT; i++) {
  const cloud = new THREE.Group()
  const puffCount = 3 + Math.floor(Math.random() * 3) // 3–5 puffs per cloud

  for (let j = 0; j < puffCount; j++) {
    const radius = 2 + Math.random() * 1.5
    const geo = new THREE.SphereGeometry(radius, 16, 16)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3 + Math.random() * 0.2,
      roughness: 0.9,
      metalness: 0,
      depthWrite: false
    })
    const puff = new THREE.Mesh(geo, mat)
    puff.position.set(
      (Math.random() - 0.5) * 3,
      (Math.random() - 0.5) * 1,
      (Math.random() - 0.5) * 3
    )
    cloud.add(puff)
  }

  cloud.position.set(
    (Math.random() - 0.5) * 50,
    12 + Math.random() * 1, // height above city
    (Math.random() - 0.5) * 50
  )
  cloud.rotation.y = Math.random() * Math.PI * 2
  scene.add(cloud)
  clouds.push(cloud)
}

/* -----------------------------------------------------
   UPDATE 3D CLOUDS
----------------------------------------------------- */
function updateClouds(delta) {
  clouds.forEach(cloud => {
    cloud.position.x += delta * 0.5 // slow drift
    cloud.position.z += delta * 0.2
    if (cloud.position.x > 25) cloud.position.x = -25
    if (cloud.position.z > 25) cloud.position.z = -25

    // Optional: small rotation for more natural effect
    cloud.rotation.y += delta * 0.02
  })
}

/* -----------------------------------------------------
   DAY/NIGHT CLOUD COLOR UPDATE
----------------------------------------------------- */
function updateCloudColors() {
  clouds.forEach(cloud => {
    cloud.children.forEach(puff => {
      // Color changes with sun intensity
      const intensity = sunLight.intensity
      const color = new THREE.Color().setHSL(0.6, 0.3, 0.5 * intensity + 0.2) // bluish daytime, darker at night
      puff.material.color.copy(color)
    })
  })
}


/* -----------------------------------------------------
   LOAD MODEL
----------------------------------------------------- */
const loader = new GLTFLoader()
let cityModel
const pedestrians = []

loader.load(
  'static/models/city.gltf',
  (gltf) => {
    cityModel = gltf.scene

    cityModel.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        if (child.material?.isMeshBasicMaterial) {
          child.material = new THREE.MeshStandardMaterial({
            map: child.material.map || null,
            roughness: 0.1,
            metalness: 0.4
          })
        }

        if (child.name.toLowerCase().includes("ground")) {
          child.material.roughness = 0.05
          child.material.metalness = 0.65
        }
      }
    })

    scene.add(cityModel)

    // Street Lamps
    const lampNames = ["Lamp", "StreetLamp", "Light", "Post", "Bulb"]
    cityModel.traverse((obj) => {
      if (!obj.isMesh) return
      if (lampNames.some(n => obj.name.includes(n))) {
        const pos = obj.getWorldPosition(new THREE.Vector3())
        const light = new THREE.PointLight(0xfff2cc, 3.2, 14, 1.4)
        light.position.copy(pos)
        light.castShadow = true
        light.shadow.bias = -0.0002
        scene.add(light)

        const bulb = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 16, 16),
          new THREE.MeshBasicMaterial({
            color: 0xffcc00,
            emissive: 0xffcc00,
            emissiveIntensity: 2.5,
            transparent: true,
            opacity: 1
          })
        )
        bulb.position.copy(pos)
        scene.add(bulb)
      }
    })

    /* -----------------------------------------------------
       PEDESTRIANS (center 30% area)
    ----------------------------------------------------- */
    const PEDESTRIAN_AREA_SIZE = 0.3 * 20 // adjust 20 to approx city size
    const pedestrianGeo = new THREE.CapsuleGeometry(0.2, 0.8, 4, 8)
    const pedestrianMat = new THREE.MeshStandardMaterial({
      color: 0x3333ff,
      roughness: 0.7,
      metalness: 0.0
    })

    for (let i = 0; i < 8; i++) {
      const ped = new THREE.Mesh(pedestrianGeo, pedestrianMat)
      ped.position.set(
        (Math.random() - 0.5) * PEDESTRIAN_AREA_SIZE,
        0.4,
        (Math.random() - 0.5) * PEDESTRIAN_AREA_SIZE
      )
      ped.castShadow = true
      ped.receiveShadow = false

      // Slow walking speed
      const speed = 0.02 + Math.random() * 0.01 // ~0.02–0.03 units per frame
      const angle = Math.random() * Math.PI * 2
      ped.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * speed,
        0,
        Math.sin(angle) * speed
      )
      scene.add(ped)
      pedestrians.push(ped)
    }
  },
  undefined,
  console.error
)

/* -----------------------------------------------------
   RAIN
----------------------------------------------------- */
const RAIN_COUNT = 900
const RAIN_AREA = 30
const RAIN_HEIGHT = 25
const dropGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6)
const dropMat = new THREE.MeshBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.7 })
const rainMesh = new THREE.InstancedMesh(dropGeo, dropMat, RAIN_COUNT)
scene.add(rainMesh)
const dropPositions = [], dropVelocities = []

for (let i = 0; i < RAIN_COUNT; i++) {
  dropPositions.push(new THREE.Vector3((Math.random() - 0.5) * RAIN_AREA, Math.random() * RAIN_HEIGHT, (Math.random() - 0.5) * RAIN_AREA))
  dropVelocities.push(new THREE.Vector3(0, -1.2 - Math.random() * 0.5, 0))
}

/* -----------------------------------------------------
   SPLASHES
----------------------------------------------------- */
const SPLASH_COUNT = 300
const splashGeo = new THREE.CircleGeometry(0.05, 8)
const splashMat = new THREE.MeshBasicMaterial({ color: 0x99ccff, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })
const splashMesh = new THREE.InstancedMesh(splashGeo, splashMat, SPLASH_COUNT)
scene.add(splashMesh)

let splashData = []
for (let i = 0; i < SPLASH_COUNT; i++) {
  splashData.push({ active: false, age: 0, maxAge: 12 + Math.random() * 6, pos: new THREE.Vector3(), scale: 0.05 })
  const m = new THREE.Matrix4()
  m.makeScale(0.0001, 0.0001, 0.0001)
  splashMesh.setMatrixAt(i, m)
}
splashMesh.instanceMatrix.needsUpdate = true

/* -----------------------------------------------------
   UPDATE RAIN & SPLASHES
----------------------------------------------------- */
function updateVolumetricRain() {
  const m = new THREE.Matrix4()
  for (let i = 0; i < RAIN_COUNT; i++) {
    const pos = dropPositions[i]
    const vel = dropVelocities[i]
    pos.add(vel)
    if (pos.y < 0) {
      for (let s = 0; s < SPLASH_COUNT; s++) {
        const sp = splashData[s]
        if (!sp.active) {
          sp.active = true; sp.age = 0; sp.scale = 0.05; sp.pos.set(pos.x, 0.01, pos.z)
          break
        }
      }
      pos.y = RAIN_HEIGHT
      pos.x = (Math.random() - 0.5) * RAIN_AREA
      pos.z = (Math.random() - 0.5) * RAIN_AREA
    }
    m.makeTranslation(pos.x, pos.y, pos.z)
    rainMesh.setMatrixAt(i, m)
  }
  rainMesh.instanceMatrix.needsUpdate = true
}

function updateSplashes() {
  const m = new THREE.Matrix4()
  for (let i = 0; i < SPLASH_COUNT; i++) {
    const sp = splashData[i]
    if (!sp.active) continue
    sp.age++; sp.scale += 0.025
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
let lastTime = performance.now()
function animate() {
  const now = performance.now()
  const delta = (now - lastTime) / 1000
  lastTime = now

  controls.update()
  updateDayNightCycle(delta)
  updateVolumetricRain()
  updateSplashes()
  updateClouds(delta)
  updateCloudColors()


  // Update pedestrian movement
  pedestrians.forEach(ped => {
    const vel = ped.userData.velocity
    ped.position.add(vel)
    // Keep inside central area
    if (ped.position.x > 0.3 * 10 || ped.position.x < -0.3 * 10) vel.x *= -1
    if (ped.position.z > 0.3 * 10 || ped.position.z < -0.3 * 10) vel.z *= -1
  })

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
