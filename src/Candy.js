import {
	Mesh,
	MeshNormalMaterial,
	MeshStandardMaterial,
	SphereGeometry,
} from 'three'
import Entity from './Entity'

const GEOMETRY = new SphereGeometry(0.3, 20, 20)
const MATERIAL = new MeshStandardMaterial({
	color: "rgb(255, 0, 0)",
})

export default class Candy extends Entity {
	constructor(resolution, color) {
		const mesh = new Mesh(GEOMETRY, MATERIAL)
		super(mesh, resolution)

		if (color) {
			MATERIAL.color.set('rgb(255, 0, 0)')
		}

		MATERIAL.color.set('rgb(255, 0, 0)')

		this.points = Math.floor(Math.random() * 3) + 1
		this.mesh.scale.setScalar(0.5 + (this.points * 0.5) / 3)
	}
}
