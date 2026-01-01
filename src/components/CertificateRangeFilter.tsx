import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Award, X } from 'lucide-react'

interface CertificateRangeFilterProps {
  label: string
  value: { min?: number; max?: number } | null
  onChange: (value: { min?: number; max?: number } | null) => void
}

export function CertificateRangeFilter({ label, value, onChange }: CertificateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [tempRange, setTempRange] = useState<[number, number]>([1, 5])

  const isActive = value !== null

  const handleEnable = () => {
    setTempRange([1, 5])
    onChange({ min: 1, max: 5 })
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
    if (min === 1 && max === 5) return '有证'
    if (min === max) return `${min}级`
    if (min === 1) return `≤${max}级`
    if (max === 5) return `≥${min}级`
    return `${min}-${max}级`
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? "default" : "outline"}
          size="sm"
          className="h-9 gap-1.5"
        >
          <Award className="h-3.5 w-3.5" />
          <span>{label}</span>
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
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{label}级别</span>
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
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1级</span>
                <span>2级</span>
                <span>3级</span>
                <span>4级</span>
                <span>5级</span>
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
