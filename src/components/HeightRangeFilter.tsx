import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Ruler, X } from 'lucide-react'

interface HeightRangeFilterProps {
  value: { min?: number; max?: number } | null
  onChange: (value: { min?: number; max?: number } | null) => void
}

export function HeightRangeFilter({ value, onChange }: HeightRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<[number, number]>([150, 210])

  const isActive = value !== null

  const handleEnable = () => {
    setTempRange([150, 210])
    onChange({ min: 150, max: 210 })
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    setOpen(false)
  }

  const handleRangeChange = (newRange: number[]) => {
    const [min, max] = newRange
    setTempRange([min, max])
    onChange({ min, max })
  }

  const getRangeText = () => {
    if (!value) return '不限'
    const { min, max } = value
    if (min === 150 && max === 210) return '全部'
    if (min === max) return `${min}cm`
    if (min === 150) return `≤${max}cm`
    if (max === 210) return `≥${min}cm`
    return `${min}-${max}cm`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5"
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>身高</span>
          {isActive && (
            <>
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-white/20">
                {getRangeText()}
              </Badge>
              <X
                className="h-3 w-3 ml-1 hover:text-destructive"
                onClick={handleClear}
              />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">身高范围 (cm)</span>
            {!isActive && (
              <Button size="sm" variant="outline" onClick={handleEnable}>
                启用筛选
              </Button>
            )}
            {isActive && (
              <Button size="sm" variant="ghost" onClick={handleClear}>
                清除
              </Button>
            )}
          </div>

          {isActive && (
            <>
              <div className="pt-2">
                <Slider
                  value={tempRange}
                  onValueChange={handleRangeChange}
                  min={150}
                  max={210}
                  step={5}
                  className="w-full"
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>150cm</span>
                <span>170cm</span>
                <span>190cm</span>
                <span>210cm</span>
              </div>

              <div className="text-center">
                <Badge variant="outline" className="text-sm">
                  {getRangeText()}
                </Badge>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
