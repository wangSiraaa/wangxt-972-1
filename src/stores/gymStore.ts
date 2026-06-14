import { create } from 'zustand'
import type {
  Member, Package, PackageType, Coach, Schedule, LeaveRecord,
  Booking, Course, CourseLevel, Venue, Store, Transaction,
  ClosingSnapshot, FamilyGroup, CorporateAccount, TransferRequest,
  RefundRequest, AdjustmentOrder, AuditLog, UserRole
} from '@/types'
import { load, save, generateId, clearAll } from '@/lib/storage'
import { createPositiveTransaction, createReversalTransaction, createCompensationTransaction, createAdjustmentTransaction, createSubstitutionTransactions, createComplaintTransactions, createBatchRescheduleTransactions, matchPackagesForDeduction, simulateDeduction } from '@/engines/transactionEngine'
import { getAvailableBalance, calculateBalance } from '@/engines/balanceEngine'
import { checkMemberTimeConflict, checkCoachCapacityConflict, checkVenueCapacityConflict } from '@/engines/conflictEngine'
import { isCoachOnLeave, getBookingsAffectedByLeave, canSubstituteCoach, createSubstitution, canFileComplaint, createComplaintRecord, canBatchReschedule, createBatchRescheduleRecord } from '@/engines/scheduleEngine'
import { createClosingSnapshot, reconcileClosingSnapshot, generateClosingDiffReport } from '@/engines/closingEngine'

interface GymStore {
  currentUser: Member | null
  members: Member[]
  packages: Package[]
  packageTypes: PackageType[]
  coaches: Coach[]
  schedules: Schedule[]
  leaveRecords: LeaveRecord[]
  bookings: Booking[]
  courses: Course[]
  courseLevels: CourseLevel[]
  venues: Venue[]
  stores: Store[]
  transactions: Transaction[]
  closingSnapshots: ClosingSnapshot[]
  familyGroups: FamilyGroup[]
  corporateAccounts: CorporateAccount[]
  transferRequests: TransferRequest[]
  refundRequests: RefundRequest[]
  adjustmentOrders: AdjustmentOrder[]
  auditLogs: AuditLog[]

  login: (memberId: string) => void
  logout: () => void
  initDemoData: () => void
  resetData: () => void

  addMember: (m: Omit<Member, 'id' | 'createdAt'>) => Member
  updateMember: (id: string, data: Partial<Member>) => void

  addPackage: (p: Omit<Package, 'id' | 'createdAt' | 'status'>) => Package
  freezePackage: (id: string, freezeStart: string, freezeEnd: string) => void
  unfreezePackage: (id: string) => void

  createBooking: (memberId: string, coachId: string, courseId: string, datetime: string, storeId: string) => { success: boolean; booking?: Booking; error?: string; simulation?: ReturnType<typeof simulateDeduction> }
  cancelBooking: (bookingId: string, reason: string, afterStart: boolean) => { success: boolean; error?: string; requiresAdjustment?: boolean; lockedPeriod?: string }
  confirmWaitlist: (bookingId: string) => void
  isPeriodClosed: (period: string) => boolean
  isBookingLocked: (bookingId: string) => { locked: boolean; period?: string }

  approveLeave: (leaveId: string) => void
  rejectLeave: (leaveId: string) => void
  createLeave: (coachId: string, startDate: string, endDate: string, reason: string) => LeaveRecord

  approveTransfer: (id: string) => void
  rejectTransfer: (id: string) => void
  createTransferRequest: (packageId: string, fromMemberId: string, toMemberId: string, reason: string) => TransferRequest

  approveRefund: (id: string) => void
  createRefundRequest: (packageId: string, memberId: string, refundAmount: number) => RefundRequest

  executeClosing: (period: string) => ClosingSnapshot
  createAdjustment: (closingSnapshotId: string, reason: string, adjustments: { packageId: string; amount: number }[]) => void
  getReconciliationDiffs: (snapshotId: string) => ReturnType<typeof reconcileClosingSnapshot>

  simulateDeductionForBooking: (memberId: string, courseId: string, storeId: string) => ReturnType<typeof simulateDeduction>

  substituteCoach: (bookingId: string, substituteCoachId: string, reason: string) => { success: boolean; error?: string }
  fileComplaint: (bookingId: string, reason: string, refundSessions: number, description?: string) => { success: boolean; error?: string }
  processComplaint: (complaintId: string, approved: boolean, operatorId?: string) => void
  batchReschedule: (coachId: string, fromDate: string, toDate: string, reason: string) => { success: boolean; affectedCount?: number; error?: string }
  getClosingDiffReport: (snapshotId: string) => ReturnType<typeof import('@/engines/closingEngine').generateClosingDiffReport> | null

  addAuditLog: (action: string, targetType: string, targetId: string, beforeData?: string, afterData?: string) => void
  getPackageBalance: (packageId: string) => number
  getMemberPackages: (memberId: string) => Package[]
  getCoachBookings: (coachId: string, date?: string) => Booking[]
  getCoachCommission: (coachId: string, month: string) => number
}

