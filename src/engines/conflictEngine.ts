import type { Booking, Schedule, Venue, Course } from '@/types'

export function checkMemberTimeConflict(
  memberId: string,
  datetime: string,
  duration: number,
  bookings: Booking[],
  excludeBookingId?: string
): Booking | null {
  const start = new Date(datetime).getTime()
  const end = start + duration * 60 * 1000
  return (
    bookings.find(b => {
      if (b.memberId !== memberId || b.status === 'cancelled') return false
      if (excludeBookingId && b.id === excludeBookingId) return false
      const bStart = new Date(b.datetime).getTime()
      const bEnd = bStart + b.duration * 60 * 1000
      return start < bEnd && end > bStart
    }) ?? null
  )
}

export function checkCoachCapacityConflict(
  coachId: string,
  datetime: string,
  schedules: Schedule[],
  bookings: Booking[]
): { conflict: boolean; currentBookings: number; capacity: number } {
  const date = new Date(datetime)
  const weekday = date.getDay()
  const timeStr = datetime.slice(11, 16)
  const schedule = schedules.find(
    s => s.coachId === coachId && s.weekday === weekday && s.startTime <= timeStr && s.endTime > timeStr
  )
  if (!schedule) return { conflict: true, currentBookings: 0, capacity: 0 }
  const currentBookings = bookings.filter(
    b => b.coachId === coachId && b.datetime === datetime && b.status === 'confirmed'
  ).length
  return {
    conflict: currentBookings >= schedule.capacity,
    currentBookings,
    capacity: schedule.capacity,
  }
}

export function checkVenueCapacityConflict(
  courseId: string,
  datetime: string,
  courses: Course[],
  venues: Venue[],
  bookings: Booking[]
): { conflict: boolean; currentOccupancy: number; capacity: number } {
  const course = courses.find(c => c.id === courseId)
  if (!course) return { conflict: true, currentOccupancy: 0, capacity: 0 }
  const venue = venues.find(v => v.id === course.venueId)
  if (!venue) return { conflict: false, currentOccupancy: 0, capacity: 0 }
  const courseIdsAtVenue = courses.filter(c => c.venueId === venue.id).map(c => c.id)
  const currentOccupancy = bookings.filter(
    b => courseIdsAtVenue.includes(b.courseId) && b.datetime === datetime && b.status === 'confirmed'
  ).length
  return {
    conflict: currentOccupancy >= venue.capacity,
    currentOccupancy,
    capacity: venue.capacity,
  }
}
