export type UserRole = 'consultant' | 'coach' | 'member' | 'finance'

export interface Member {
  id: string
  name: string
  phone: string
  role: UserRole
  familyGroupId?: string
  corporateId?: string
  storeId?: string
  createdAt: string
}

export interface PackageType {
  id: string
  name: string
  sessionCount: number
  durationDays: number
  isGift: boolean
  courseLevelIds: string[]
  allowShare: boolean
  allowTransfer: boolean
  refundRule: 'none' | 'proportional' | 'full'
}

export interface Package {
  id: string
  memberId: string
  packageTypeId: string
  totalSessions: number
  expireDate: string
  freezeStart?: string
  freezeEnd?: string
  isShared: boolean
  sharedFromMemberId?: string
  sharedQuota: number
  isGift: boolean
  transferRule: 'none' | 'allowed' | 'approval'
  refundRule: 'none' | 'proportional' | 'full'
  courseLevelIds: string[]
  createdAt: string
  status: 'active' | 'frozen' | 'expired' | 'transferred' | 'refunded'
}

export type TransactionType = 'POSITIVE' | 'REVERSAL' | 'COMPENSATION' | 'CLOSING' | 'ADJUSTMENT'

export interface Transaction {
  id: string
  packageId: string
  bookingId?: string
  type: TransactionType
  amount: number
  description: string
  createdAt: string
  closingSnapshotId?: string
  isSharedDeduction?: boolean
  sharedFromMemberId?: string
  operatorId?: string
}

export interface Coach {
  id: string
  name: string
  phone: string
  storeId: string
  commissionRate: number
  specialties: string[]
  createdAt: string
}

export interface Schedule {
  id: string
  coachId: string
  weekday: number
  startTime: string
  endTime: string
  capacity: number
  effectiveFrom: string
  effectiveTo?: string
}

export interface LeaveRecord {
  id: string
  coachId: string
  startDate: string
  endDate: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export type BookingStatus = 'confirmed' | 'waitlisted' | 'cancelled' | 'completed' | 'no_show'

export interface Booking {
  id: string
  memberId: string
  coachId: string
  courseId: string
  packageId: string
  datetime: string
  duration: number
  status: BookingStatus
  waitlistPosition?: number
  cancelReason?: string
  cancelledAt?: string
  createdAt: string
  storeId: string
}

export interface Course {
  id: string
  name: string
  levelId: string
  venueId: string
  storeId: string
  duration: number
  description: string
}

export interface CourseLevel {
  id: string
  name: string
  code: string
  color: string
}

export interface Venue {
  id: string
  name: string
  storeId: string
  capacity: number
}

export interface Store {
  id: string
  name: string
  address: string
  crossStoreBooking: boolean
}

export interface ClosingSnapshot {
  id: string
  period: string
  createdAt: string
  isLocked: boolean
  snapshotData: Record<string, number>
}

export interface FamilyGroup {
  id: string
  primaryMemberId: string
  memberIds: string[]
  sharedPackageId?: string
  sharedQuota: number
}

export interface CorporateAccount {
  id: string
  companyName: string
  contactPerson: string
  totalQuota: number
  usedQuota: number
  memberIds: string[]
}

export interface TransferRequest {
  id: string
  packageId: string
  fromMemberId: string
  toMemberId: string
  status: 'pending' | 'approved' | 'rejected'
  reason: string
  createdAt: string
  processedAt?: string
}

export interface RefundRequest {
  id: string
  packageId: string
  memberId: string
  remainingSessions: number
  refundAmount: number
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  createdAt: string
  processedAt?: string
}

export interface AdjustmentOrder {
  id: string
  closingSnapshotId: string
  reason: string
  adjustmentData: { packageId: string; amount: number }[]
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

export interface AuditLog {
  id: string
  operatorId: string
  operatorRole: UserRole
  action: string
  targetType: string
  targetId: string
  beforeData?: string
  afterData?: string
  createdAt: string
}

export interface SimulationResult {
  matchedPackages: {
    packageId: string
    packageTypeName: string
    expireDate: string
    currentBalance: number
    deductionAmount: number
    afterBalance: number
    isGift: boolean
  }[]
  totalDeduction: number
  canDeduct: boolean
  reason?: string
  beforeSnapshot: Record<string, number>
  afterSnapshot: Record<string, number>
}

export interface ReconciliationDiff {
  packageId: string
  memberId: string
  memberName: string
  snapshotBalance: number
  replayBalance: number
  difference: number
}