function today(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

function futureDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const DEMO_PACKAGE_TYPES: PackageType[] = [
  { id: 'pt1', name: '私教基础课包(10次)', sessionCount: 10, durationDays: 90, isGift: false, courseLevelIds: ['lv1', 'lv2'], allowShare: true, allowTransfer: true, refundRule: 'proportional' },
  { id: 'pt2', name: '私教进阶课包(20次)', sessionCount: 20, durationDays: 180, isGift: false, courseLevelIds: ['lv2', 'lv3'], allowShare: true, allowTransfer: true, refundRule: 'proportional' },
  { id: 'pt3', name: '私教尊享课包(50次)', sessionCount: 50, durationDays: 365, isGift: false, courseLevelIds: ['lv1', 'lv2', 'lv3'], allowShare: true, allowTransfer: true, refundRule: 'full' },
  { id: 'pt4', name: '赠课(5次)', sessionCount: 5, durationDays: 60, isGift: true, courseLevelIds: ['lv1', 'lv2'], allowShare: false, allowTransfer: false, refundRule: 'none' },
]

const DEMO_COURSE_LEVELS: CourseLevel[] = [
  { id: 'lv1', name: '基础', code: 'BASIC', color: '#4ADE80' },
  { id: 'lv2', name: '进阶', code: 'INTERMEDIATE', color: '#FBBF24' },
  { id: 'lv3', name: '高阶', code: 'ADVANCED', color: '#F87171' },
]

const DEMO_STORES: Store[] = [
  { id: 'store1', name: '国贸旗舰店', address: '国贸中心B1层', crossStoreBooking: true },
  { id: 'store2', name: '望京店', address: '望京SOHO T3', crossStoreBooking: true },
]

const DEMO_VENUES: Venue[] = [
  { id: 'v1', name: 'A训练区', storeId: 'store1', capacity: 8 },
  { id: 'v2', name: 'B训练区', storeId: 'store1', capacity: 6 },
  { id: 'v3', name: '综合训练区', storeId: 'store2', capacity: 10 },
]

const DEMO_COACHES: Coach[] = [
  { id: 'coach1', name: '张教练', phone: '1380001', storeId: 'store1', commissionRate: 0.3, specialties: ['力量训练', '体能'], createdAt: '2025-01-01' },
  { id: 'coach2', name: '李教练', phone: '1380002', storeId: 'store1', commissionRate: 0.35, specialties: ['瑜伽', '拉伸'], createdAt: '2025-01-01' },
  { id: 'coach3', name: '王教练', phone: '1380003', storeId: 'store2', commissionRate: 0.25, specialties: ['拳击', 'HIIT'], createdAt: '2025-01-01' },
]

const DEMO_COURSES: Course[] = [
  { id: 'c1', name: '力量基础训练', levelId: 'lv1', venueId: 'v1', storeId: 'store1', duration: 60, description: '适合初学者的力量训练课程' },
  { id: 'c2', name: 'HIIT燃脂', levelId: 'lv2', venueId: 'v1', storeId: 'store1', duration: 45, description: '高强度间歇训练' },
  { id: 'c3', name: '高级体能突破', levelId: 'lv3', venueId: 'v2', storeId: 'store1', duration: 90, description: '进阶体能挑战课程' },
  { id: 'c4', name: '瑜伽放松', levelId: 'lv1', venueId: 'v3', storeId: 'store2', duration: 60, description: '身心放松瑜伽课程' },
  { id: 'c5', name: '拳击实战', levelId: 'lv3', venueId: 'v3', storeId: 'store2', duration: 75, description: '拳击技巧与实战训练' },
]

const DEMO_MEMBERS: Member[] = [
  { id: 'm1', name: '赵会员', phone: '1390001', role: 'member', createdAt: '2025-03-01', storeId: 'store1', familyGroupId: 'fg1' },
  { id: 'm2', name: '钱会员', phone: '1390002', role: 'member', createdAt: '2025-03-15', storeId: 'store1', familyGroupId: 'fg1', corporateId: 'corp1' },
  { id: 'm3', name: '孙会员', phone: '1390003', role: 'member', createdAt: '2025-04-01', storeId: 'store2' },
  { id: 'm4', name: '李会员', phone: '1390004', role: 'member', createdAt: '2025-04-10', storeId: 'store1' },
  { id: 'cons1', name: '周顾问', phone: '1370001', role: 'consultant', createdAt: '2025-01-01' },
  { id: 'fin1', name: '吴财务', phone: '1370002', role: 'finance', createdAt: '2025-01-01' },
]

const DEMO_PACKAGES: Package[] = [
  { id: 'pkg1', memberId: 'm1', packageTypeId: 'pt1', totalSessions: 10, expireDate: futureDate(30), isShared: true, sharedQuota: 3, isGift: false, isCompensation: false, isCorporate: false, storeIds: ['store1', 'store2'], transferRule: 'allowed', refundRule: 'proportional', courseLevelIds: ['lv1', 'lv2'], createdAt: '2025-06-01', status: 'active' },
  { id: 'pkg2', memberId: 'm1', packageTypeId: 'pt4', totalSessions: 5, expireDate: futureDate(15), isShared: false, sharedQuota: 0, isGift: true, isCompensation: false, isCorporate: false, storeIds: ['store1'], transferRule: 'none', refundRule: 'none', courseLevelIds: ['lv1', 'lv2'], createdAt: '2025-06-05', status: 'active' },
  { id: 'pkg3', memberId: 'm2', packageTypeId: 'pt2', totalSessions: 20, expireDate: futureDate(60), isShared: false, sharedQuota: 0, isGift: false, isCompensation: false, isCorporate: true, storeIds: ['store1', 'store2'], transferRule: 'approval', refundRule: 'proportional', courseLevelIds: ['lv2', 'lv3'], createdAt: '2025-05-20', status: 'active' },
  { id: 'pkg4', memberId: 'm3', packageTypeId: 'pt3', totalSessions: 50, expireDate: futureDate(180), isShared: false, sharedQuota: 0, isGift: false, isCompensation: false, isCorporate: false, storeIds: ['store1', 'store2'], transferRule: 'allowed', refundRule: 'full', courseLevelIds: ['lv1', 'lv2', 'lv3'], createdAt: '2025-04-01', status: 'active' },
  { id: 'pkg5', memberId: 'm4', packageTypeId: 'pt1', totalSessions: 10, expireDate: futureDate(-5), isShared: false, sharedQuota: 0, isGift: false, isCompensation: false, isCorporate: false, storeIds: ['store2'], transferRule: 'allowed', refundRule: 'proportional', courseLevelIds: ['lv1', 'lv2'], createdAt: '2025-03-01', status: 'expired' },
  { id: 'pkg6', memberId: 'm4', packageTypeId: 'pt2', totalSessions: 20, expireDate: futureDate(90), isShared: false, sharedQuota: 0, isGift: false, isCompensation: true, isCorporate: false, storeIds: ['store2'], transferRule: 'allowed', refundRule: 'proportional', courseLevelIds: ['lv2', 'lv3'], createdAt: '2025-06-10', status: 'active', freezeStart: futureDate(-3), freezeEnd: futureDate(7) },
]

const DEMO_TRANSACTIONS: Transaction[] = [
  { id: 'tx1', packageId: 'pkg1', type: 'POSITIVE', amount: 10, description: '购买私教基础课包', createdAt: '2025-06-01T10:00:00' },
  { id: 'tx2', packageId: 'pkg1', bookingId: 'b1', type: 'POSITIVE', amount: -1, description: '预约:力量基础训练', createdAt: '2025-06-05T14:00:00' },
  { id: 'tx3', packageId: 'pkg1', bookingId: 'b2', type: 'POSITIVE', amount: -1, description: '预约:HIIT燃脂', createdAt: '2025-06-08T09:00:00' },
  { id: 'tx4', packageId: 'pkg2', type: 'POSITIVE', amount: 5, description: '获赠5次课', createdAt: '2025-06-05T10:00:00' },
  { id: 'tx5', packageId: 'pkg2', bookingId: 'b3', type: 'POSITIVE', amount: -1, description: '预约:力量基础训练(赠课)', createdAt: '2025-06-10T14:00:00' },
  { id: 'tx6', packageId: 'pkg3', type: 'POSITIVE', amount: 20, description: '购买私教进阶课包', createdAt: '2025-05-20T10:00:00' },
  { id: 'tx7', packageId: 'pkg4', type: 'POSITIVE', amount: 50, description: '购买私教尊享课包', createdAt: '2025-04-01T10:00:00' },
  { id: 'tx8', packageId: 'pkg4', bookingId: 'b4', type: 'POSITIVE', amount: -2, description: '预约:高级体能突破', createdAt: '2025-05-15T10:00:00' },
  { id: 'tx9', packageId: 'pkg5', type: 'POSITIVE', amount: 10, description: '购买私教基础课包', createdAt: '2025-03-01T10:00:00' },
  { id: 'tx10', packageId: 'pkg5', bookingId: 'b5', type: 'POSITIVE', amount: -3, description: '预约:力量基础训练x3', createdAt: '2025-04-01T10:00:00' },
  { id: 'tx11', packageId: 'pkg6', type: 'POSITIVE', amount: 20, description: '购买私教进阶课包', createdAt: '2025-06-10T10:00:00' },
  { id: 'tx12', packageId: 'pkg1', bookingId: 'b2', type: 'REVERSAL', amount: 1, description: '冲正:取消HIIT燃脂预约', createdAt: '2025-06-09T08:00:00' },
  { id: 'tx13', packageId: 'pkg4', bookingId: 'b6', type: 'COMPENSATION', amount: 1, description: '补偿:教练临时休假释放课时', createdAt: '2025-06-12T10:00:00' },
]

const DEMO_SCHEDULES: Schedule[] = [
  { id: 's1', coachId: 'coach1', weekday: 1, startTime: '09:00', endTime: '12:00', capacity: 3, effectiveFrom: '2025-01-01' },
  { id: 's2', coachId: 'coach1', weekday: 1, startTime: '14:00', endTime: '18:00', capacity: 3, effectiveFrom: '2025-01-01' },
  { id: 's3', coachId: 'coach1', weekday: 3, startTime: '09:00', endTime: '12:00', capacity: 3, effectiveFrom: '2025-01-01' },
  { id: 's4', coachId: 'coach1', weekday: 5, startTime: '14:00', endTime: '18:00', capacity: 2, effectiveFrom: '2025-01-01' },
  { id: 's5', coachId: 'coach2', weekday: 2, startTime: '10:00', endTime: '13:00', capacity: 4, effectiveFrom: '2025-01-01' },
  { id: 's6', coachId: 'coach2', weekday: 4, startTime: '10:00', endTime: '13:00', capacity: 4, effectiveFrom: '2025-01-01' },
  { id: 's7', coachId: 'coach3', weekday: 1, startTime: '09:00', endTime: '17:00', capacity: 5, effectiveFrom: '2025-01-01' },
  { id: 's8', coachId: 'coach3', weekday: 3, startTime: '09:00', endTime: '17:00', capacity: 5, effectiveFrom: '2025-01-01' },
  { id: 's9', coachId: 'coach3', weekday: 5, startTime: '09:00', endTime: '12:00', capacity: 3, effectiveFrom: '2025-01-01' },
]

const DEMO_FAMILY_GROUPS: FamilyGroup[] = [
  { id: 'fg1', primaryMemberId: 'm1', memberIds: ['m1', 'm2'], sharedPackageId: 'pkg1', sharedQuota: 3 },
]

const DEMO_CORPORATE: CorporateAccount[] = [
  { id: 'corp1', companyName: '科技发展有限公司', contactPerson: '张总', totalQuota: 50, usedQuota: 12, memberIds: ['m2'] },
]

const DEMO_LEAVES: LeaveRecord[] = [
  { id: 'lv1', coachId: 'coach1', startDate: futureDate(3), endDate: futureDate(5), reason: '个人事务', status: 'pending', createdAt: new Date().toISOString() },
]

const DEMO_BOOKINGS: Booking[] = [
  { id: 'b1', memberId: 'm1', coachId: 'coach1', courseId: 'c1', packageId: 'pkg1', datetime: '2025-06-05T14:00', duration: 60, status: 'completed', createdAt: '2025-06-05T14:00', storeId: 'store1' },
  { id: 'b2', memberId: 'm1', coachId: 'coach1', courseId: 'c2', packageId: 'pkg1', datetime: '2025-06-08T09:00', duration: 45, status: 'cancelled', cancelReason: '时间冲突', cancelledAt: '2025-06-09T08:00', createdAt: '2025-06-08T09:00', storeId: 'store1' },
  { id: 'b3', memberId: 'm1', coachId: 'coach2', courseId: 'c1', packageId: 'pkg2', datetime: '2025-06-10T14:00', duration: 60, status: 'completed', createdAt: '2025-06-10T14:00', storeId: 'store1' },
  { id: 'b4', memberId: 'm3', coachId: 'coach1', courseId: 'c3', packageId: 'pkg4', datetime: '2025-05-15T10:00', duration: 90, status: 'completed', createdAt: '2025-05-15T10:00', storeId: 'store1' },
  { id: 'b5', memberId: 'm4', coachId: 'coach3', courseId: 'c1', packageId: 'pkg5', datetime: '2025-04-01T10:00', duration: 60, status: 'completed', createdAt: '2025-04-01T10:00', storeId: 'store2' },
  { id: 'b6', memberId: 'm3', coachId: 'coach3', courseId: 'c5', packageId: 'pkg4', datetime: '2025-06-11T10:00', duration: 75, status: 'cancelled', cancelReason: '教练休假', cancelledAt: '2025-06-12T10:00', createdAt: '2025-06-11T10:00', storeId: 'store2' },
  { id: 'b7', memberId: 'm2', coachId: 'coach1', courseId: 'c2', packageId: 'pkg3', datetime: `${today()}T09:00`, duration: 45, status: 'confirmed', createdAt: new Date().toISOString(), storeId: 'store1' },
  { id: 'b8', memberId: 'm3', coachId: 'coach3', courseId: 'c4', packageId: 'pkg4', datetime: `${futureDate(1)}T10:00`, duration: 60, status: 'confirmed', createdAt: new Date().toISOString(), storeId: 'store2' },
]

export const useGymStore = create<GymStore>((set, get) => ({
  currentUser: null,
  members: load('members'),
  packages: load('packages'),
  packageTypes: load('package_types'),
  coaches: load('coaches'),
  schedules: load('schedules'),
  leaveRecords: load('leave_records'),
  bookings: load('bookings'),
  courses: load('courses'),
  courseLevels: load('course_levels'),
  venues: load('venues'),
  stores: load('stores'),
  transactions: load('transactions'),
  closingSnapshots: load('closing_snapshots'),
  familyGroups: load('family_groups'),
  corporateAccounts: load('corporate_accounts'),
  transferRequests: load('transfer_requests'),
  refundRequests: load('refund_requests'),
  adjustmentOrders: load('adjustment_orders'),
  auditLogs: load('audit_logs'),

  login: (memberId: string) => {
    const member = get().members.find(m => m.id === memberId)
    if (member) set({ currentUser: member })
  },

  logout: () => set({ currentUser: null }),

  initDemoData: () => {
    clearAll()
    const data = {
      members: DEMO_MEMBERS,
      packages: DEMO_PACKAGES,
      package_types: DEMO_PACKAGE_TYPES,
      coaches: DEMO_COACHES,
      schedules: DEMO_SCHEDULES,
      leave_records: DEMO_LEAVES,
      bookings: DEMO_BOOKINGS,
      courses: DEMO_COURSES,
      course_levels: DEMO_COURSE_LEVELS,
      venues: DEMO_VENUES,
      stores: DEMO_STORES,
      transactions: DEMO_TRANSACTIONS,
      family_groups: DEMO_FAMILY_GROUPS,
      corporate_accounts: DEMO_CORPORATE,
      closing_snapshots: [],
      transfer_requests: [],
      refund_requests: [],
      adjustment_orders: [],
      audit_logs: [],
    }
    Object.entries(data).forEach(([k, v]) => save(k, v))
    set({
      currentUser: null,
      members: DEMO_MEMBERS,
      packages: DEMO_PACKAGES,
      packageTypes: DEMO_PACKAGE_TYPES,
      coaches: DEMO_COACHES,
      schedules: DEMO_SCHEDULES,
      leaveRecords: DEMO_LEAVES,
      bookings: DEMO_BOOKINGS,
      courses: DEMO_COURSES,
      courseLevels: DEMO_COURSE_LEVELS,
      venues: DEMO_VENUES,
      stores: DEMO_STORES,
      transactions: DEMO_TRANSACTIONS,
      familyGroups: DEMO_FAMILY_GROUPS,
      corporateAccounts: DEMO_CORPORATE,
      closingSnapshots: [],
      transferRequests: [],
      refundRequests: [],
      adjustmentOrders: [],
      auditLogs: [],
    })
  },

  resetData: () => {
    clearAll()
    set({
      currentUser: null,
      members: [], packages: [], packageTypes: [], coaches: [], schedules: [],
      leaveRecords: [], bookings: [], courses: [], courseLevels: [], venues: [],
      stores: [], transactions: [], closingSnapshots: [], familyGroups: [],
      corporateAccounts: [], transferRequests: [], refundRequests: [],
      adjustmentOrders: [], auditLogs: [],
    })
  },

  addMember: (m) => {
    const member: Member = { ...m, id: generateId(), createdAt: new Date().toISOString() }
    const list = [...get().members, member]
    set({ members: list })
    save('members', list)
    get().addAuditLog('CREATE', 'Member', member.id, undefined, JSON.stringify(member))
    return member
  },

  updateMember: (id, data) => {
    const list = get().members.map(m => m.id === id ? { ...m, ...data } : m)
    set({ members: list })
    save('members', list)
  },

  addPackage: (p) => {
    const pkg: Package = { ...p, id: generateId(), createdAt: new Date().toISOString(), status: 'active' }
    const pkgs = [...get().packages, pkg]
    const tx: Transaction = {
      id: generateId(),
      packageId: pkg.id,
      type: 'POSITIVE',
      amount: pkg.totalSessions,
      description: pkg.isGift ? '获赠课时' : '购买课包',
      createdAt: new Date().toISOString(),
    }
    const txs = [...get().transactions, tx]
    set({ packages: pkgs, transactions: txs })
    save('packages', pkgs)
    save('transactions', txs)
    get().addAuditLog('CREATE', 'Package', pkg.id, undefined, JSON.stringify(pkg))
    return pkg
  },

  freezePackage: (id, freezeStart, freezeEnd) => {
    const pkgs = get().packages.map(p => p.id === id ? { ...p, freezeStart, freezeEnd, status: 'frozen' as const } : p)
    set({ packages: pkgs })
    save('packages', pkgs)
    get().addAuditLog('FREEZE', 'Package', id)
  },

  unfreezePackage: (id) => {
    const pkgs = get().packages.map(p => p.id === id ? { ...p, freezeStart: undefined, freezeEnd: undefined, status: 'active' as const } : p)
    const pkg = pkgs.find(p => p.id === id)
    if (pkg?.freezeEnd) {
      const freezeDays = Math.ceil((new Date(pkg.freezeEnd).getTime() - new Date(pkg.freezeStart!).getTime()) / 86400000)
      const newExpire = new Date(pkg.expireDate)
      newExpire.setDate(newExpire.getDate() + freezeDays)
      const updated = pkgs.map(p => p.id === id ? { ...p, expireDate: newExpire.toISOString().slice(0, 10) } : p)
      set({ packages: updated })
      save('packages', updated)
    } else {
      set({ packages: pkgs })
      save('packages', pkgs)
    }
    get().addAuditLog('UNFREEZE', 'Package', id)
  },

  createBooking: (memberId, coachId, courseId, datetime, storeId) => {
    const state = get()
    const course = state.courses.find(c => c.id === courseId)
    if (!course) return { success: false, error: '课程不存在' }

    const timeConflict = checkMemberTimeConflict(memberId, datetime, course.duration, state.bookings)
    if (timeConflict) return { success: false, error: '该时段已有预约，时间冲突' }

    const coachCap = checkCoachCapacityConflict(coachId, datetime, state.schedules, state.bookings)
    if (coachCap.conflict) return { success: false, error: `教练容量已满(${coachCap.currentBookings}/${coachCap.capacity})` }

    const venueCap = checkVenueCapacityConflict(courseId, datetime, state.courses, state.venues, state.bookings)
    if (venueCap.conflict) return { success: false, error: `场地容量已满(${venueCap.currentOccupancy}/${venueCap.capacity})` }

    if (isCoachOnLeave(coachId, datetime.slice(0, 10), state.leaveRecords)) {
      return { success: false, error: '教练该时段休假中' }
    }

    const sim = simulateDeduction(memberId, course.levelId, storeId, state.packages, state.transactions, state.familyGroups, state.packageTypes)
    if (!sim.canDeduct) return { success: false, error: sim.reason ?? '余额不足', simulation: sim }

    const match = matchPackagesForDeduction(memberId, course.levelId, storeId, state.packages, state.transactions, state.familyGroups)
    if (!match.canDeduct || match.matched.length === 0) return { success: false, error: match.reason ?? '无可用课包', simulation: sim }

    const pkg = match.matched[0]
    const booking: Booking = {
      id: generateId(),
      memberId,
      coachId,
      courseId,
      packageId: pkg.id,
      datetime,
      duration: course.duration,
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      storeId,
    }

    const tx = createPositiveTransaction(pkg.id, booking.id, 1, `预约:${course.name}`, state.currentUser?.id)
    const isSharedUse = match.details.find(d => d.package.id === pkg.id)?.isSharedUse
    const sharedFrom = isSharedUse ? pkg.memberId : (pkg.sharedFromMemberId ?? undefined)

    const newBookings = [...state.bookings, booking]
    const newTxs = [...state.transactions, { ...tx, isSharedDeduction: !!isSharedUse, sharedFromMemberId: sharedFrom }]

    set({ bookings: newBookings, transactions: newTxs })
    save('bookings', newBookings)
    save('transactions', newTxs)
    get().addAuditLog('BOOK', 'Booking', booking.id, undefined, JSON.stringify(booking))

    return { success: true, booking, simulation: sim }
  },

  cancelBooking: (bookingId, reason, afterStart) => {
    const state = get()
    const booking = state.bookings.find(b => b.id === bookingId)
    if (!booking) return { success: false, error: '预约不存在' }

    const bookingPeriod = booking.datetime.slice(0, 7)
    if (state.isPeriodClosed(bookingPeriod)) {
      return {
        success: false,
        error: `该预约所属期间(${bookingPeriod})已关账，不能直接取消`,
        requiresAdjustment: true,
        lockedPeriod: bookingPeriod,
      }
    }

    const originalTx = state.transactions.find(t => t.bookingId === bookingId && t.type === 'POSITIVE')
    const newTxs = [...state.transactions]
    if (originalTx) {
      const reversal = afterStart
        ? createCompensationTransaction(originalTx.packageId, bookingId, 1, reason)
        : createReversalTransaction(originalTx, reason)
      newTxs.push(reversal)
    }

    const newBookings = state.bookings.map(b =>
      b.id === bookingId ? { ...b, status: 'cancelled' as const, cancelReason: reason, cancelledAt: new Date().toISOString() } : b
    )

    set({ bookings: newBookings, transactions: newTxs })
    save('bookings', newBookings)
    save('transactions', newTxs)
    get().addAuditLog('CANCEL_BOOKING', 'Booking', bookingId, JSON.stringify(booking), JSON.stringify({ status: 'cancelled', reason }))
    return { success: true }
  },

  confirmWaitlist: (bookingId) => {
    const newBookings = get().bookings.map(b =>
      b.id === bookingId ? { ...b, status: 'confirmed' as const, waitlistPosition: undefined } : b
    )
    set({ bookings: newBookings })
    save('bookings', newBookings)
  },

  isPeriodClosed: (period) => {
    return get().closingSnapshots.some(s => s.period === period && s.isLocked)
  },

  isBookingLocked: (bookingId) => {
    const booking = get().bookings.find(b => b.id === bookingId)
    if (!booking) return { locked: false }
    const period = booking.datetime.slice(0, 7)
    if (get().isPeriodClosed(period)) return { locked: true, period }
    return { locked: false }
  },

  approveLeave: (leaveId) => {
    const state = get()
    const leave = state.leaveRecords.find(l => l.id === leaveId)
    if (!leave) return

    const affected = getBookingsAffectedByLeave(leave.coachId, leave.startDate, leave.endDate, state.bookings)
    const newTxs = [...state.transactions]
    const newBookings = state.bookings.map(b => {
      const aff = affected.find(a => a.id === b.id)
      if (aff) {
        const origTx = newTxs.find(t => t.bookingId === b.id && t.type === 'POSITIVE')
        if (origTx) {
          newTxs.push(createCompensationTransaction(origTx.packageId, b.id, 1, '教练休假自动释放'))
        }
        return { ...b, status: 'cancelled' as const, cancelReason: '教练休假', cancelledAt: new Date().toISOString() }
      }
      return b
    })

    const newLeaves = state.leaveRecords.map(l => l.id === leaveId ? { ...l, status: 'approved' as const } : l)
    set({ leaveRecords: newLeaves, bookings: newBookings, transactions: newTxs })
    save('leave_records', newLeaves)
    save('bookings', newBookings)
    save('transactions', newTxs)
    get().addAuditLog('APPROVE_LEAVE', 'LeaveRecord', leaveId)
  },

  rejectLeave: (leaveId) => {
    const newLeaves = get().leaveRecords.map(l => l.id === leaveId ? { ...l, status: 'rejected' as const } : l)
    set({ leaveRecords: newLeaves })
    save('leave_records', newLeaves)
  },

  createLeave: (coachId, startDate, endDate, reason) => {
    const leave: LeaveRecord = {
      id: generateId(), coachId, startDate, endDate, reason, status: 'pending', createdAt: new Date().toISOString()
    }
    const list = [...get().leaveRecords, leave]
    set({ leaveRecords: list })
    save('leave_records', list)
    return leave
  },

  approveTransfer: (id) => {
    const state = get()
    const req = state.transferRequests.find(r => r.id === id)
    if (!req) return

    const newPkgs = state.packages.map(p => {
      if (p.id === req.packageId) return { ...p, memberId: req.toMemberId, status: 'active' as const }
      return p
    })
    const newReqs = state.transferRequests.map(r => r.id === id ? { ...r, status: 'approved' as const, processedAt: new Date().toISOString() } : r)

    const reversal = createReversalTransaction(
      { id: '', packageId: req.packageId, bookingId: '', type: 'POSITIVE', amount: -(calculateBalance(req.packageId, state.transactions)), description: '', createdAt: '' },
      `转让给${req.toMemberId}`
    )
    const positiveTx: Transaction = {
      id: generateId(), packageId: req.packageId, type: 'POSITIVE' as const, amount: calculateBalance(req.packageId, state.transactions),
      description: `从${req.fromMemberId}转让`, createdAt: new Date().toISOString()
    }

    set({ packages: newPkgs, transferRequests: newReqs, transactions: [...state.transactions, reversal, positiveTx] })
    save('packages', newPkgs)
    save('transfer_requests', newReqs)
  },

  rejectTransfer: (id) => {
    const list = get().transferRequests.map(r => r.id === id ? { ...r, status: 'rejected' as const, processedAt: new Date().toISOString() } : r)
    set({ transferRequests: list })
    save('transfer_requests', list)
  },

  createTransferRequest: (packageId, fromMemberId, toMemberId, reason) => {
    const req: TransferRequest = {
      id: generateId(), packageId, fromMemberId, toMemberId, status: 'pending', reason, createdAt: new Date().toISOString()
    }
    const list = [...get().transferRequests, req]
    set({ transferRequests: list })
    save('transfer_requests', list)
    return req
  },

  approveRefund: (id) => {
    const state = get()
    const req = state.refundRequests.find(r => r.id === id)
    if (!req) return

    const balance = calculateBalance(req.packageId, state.transactions)
    const reversal = createReversalTransaction(
      { id: '', packageId: req.packageId, bookingId: '', type: 'POSITIVE', amount: -balance, description: '', createdAt: '' },
      '退课退款'
    )
    const newTxs = [...state.transactions, reversal]
    const newPkgs = state.packages.map(p => p.id === req.packageId ? { ...p, status: 'refunded' as const } : p)
    const newReqs = state.refundRequests.map(r => r.id === id ? { ...r, status: 'processed' as const, processedAt: new Date().toISOString() } : r)

    set({ packages: newPkgs, transactions: newTxs, refundRequests: newReqs })
    save('packages', newPkgs)
    save('transactions', newTxs)
    save('refund_requests', newReqs)
  },

  createRefundRequest: (packageId, memberId, refundAmount) => {
    const req: RefundRequest = {
      id: generateId(), packageId, memberId, remainingSessions: refundAmount, refundAmount, status: 'pending', createdAt: new Date().toISOString()
    }
    const list = [...get().refundRequests, req]
    set({ refundRequests: list })
    save('refund_requests', list)
    return req
  },

  executeClosing: (period) => {
    const state = get()
    const snapshot = createClosingSnapshot(period, state.packages, state.transactions, state.bookings, state.coaches, state.courses)
    const closingTxs = Object.entries(snapshot.snapshotData).map(([packageId, balance]) => ({
      id: generateId(),
      packageId,
      type: 'CLOSING' as const,
      amount: balance,
      description: `关账快照:${period}`,
      createdAt: new Date().toISOString(),
      closingSnapshotId: snapshot.id,
    }))

    const newSnapshots = [...state.closingSnapshots, snapshot]
    const newTxs = [...state.transactions, ...closingTxs]
    set({ closingSnapshots: newSnapshots, transactions: newTxs })
    save('closing_snapshots', newSnapshots)
    save('transactions', newTxs)
    get().addAuditLog('CLOSING', 'ClosingSnapshot', snapshot.id)
    return snapshot
  },

  createAdjustment: (closingSnapshotId, reason, adjustments) => {
    const state = get()
    const adj: AdjustmentOrder = {
      id: generateId(), closingSnapshotId, reason, adjustmentData: adjustments, status: 'approved', createdAt: new Date().toISOString()
    }
    const newTxs = adjustments.map(a => createAdjustmentTransaction(a.packageId, a.amount, reason, closingSnapshotId))
    set({
      adjustmentOrders: [...state.adjustmentOrders, adj],
      transactions: [...state.transactions, ...newTxs]
    })
    save('adjustment_orders', [...state.adjustmentOrders, adj])
    save('transactions', [...state.transactions, ...newTxs])
  },

  getReconciliationDiffs: (snapshotId) => {
    const state = get()
    const snapshot = state.closingSnapshots.find(s => s.id === snapshotId)
    if (!snapshot) return []
    return reconcileClosingSnapshot(snapshot, state.packages, state.transactions, state.members)
  },

  simulateDeductionForBooking: (memberId, courseId, storeId) => {
    const state = get()
    const course = state.courses.find(c => c.id === courseId)
    if (!course) return { matchedPackages: [], totalDeduction: 0, canDeduct: false, reason: '课程不存在', beforeSnapshot: {}, afterSnapshot: {} }
    return simulateDeduction(memberId, course.levelId, storeId, state.packages, state.transactions, state.familyGroups, state.packageTypes)
  },

  substituteCoach: (bookingId, substituteCoachId, reason) => {
    const state = get()
    const booking = state.bookings.find(b => b.id === bookingId)
    if (!booking) return { success: false, error: '预约不存在' }

    const bookingPeriod = booking.datetime.slice(0, 7)
    if (state.isPeriodClosed(bookingPeriod)) {
      return { success: false, error: `该预约所属期间(${bookingPeriod})已关账，请通过调整单处理` }
    }

    const { canSubstitute, reason: subReason } = canSubstituteCoach(
      booking.coachId, substituteCoachId, booking.datetime, state.bookings, state.schedules
    )
    if (!canSubstitute) return { success: false, error: subReason }

    const originalTx = state.transactions.find(t => t.bookingId === bookingId && t.type === 'POSITIVE' && t.source !== 'substitution')
    const newTxs = [...state.transactions]
    if (originalTx) {
      const subTxs = createSubstitutionTransactions(booking, originalTx.packageId, originalTx.packageId, reason, state.currentUser?.id)
      newTxs.push(...subTxs)
    }

    const { booking: updatedBooking } = createSubstitution(booking, substituteCoachId, reason, state.currentUser?.id)
    const newBookings = state.bookings.map(b => b.id === bookingId ? updatedBooking : b)

    set({ bookings: newBookings, transactions: newTxs })
    save('bookings', newBookings)
    save('transactions', newTxs)
    get().addAuditLog('SUBSTITUTE', 'Booking', bookingId, JSON.stringify(booking), JSON.stringify(updatedBooking))
    return { success: true }
  },

  fileComplaint: (bookingId, reason, refundSessions, description) => {
    const state = get()
    const booking = state.bookings.find(b => b.id === bookingId)
    if (!booking) return { success: false, error: '预约不存在' }

    const { canFile, reason: fileReason } = canFileComplaint(booking, state.closingSnapshots)
    if (!canFile) return { success: false, error: fileReason }

    const complaint = createComplaintRecord(bookingId, booking.memberId, reason, refundSessions, description)
    const complaints = [...(state as any).complaints ?? [], complaint]
    set({ complaints } as any)
    save('complaints', complaints)
    get().addAuditLog('COMPLAINT', 'Booking', bookingId)
    return { success: true }
  },

  processComplaint: (complaintId, approved, operatorId) => {
    const state = get()
    const complaints: any[] = (state as any).complaints ?? []
    const complaint = complaints.find((c: any) => c.id === complaintId)
    if (!complaint) return

    const booking = state.bookings.find(b => b.id === complaint.bookingId)
    if (!booking) return

    if (approved) {
      const originalTx = state.transactions.find(t => t.bookingId === complaint.bookingId && t.type === 'POSITIVE')
      if (originalTx) {
        const compTx = createCompensationTransaction(
          originalTx.packageId, complaint.bookingId, complaint.refundSessions,
          complaint.reason, 'complaint', operatorId
        )
        const newTxs = [...state.transactions, compTx]
        set({ transactions: newTxs })
        save('transactions', newTxs)
      }
    }

    const updatedComplaints = complaints.map((c: any) =>
      c.id === complaintId ? { ...c, status: approved ? 'approved' : 'rejected', processedAt: new Date().toISOString(), processedBy: operatorId } : c
    )
    set({ complaints: updatedComplaints } as any)
    save('complaints', updatedComplaints)
  },

  batchReschedule: (coachId, fromDate, toDate, reason) => {
    const state = get()
    const { canBatch, affectedBookings, lockedBookings, reason: batchReason } = canBatchReschedule(
      coachId, fromDate, toDate, state.bookings, state.closingSnapshots
    )

    if (!canBatch && lockedBookings.length > 0) {
      return { success: false, error: batchReason }
    }

    const { txs, successCount, failCount } = createBatchRescheduleTransactions(
      affectedBookings, state.packages, state.transactions, reason, state.currentUser?.id
    )

    const batchRecord = createBatchRescheduleRecord(
      coachId, fromDate, toDate, reason, affectedBookings.map(b => b.id), state.currentUser?.id
    )
    batchRecord.successCount = successCount
    batchRecord.failCount = failCount
    batchRecord.status = 'completed'

    const newBookings = state.bookings.map(b => {
      const affected = affectedBookings.find(a => a.id === b.id)
      if (affected) {
        return { ...b, status: 'cancelled' as const, cancelReason: `批量改课: ${reason}`, cancelledAt: new Date().toISOString() }
      }
      return b
    })

    const newTxs = [...state.transactions, ...txs]
    const batchRecords: any[] = [...(state as any).batchReschedules ?? [], batchRecord]

    set({ bookings: newBookings, transactions: newTxs, batchReschedules: batchRecords } as any)
    save('bookings', newBookings)
    save('transactions', newTxs)
    save('batch_reschedules', batchRecords)
    get().addAuditLog('BATCH_RESCHEDULE', 'Coach', coachId)

    return { success: true, affectedCount: successCount }
  },

  getClosingDiffReport: (snapshotId) => {
    const state = get()
    const snapshot = state.closingSnapshots.find(s => s.id === snapshotId)
    if (!snapshot) return null
    return generateClosingDiffReport(
      snapshot, state.packages, state.transactions, state.members,
      state.coaches, state.bookings, state.courses, state.adjustmentOrders
    )
  },

  addAuditLog: (action, targetType, targetId, beforeData, afterData) => {
    const log: AuditLog = {
      id: generateId(),
      operatorId: get().currentUser?.id ?? 'system',
      operatorRole: get().currentUser?.role ?? 'consultant',
      action,
      targetType,
      targetId,
      beforeData,
      afterData,
      createdAt: new Date().toISOString(),
    }
    const logs = [...get().auditLogs, log]
    set({ auditLogs: logs })
    save('audit_logs', logs)
  },

  getPackageBalance: (packageId) => calculateBalance(packageId, get().transactions),

  getMemberPackages: (memberId) => get().packages.filter(p => p.memberId === memberId),

  getCoachBookings: (coachId, date) => {
    const bookings = get().bookings.filter(b => b.coachId === coachId && b.status !== 'cancelled')
    if (date) return bookings.filter(b => b.datetime.startsWith(date))
    return bookings
  },

  getCoachCommission: (coachId, month) => {
    const coach = get().coaches.find(c => c.id === coachId)
    if (!coach) return 0
    const monthBookings = get().bookings.filter(b => b.coachId === coachId && b.datetime.startsWith(month) && b.status === 'completed')
    return monthBookings.length * coach.commissionRate * 200
  },
}))
