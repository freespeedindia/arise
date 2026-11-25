import { useState } from 'react'
import type { Settings } from '../lib/settings'
import WeightCard from '../components/health/WeightCard'
import WaterCard from '../components/health/WaterCard'
import FoodCard from '../components/health/FoodCard'
import ActivityCard from '../components/health/ActivityCard'
import SupplementsCard from '../components/health/SupplementsCard'

export type HealthAction = 'weight' | 'food' | 'activity' | null

export default function Health({ s, today, initial }: { s: Settings; today: string; initial?: HealthAction }) {
  const [weightOpen, setWeightOpen] = useState(initial === 'weight')
  const [foodOpen, setFoodOpen] = useState(initial === 'food')
  const [actOpen, setActOpen] = useState(initial === 'activity')
  return (
    <div className="px-5 safe-top">
      <p className="eyebrow mt-2">Body · Nutrition · Movement</p>
      <h1 className="h1 mt-1">Health</h1>
      <div className="mt-5 space-y-3">
        <WaterCard s={s} today={today} />
        <FoodCard s={s} today={today} openAdd={foodOpen} setOpenAdd={setFoodOpen} />
        <WeightCard s={s} today={today} openLog={weightOpen} setOpenLog={setWeightOpen} />
        <ActivityCard today={today} openLog={actOpen} setOpenLog={setActOpen} />
        <SupplementsCard today={today} />
      </div>
    </div>
  )
}
