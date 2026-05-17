import { Canvas, useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, RoundedBox, Torus } from '@react-three/drei'
import { useRef } from 'react'
import type { Mesh } from 'three'

function ShieldScene() {
  const shield = useRef<Mesh>(null)
  const ring = useRef<Mesh>(null)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (shield.current) {
      shield.current.rotation.y = t * 0.35
      shield.current.rotation.x = Math.sin(t * 0.5) * 0.12
    }
    if (ring.current) {
      ring.current.rotation.z = t * 0.6
    }
  })

  return (
    <>
      <ambientLight intensity={0.45} />
      <pointLight position={[4, 4, 4]} intensity={1.2} color="#ffb000" />
      <pointLight position={[-3, -2, 2]} intensity={0.5} color="#6366f1" />
      <Float speed={1.8} rotationIntensity={0.2} floatIntensity={0.6}>
        <group ref={shield}>
          <RoundedBox args={[1.4, 1.7, 0.35]} radius={0.12} smoothness={4}>
            <MeshDistortMaterial
              color="#151b2e"
              emissive="#ffb000"
              emissiveIntensity={0.35}
              metalness={0.6}
              roughness={0.25}
              distort={0.15}
              speed={1.5}
            />
          </RoundedBox>
        </group>
      </Float>
      <Torus ref={ring} args={[1.35, 0.04, 16, 64]} rotation={[Math.PI / 2.2, 0, 0]}>
        <meshStandardMaterial color="#ffb000" emissive="#ffc93c" emissiveIntensity={0.8} />
      </Torus>
    </>
  )
}

export function ThreeHero() {
  return (
    <div className="three-hero" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 4.2], fov: 42 }} dpr={[1, 2]}>
        <ShieldScene />
      </Canvas>
    </div>
  )
}
