import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as dat from 'lil-gui'
import Snake from './src/Snake'
import Candy from './src/Candy'
import Rock from './src/Rock'
import Tree from './src/Tree'
import lights from './src/Ligths'
import { resolution } from './src/Params'
import gsap from 'gsap'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader'
import fontSrc from 'three/examples/fonts/helvetiker_bold.typeface.json?url'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry'
import Entity from './src/Entity'

const isMobile = window.innerWidth <= 768
const loader = new FontLoader()
let font

loader.load(fontSrc, function (loadedFont) {
	font = loadedFont

	printScore()
})

let gui 

const palettes = {
	green: {
		groundColor: 0x0000,
		fogColor: 0x0000,
		rockColor: 0xebebeb,
		treeColor: 0x639541,
		candyColor: 0xFF0000, 
		snakeColor: 0x1d5846,
		mouthColor: 'blue',
	},
}

let paletteName = localStorage.getItem('paletteName') || 'green'
let selectedPalette = palettes[paletteName]

const params = {
	...selectedPalette,
}

function applyPalette(paletteName) {
	const palette = palettes[paletteName]
	localStorage.setItem('paletteName', paletteName)

	selectedPalette = palette

	if (!palette) return

	const {
		groundColor,
		fogColor,
		rockColor,
		treeColor,
		candyColor,
		snakeColor,
		mouthColor,
	} = palette

	planeMaterial.color.set(groundColor)
	scene.fog.color.set(fogColor)
	scene.background.set(fogColor)

	candies[0].mesh.material.color.set(candyColor)
	snake.body.head.data.mesh.material.color.set(snakeColor)

	snake.body.head.data.mesh.material.color.set('skyblue')
	snake.mouthColor = mouthColor
	snake.mouth.material.color.set(mouthColor)

}

if (gui) {
	gui
		.addColor(params, 'groundColor')
		.name('Ground color')
		.onChange((val) => planeMaterial.color.set(val))

	gui
		.addColor(params, 'fogColor')
		.name('Fog color')
		.onChange((val) => {
			scene.fog.color.set(val)
			scene.background.color.set(val)
		})

	gui
		.addColor(params, 'rockColor')
		.name('Rock color')
		.onChange((val) => {
			entities
				.find((entity) => entity instanceof Rock)
				?.mesh.material.color.set(val)
		})

	gui
		.addColor(params, 'treeColor')
		.name('Tree color')
		.onChange((val) => {
			entities
				.find((entity) => entity instanceof Tree)
				?.mesh.material.color.set(val)
		})

	gui
		.addColor(params, 'candyColor')
		.name('Candy color')
		.onChange((val) => {
			candies[0].mesh.material.color.set(val)
		})

	gui
		.addColor(params, 'snakeColor')
		.name('Snake color')
		.onChange((val) => {
			snake.body.head.data.mesh.material.color.set(val)
		})
}

let score = 0

const gridHelper = new THREE.GridHelper(
	resolution.x,
	resolution.y,
	0xffffff,
	0xffffff
)
gridHelper.position.set(resolution.x / 2 - 0.5, -0.49, resolution.y / 2 - 0.5)
gridHelper.material.transparent = true
gridHelper.material.opacity = isMobile ? 0.75 : 0.3

const scene = new THREE.Scene()
scene.background = new THREE.Color(params.fogColor)

scene.fog = new THREE.Fog(params.fogColor, 5, 40)

scene.add(gridHelper)


const sizes = {
	width: window.innerWidth,
	height: window.innerHeight,
}

const fov = 60
const camera = new THREE.PerspectiveCamera(fov, sizes.width / sizes.height, 0.1)

const finalPosition = isMobile
	? new THREE.Vector3(resolution.x / 2 - 0.5, resolution.x + 15, resolution.y)
	: new THREE.Vector3(
			-8 + resolution.x / 2,
			resolution.x / 2 + 4,
			resolution.y + 6
	  )
const initialPosition = new THREE.Vector3(
	resolution.x / 2 + 5,
	4,
	resolution.y / 2 + 4
)
camera.position.copy(initialPosition)


const axesHelper = new THREE.AxesHelper(3)

const renderer = new THREE.WebGLRenderer({
	antialias: window.devicePixelRatio < 2,
	logarithmicDepthBuffer: true,
})
document.body.appendChild(renderer.domElement)
handleResize()

renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.VSMShadowMap

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.enableZoom = false
controls.enablePan = false
controls.enableRotate = false
controls.target.set(
	resolution.x / 2 - 2,
	0,
	resolution.y / 2 + (isMobile ? 0 : 2)
)


const planeGeometry = new THREE.PlaneGeometry(
	resolution.x * 50,
	resolution.y * 50
)
planeGeometry.rotateX(-Math.PI * 0.5)
const planeMaterial = new THREE.MeshStandardMaterial({
	color: params.groundColor,
})
const plane = new THREE.Mesh(planeGeometry, planeMaterial)
plane.position.x = resolution.x / 2 - 0.5
plane.position.z = resolution.y / 2 - 0.5
plane.position.y = -0.5
scene.add(plane)

plane.receiveShadow = true

