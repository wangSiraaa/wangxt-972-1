import type { Schedule, Booking, LeaveRecord, Venue } from '@/types'

export function getCoachAvailableCapacity(
  coachId: string,
  weekday: number,
  startTime: string,
  bookings: Booking[]
): number {
  const confirmedCount = bookings.filter(
    b => b.coachId === coachId && b.status === 'confirmed' && b.datetime.includes(startTime)
  ).length
  return confirmedCount
}

export function getVenueOccupancy(
  venueId: string,
  datetime: string,
  bookings: Booking[],
  courses: { id: string; venueId: string }[]
): { occupied: number; capacity: number } {
  const courseIdsAtVenue = courses.filter(c => c.venueId === venueId).map(c => c.id)
  const occupied = bookings.filter(
    b => courseIdsAtVenue.includes(b.courseId) && b.datetime === datetime && b.status === 'confirmed'
  ).length
  return { occupied, capacity: 0 }
}

export function isCoachOnLeave(
  coachId: string,
  date: string,
  leaveRecords: LeaveRecord[]
): boolean {
  return leaveRecords.some(
    lr =>
      lr.coachId === coachId &&
      lr.status === 'approved' &&
      date >= lr.startDate &&
      date <= lr.endDate
  )
}

export function getBookingsAffectedByLeave(
  coachId: string,
  startDate: string,
  endDate: string,
  bookings: Booking[]
): Booking[] {
  return bookings.filter(
    b =>
      b.coachId === coachId &&
      b.status === 'confirmed' &&
      b.datetime.slice(0, 10) >= startDate &&
      b.datetime.slice(0, 10) <= endDate
  )
}

export function getScheduleForCoachAndDay(
  coachId: string,
  weekday: number,
  schedules: Schedule[]
): Schedule[] {
  return schedules.filter(s => s.coachId === coachId && s.weekday === weekday)
}
