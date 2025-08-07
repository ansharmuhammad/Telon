import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format, setHours, setMinutes } from "date-fns"
import { Input } from "./input"
import { Label } from "./label"
import { useState } from "react"

type DateTimePickerProps = {
  date: Date | null;
  setDate: (date: Date | null) => void;
}

export function DateTimePicker({ date, setDate }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (selectedDate?: Date) => {
    if (!selectedDate) {
      setDate(null);
      return;
    }
    const newDate = setHours(setMinutes(selectedDate, date?.getMinutes() || 0), date?.getHours() || 12);
    setDate(newDate);
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>, unit: 'hours' | 'minutes') => {
    if (!date) {
      const now = new Date();
      const newDate = setHours(setMinutes(now, 0), 12);
      setDate(newDate);
    }
    const value = parseInt(e.target.value, 10);
    if (isNaN(value)) return;

    if (unit === 'hours') {
      setDate(setHours(date || new Date(), value));
    } else {
      setDate(setMinutes(date || new Date(), value));
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "MMM d, yyyy 'at' h:mm a") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={date || undefined}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="p-3 border-t border-border">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="hours" className="text-xs">Hour</Label>
              <Input
                id="hours"
                type="number"
                min="0"
                max="23"
                value={date ? format(date, 'HH') : '12'}
                onChange={(e) => handleTimeChange(e, 'hours')}
              />
            </div>
            <div>
              <Label htmlFor="minutes" className="text-xs">Minute</Label>
              <Input
                id="minutes"
                type="number"
                min="0"
                max="59"
                value={date ? format(date, 'mm') : '00'}
                onChange={(e) => handleTimeChange(e, 'minutes')}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" className="w-full" onClick={() => setIsOpen(false)}>Done</Button>
            <Button size="sm" variant="ghost" className="w-full" onClick={() => { setDate(null); setIsOpen(false); }}>Clear</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}