const snake = new Snake({
	scene,
	resolution,
	color: selectedPalette.snakeColor,
	mouthColor: selectedPalette.mouthColor,
})

snake.addEventListener('updated', function () {

	if (snake.checkSelfCollision() || snake.checkEntitiesCollision(entities)) {
		snake.die()
		score = 0;
		resetGame()
	}


	const headIndex = snake.indexes.at(-1)
	const candyIndex = candies.findIndex(
		(candy) => candy.getIndexByCoord() === headIndex
	)

	if (candyIndex >= 0) {
		const candy = candies[candyIndex]
		scene.remove(candy.mesh)
		candies.splice(candyIndex, 1)
		snake.body.head.data.candy = candy
		addCandy()
		score += candy.points
		printScore()
	}
})

let scoreEntity

function printScore() {
	if (!font) {
		return
	}

	if (!score) {
		score = 0
	}

	if (scoreEntity) {
		scene.remove(scoreEntity.mesh)
		scoreEntity.mesh.geometry.dispose()
		scoreEntity.mesh.material.dispose()
	}

	const geometry = new TextGeometry(`${score}`, {
		font: font,
		size: 3,
		height: 1,
		curveSegments: 12,
		bevelEnabled: true,
		bevelThickness: 0.1,
		bevelSize: 0.1,
		bevelOffset: 0,
		bevelSegments: 5,
	})

	geometry.center()
	if (isMobile) {
		geometry.rotateX(-Math.PI * 0.5)
	}

	const mesh = new THREE.Mesh(geometry, snake.body.head.data.mesh.material)

	mesh.position.x = resolution.x / 2 - 0.5
	mesh.position.z = -4
	mesh.position.y = 1.8

	mesh.castShadow = true

	scoreEntity = new Entity(mesh, resolution, { size: 0.8, number: 0.3 })


	scoreEntity.in()
	scene.add(scoreEntity.mesh)
}

window.addEventListener('click', function () {
	!isRunning ? startGame() : stopGame()
})

const mobileArrows = document.getElementById('mobile-arrows')

function registerEventListener() {
	if (isMobile) {
		const prevTouch = new THREE.Vector2()
		let middle = 1.55
		let scale = 1

		window.addEventListener('touchstart', (event) => {
			const touch = event.targetTouches[0]

			middle = THREE.MathUtils.clamp(middle, 1.45, 1.65)

			let x, y
			x = (2 * touch.clientX) / window.innerWidth - 1
			y = (2 * touch.clientY) / window.innerHeight - middle


			if (!isRunning) {
				startGame()
			}



			if (x * scale > y) {
				if (x * scale < -y) {
					snake.setDirection('ArrowUp')
					scale = 3
				} else {
					snake.setDirection('ArrowRight')
					middle += y
					scale = 0.33
				}
			} else {
				if (-x * scale > y) {
					snake.setDirection('ArrowLeft')
					middle += y
					scale = 0.33
				} else {
					snake.setDirection('ArrowDown')
					scale = 3
				}
			}

			prevTouch.x = x
			prevTouch.y = y
		})
	} else {

		window.addEventListener('keydown', function (e) {

			const keyCode = e.code

			snake.setDirection(keyCode)

			if (keyCode === 'Space') {
				!isRunning ? startGame() : stopGame()
			} else if (!isRunning) {
				startGame()
			}
		})
	}
}

let isRunning

function startGame() {
	if (!snake.isMoving) {
		isRunning = setInterval(() => {
			snake.update()
		}, 240)
	}
}

function stopGame() {
	clearInterval(isRunning)
	isRunning = null

}

function resetGame() {
	stopGame()
	score = 0

	let candy = candies.pop()
	while (candy) {
		scene.remove(candy.mesh)
		candy = candies.pop()
	}

	let entity = entities.pop()
	while (entity) {
		scene.remove(entity.mesh)
		entity = entities.pop()
	}

	addCandy()
	generateEntities()
}

const candies = []
const entities = []

function addCandy() {
	const candy = new Candy(resolution, selectedPalette.candyColor)

	let index = getFreeIndex()

	candy.mesh.position.x = index % resolution.x
	candy.mesh.position.z = Math.floor(index / resolution.x)

	candies.push(candy)

	candy.in()

	scene.add(candy.mesh)
}

addCandy()

function getFreeIndex() {
	let index
	let candyIndexes = candies.map((candy) => candy.getIndexByCoord())
	let entityIndexes = entities.map((entity) => entity.getIndexByCoord())

	do {
		index = Math.floor(Math.random() * resolution.x * resolution.y)
	} while (
		snake.indexes.includes(index) ||
		candyIndexes.includes(index) ||
		entityIndexes.includes(index)
	)

	return index
}

function addEntity() {
	const entity =
		Math.random() > 1
			? new Rock(resolution, selectedPalette.rockColor)
			: new Tree(resolution, selectedPalette.treeColor)

	let index = getFreeIndex()


	entities.push(entity)


	scene.add(entity.mesh)
}

