import { useRef, useCallback, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Text } from '@react-three/drei'
import { playerState } from '../game/playerState'
import { audioManager } from './audioManager'

export type BuyStationDef = {
  id: string
  position: [number, number, number]
  collected: boolean
  /** Available weapons for purchase */
  availableWeapons: string[]
  /** Cost to buy weapons from this station */
  cost: number
  /** World rotation for visual display */
  rotationY: number
}

type BuyStationProps = {
  stations: BuyStationDef[]
  points: number
  onPurchase?: (weaponId: string, cost: number) => void
  onPointsChange?: (points: number) => void
}

/**
 * Buy stations where players can purchase weapons with points.
 * Player walks near them and presses B to buy.
 */
export function BuyStations({ stations, points, onPurchase, onPointsChange }: BuyStationProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [selectedStation, setSelectedStation] = useState<BuyStationDef | null>(null)

  // Handle buy keyboard shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyB' && !showMenu) {
        // Find nearest uncollected station
        const nearest = stations
          .filter((s) => !s.collected)
          .map((s) => {
            const dx = s.position[0] - playerState.x
            const dz = s.position[2] - playerState.z
            const dist = Math.hypot(dx, dz)
            return { station: s, dist }
          })
          .filter((s) => s.dist < 3)
          .sort((a, b) => a.dist - b.dist)[0]

        if (nearest) {
          setSelectedStation(nearest.station)
          setShowMenu(true)
          audioManager.play('buy')
        }
      }
      if (e.code === 'Escape') {
        setShowMenu(false)
        setSelectedStation(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stations, showMenu])

  const handlePurchase = useCallback(
    (weaponId: string) => {
      if (!selectedStation) return
      if (points < selectedStation.cost) return

      onPurchase?.(weaponId, selectedStation.cost)
      onPointsChange?.(points - selectedStation.cost)
      audioManager.play('buy')
      setShowMenu(false)
      setSelectedStation(null)
    },
    [selectedStation, points, onPurchase, onPointsChange],
  )

  return (
    <>
      {stations
        .filter((s) => !s.collected)
        .map((station) => (
          <BuyStationModel
            key={station.id}
            station={station}
            onHover={setHovered}
            hovered={hovered === station.id}
          />
        ))}

      {showMenu && selectedStation && (
        <BuyMenu
          station={selectedStation}
          points={points}
          onPurchase={handlePurchase}
          onClose={() => {
            setShowMenu(false)
            setSelectedStation(null)
          }}
        />
      )}
    </>
  )
}

function BuyStationModel({
  station,
  onHover,
  hovered,
}: {
  station: BuyStationDef
  onHover?: (id: string | null) => void
  hovered: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const pickupRef = useRef(station)
  pickupRef.current = station

  // Check proximity for hover hint
  useFrame(() => {
    if (!group.current || pickupRef.current.collected) return

    const dx = pickupRef.current.position[0] - playerState.x
    const dz = pickupRef.current.position[2] - playerState.z
    const dist = Math.hypot(dx, dz)

    if (dist < 3) {
      onHover?.(pickupRef.current.id)
    } else {
      onHover?.(null)
    }
  })

  return (
    <group ref={group} position={station.position} rotation={[0, station.rotationY, 0]}>
      {/* Table base */}
      <mesh position={[0, 0.4, 0]}>
        <boxGeometry args={[1.2, 0.08, 0.8]} />
        <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
      </mesh>
      {/* Legs */}
      {(
        [
          [-0.5, -0.35],
          [0.5, -0.35],
          [-0.5, 0.35],
          [0.5, 0.35],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.2, z]}>
          <boxGeometry args={[0.06, 0.4, 0.06]} />
          <meshStandardMaterial color="#444444" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* Weapon display on top */}
      <group position={[0, 0.5, 0]}>
        <group rotation={[0.3, 0, 0]}>
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.5]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, -0.02, 0.1]}>
            <boxGeometry args={[0.06, 0.03, 0.15]} />
            <meshStandardMaterial color="#5c4033" metalness={0.2} roughness={0.7} />
          </mesh>
        </group>
      </group>
      {/* Price indicator */}
      <mesh position={[0, 1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.25, 0.3, 32]} />
        <meshStandardMaterial
          color={hovered ? '#00ff00' : '#ffff00'}
          transparent
          opacity={hovered ? 1 : 0.6}
          emissive={hovered ? '#00ff00' : '#ffff00'}
          emissiveIntensity={hovered ? 0.8 : 0.3}
        />
      </mesh>
      <Text
        position={[0, 1.22, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        anchorX="center"
        anchorY="middle"
        color={hovered ? '#000000' : '#ffffff'}
        fontSize={0.15}
      >
        {String(station.cost)}
      </Text>
      {hovered && <pointLight color="#ffff00" intensity={0.5} distance={4} position={[0, 0.5, 0]} />}
    </group>
  )
}

function BuyMenu({
  station,
  points,
  onPurchase,
  onClose,
}: {
  station: BuyStationDef
  points: number
  onPurchase: (weaponId: string) => void
  onClose: () => void
}) {
  return (
    <div className="buy-menu-overlay" onClick={onClose}>
      <div className="buy-menu" onClick={(e) => e.stopPropagation()}>
        <h2>PURCHASE WEAPONS</h2>
        <p className="buy-points">Points: {points}</p>
        <div className="buy-weapon-list">
          {station.availableWeapons.map((weaponId) => (
            <button
              key={weaponId}
              className={`buy-weapon-btn ${points < station.cost ? 'disabled' : ''}`}
              onClick={() => onPurchase(weaponId)}
              disabled={points < station.cost}
            >
              <span className="weapon-name">{weaponId}</span>
              <span className="weapon-cost">{station.cost} pts</span>
            </button>
          ))}
        </div>
        <button className="buy-close-btn" onClick={onClose}>
          Close (Esc)
        </button>
      </div>
    </div>
  )
}

/** Create initial buy stations for the map */
export function createInitialStations(): BuyStationDef[] {
  return [
    {
      id: 'station-barn',
      position: [-15, 0, -15] as [number, number, number],
      collected: false,
      availableWeapons: ['mp40', 'pump_shotgun'],
      cost: 1000,
      rotationY: 0,
    },
    {
      id: 'station-house',
      position: [15, 0, 15] as [number, number, number],
      collected: false,
      availableWeapons: ['lever22', 'revolver'],
      cost: 1500,
      rotationY: Math.PI / 2,
    },
  ]
}