function generateEntities() {
	for (let i = 0; i < 20; i++) {

	}

	entities.sort((a, b) => {
		const c = new THREE.Vector3(
			resolution.x / 2 - 0.5,
			0,
			resolution.y / 2 - 0.5
		)

		const distanceA = a.position.clone().sub(c).length()
		const distanceB = b.position.clone().sub(c).length()

		return distanceA - distanceB
	})

	gsap.from(
		entities.map((entity) => entity.mesh.scale),
		{
			x: 0,
			y: 0,
			z: 0,
			duration: 1,
			ease: 'elastic.out(1.5, 0.5)',
			stagger: {
				grid: [20, 20],
				amount: 0.7,
			},
		}
	)
}

generateEntities()

scene.add(...lights)






const audio = document.getElementById('audio')
const btnVolume = document.getElementById('btn-volume')
const btnPlay = document.getElementById('btn-play')

gsap.fromTo(
	btnPlay,
	{ autoAlpha: 0, scale: 0, yPercent: -50, xPercent: -50 },
	{
		duration: 0.8,
		autoAlpha: 1,
		scale: 1,
		yPercent: -50,
		xPercent: -50,
		delay: 0.3,
		ease: `elastic.out(1.2, 0.7)`,
	}
)


gsap.to(camera.position, { ...finalPosition, duration: 2 })
if (isMobile) {
	gsap.to(controls.target, {
		x: resolution.x / 2 - 0.5,
		y: 0,
		z: resolution.y / 2 - 0.5,
	})
}
gsap.to(scene.fog, { duration: 2, near: isMobile ? 30 : 20, far: 55 })



gsap.to(this, {
	duration: 1,
	scale: 0,
	ease: `elastic.in(1.2, 0.7)`,
	onComplete: () => {
		this.style.visibility = 'hidden'
	},
})

registerEventListener()



const initialVolume = audio.volume

btnVolume.addEventListener('click', function () {
	if (audio.volume === 0) {
		unmuteVolume()
	} else {
		muteVolume()
	}
})

function muteVolume() {
	localStorage.setItem('volume', 'off')
	gsap.to(audio, { volume: 0, duration: 1 })
	btnVolume.classList.remove('after:hidden')
	btnVolume.querySelector(':first-child').classList.remove('animate-ping')
	btnVolume.classList.add('after:block')
}

function unmuteVolume() {
	localStorage.setItem('volume', 'on')
	btnVolume.classList.add('after:hidden')
	btnVolume.querySelector(':first-child').classList.add('animate-ping')
	btnVolume.classList.remove('after:block')
	gsap.to(audio, { volume: initialVolume, duration: 1 })
}

const topBar = document.querySelector('.top-bar')
const topBarItems = document.querySelectorAll('.top-bar__item')

gsap.set(topBarItems, { y: -200, autoAlpha: 0 })

gsap.to(topBar, {
	opacity: 1,
	delay: 0.3,
	onComplete: () => {
		gsap.to(topBarItems, {
			duration: 1,
			y: 0,
			autoAlpha: 1,
			ease: `elastic.out(1.2, 0.9)`,
			stagger: {
				amount: 0.3,
			},
		})
	},
})

const paletteSelectors = document.querySelectorAll('[data-color]')
gsap.to(topBar, {
	opacity: 1,
	delay: 0.5,
	onComplete: () => {
		gsap.to(paletteSelectors, {
			duration: 1,
			x: 0,
			autoAlpha: 1,
			ease: `elastic.out(1.2, 0.9)`,
			stagger: {
				amount: 0.2,
			},
		})
	},
})

paletteSelectors.forEach((selector) =>
	selector.addEventListener('click', function () {
		const paletteName = this.dataset.color
		applyPalette(paletteName)
	})
)

const manager = new THREE.LoadingManager()
const textureLoader = new THREE.TextureLoader(manager)

const wasd = textureLoader.load('/wasd.png')
const arrows = textureLoader.load('/arrows.png')

const wasdGeometry = new THREE.PlaneGeometry(3.5, 2)
wasdGeometry.rotateX(-Math.PI * 0.5)

const planeWasd = new THREE.Mesh(
	wasdGeometry,
	new THREE.MeshStandardMaterial({
		transparent: true,
		map: wasd,
		opacity: isMobile ? 0 : 0.5,
	})
)

const planeArrows = new THREE.Mesh(
	wasdGeometry,
	new THREE.MeshStandardMaterial({
		transparent: true,
		map: arrows,
		opacity: isMobile ? 0 : 0.5,
	})
)

planeArrows.position.set(8.7, 0, 21)
planeWasd.position.set(13, 0, 21)

scene.add(planeArrows, planeWasd)

manager.onLoad = () => {

}

applyPalette(paletteName)

function tic() {


	controls.update()

	renderer.render(scene, camera)

	requestAnimationFrame(tic)
}

requestAnimationFrame(tic)

window.addEventListener('resize', handleResize)

function handleResize() {
	sizes.width = window.innerWidth
	sizes.height = window.innerHeight

	camera.aspect = sizes.width / sizes.height
	camera.updateProjectionMatrix()

	renderer.setSize(sizes.width, sizes.height)

	const pixelRatio = Math.min(window.devicePixelRatio, 2)
	renderer.setPixelRatio(pixelRatio)
}
