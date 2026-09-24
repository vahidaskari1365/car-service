// ─── سامانه جامع مدیریت مجموعه خودرویی — مدل داده ───

export type VehicleStatus =
  | 'in_stock'        // در انبار/نمایشگاه
  | 'preparing'       // در حال آماده‌سازی
  | 'reserved'        // رزرو شده
  | 'sold'            // فروخته شده
  | 'rented'          // اجاره داده شده
  | 'in_repair';      // در تعمیرگاه

export type VehicleCategory = 'showroom' | 'rental_fleet' | 'service';

export interface VehicleCost {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: 'purchase_extra' | 'repair' | 'preparation' | 'documentation' | 'other';
}

export interface Vehicle {
  id: string;
  vin: string;
  plate?: string;
  brand: string;         // پژو، سایپا، ایران‌خودرو ...
  model: string;         // ۲۰۷ اتومات، پراید ۱۳۱ ...
  year: number;          // سال شمسی
  color: string;
  mileage: number;       // کیلومتر
  category: VehicleCategory;
  status: VehicleStatus;
  location: string;      // محل فعلی
  purchasePrice: number;
  purchaseDate: string;
  salePrice?: number;
  saleDate?: string;
  customerName?: string; // خریدار فعلی / مالک
  preparationStatus: 'none' | 'in_progress' | 'done';
  costs: VehicleCost[];
  insuranceExpiry?: string;   // تاریخ انقضای بیمه‌نامه (ISO)
  inspectionExpiry?: string;  // تاریخ انقضای معاینه فنی (ISO)
  notes?: string;
  createdAt: string;
}

export type CustomerSegment = 'vip' | 'loyal' | 'regular' | 'new' | 'prospect';

export interface FollowUp {
  id: string;
  title: string;
  dueDate: string;
  done: boolean;
  note?: string;
}

export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationalId?: string;
  type: 'individual' | 'company';
  segment: CustomerSegment;
  city?: string;
  address?: string;
  email?: string;
  birthYear?: number;
  tags: string[];
  followUps: FollowUp[];
  notes?: string;
  createdAt: string;
}

export type DealStatus = 'draft' | 'negotiating' | 'contracted' | 'delivered' | 'cancelled';

export interface Deal {
  id: string;
  code: string;
  vehicleId: string;
  customerId: string;
  type: 'purchase' | 'sale';      // خرید از مشتری / فروش به مشتری
  price: number;
  commission: number;
  agentId: string;                // کارشناس فروش
  status: DealStatus;
  date: string;
  deliveryDate?: string;
  notes?: string;
}

export type WorkOrderStatus =
  | 'received'            // پذیرش
  | 'diagnosis'           // کارشناسی
  | 'awaiting_approval'   // در انتظار تأیید مشتری
  | 'in_repair'           // در حال تعمیر
  | 'quality_control'     // کنترل کیفیت
  | 'ready'               // آماده تحویل
  | 'delivered';          // تحویل شده

export interface WorkOrderPart {
  partId: string;
  qty: number;
  unitPrice: number;
}

export interface WorkOrderLog {
  at: string;
  by: string;
  action: string;
  note?: string;
}

export interface WorkOrder {
  id: string;
  code: string;
  vehicleId: string;
  customerId?: string;
  type: 'mechanic' | 'body_paint' | 'inspection' | 'preparation' | 'electrical';
  status: WorkOrderStatus;
  complaint: string;         // شرح مشکل از زبان مشتری
  diagnosis?: string;
  technicianId?: string;
  receivedAt: string;
  completedAt?: string;
  laborHours: number;
  laborRate: number;         // نرخ ساعات کار
  parts: WorkOrderPart[];
  qualityCheck?: { done: boolean; by?: string; passed?: boolean; notes?: string };
  logs: WorkOrderLog[];
}

export type RentalStatus = 'reserved' | 'active' | 'returned' | 'overdue' | 'cancelled';

export interface Rental {
  id: string;
  code: string;
  vehicleId: string;
  customerId: string;
  status: RentalStatus;
  startDate: string;
  endDate: string;
  actualReturnDate?: string;
  dailyRate: number;
  deposit: number;
  mileageOut: number;
  mileageIn?: number;
  fuelOut: 'full' | 'half' | 'empty';
  fuelIn?: 'full' | 'half' | 'empty';
  damages: { id: string; title: string; amount: number }[];
  fines: { id: string; title: string; amount: number }[];
  paidAmount: number;
  notes?: string;
}

export type InstallmentStatus =
  | 'applied' | 'credit_check' | 'approved' | 'contracted'
  | 'active' | 'completed' | 'rejected' | 'defaulted';

export interface InstallmentRow {
  no: number;
  dueDate: string;
  amount: number;
  paidDate?: string;
  status: 'pending' | 'paid' | 'late';
}

export interface InstallmentContract {
  id: string;
  code: string;
  customerId: string;
  vehicleId: string;
  vehiclePrice: number;
  downPayment: number;
  months: number;
  monthlyPayment: number;
  interestRate: number;      // درصد سود سالانه
  guarantor?: string;
  creditScore?: number;      // 0..100
  status: InstallmentStatus;
  startDate: string;
  schedule: InstallmentRow[];
  notes?: string;
}

export interface PartMovement {
  id: string;
  type: 'in' | 'out';
  qty: number;
  date: string;
  ref?: string;              // شماره سفارش/کارشناسیه
  note?: string;
}

export interface Part {
  id: string;
  code: string;
  name: string;
  category: string;          // موتور، جلوبندی، برق، بدنه، مصرفی ...
  compatibleModels: string[];
  quantity: number;
  minQuantity: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  shelf: string;             // محل نگهداری
  movements: PartMovement[];
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  city?: string;
  categories: string[];
  rating: number;            // 1..5
  balance: number;           // مانده حساب
  notes?: string;
}

export interface Quote {
  supplierId: string;
  price: number;
  leadDays: number;
}

export interface PurchaseApproval {
  by: string;
  at: string;
  decision: 'approved' | 'rejected';
  note?: string;
}

export type PurchaseStatus =
  | 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received' | 'paid';

export interface PurchaseRequest {
  id: string;
  code: string;
  requesterId: string;
  supplierId?: string;
  items: { name: string; partId?: string; qty: number; estimatedPrice: number }[];
  status: PurchaseStatus;
  quotes: Quote[];
  approvals: PurchaseApproval[];
  createdAt: string;
  notes?: string;
}

export type ProcessStageStatus = 'pending' | 'in_progress' | 'done' | 'rejected';

export interface ProcessStage {
  name: string;
  responsible: string;       // نام مسئول
  status: ProcessStageStatus;
  startedAt?: string;
  completedAt?: string;
  logs: WorkOrderLog[];
}

export interface WorkflowProcess {
  id: string;
  code: string;
  type: 'purchase' | 'repair' | 'sale' | 'rental' | 'custom';
  title: string;
  relatedRef?: string;
  currentStageIndex: number;
  stages: ProcessStage[];
  createdBy: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;          // فروش خودرو، اجاره، تعمیرات، خرید قطعات، حقوق ...
  amount: number;
  date: string;
  division: string;          // نمایشگاه، تعمیرگاه، اجاره، اقساط، اداری
  description: string;
  refId?: string;
  method: 'cash' | 'card' | 'transfer' | 'cheque';
}

export interface ActivityLog {
  id: string;
  at: string;
  by: string;
  module: string;
  action: string;
  details?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  division: string;
  phone: string;
  active: boolean;
}

// ─── کاربران سامانه و دسترسی‌ها ───
export type UserRole = 'admin' | 'manager' | 'accountant' | 'workshop' | 'sales' | 'rental';

export interface UserPerm {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface AppUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  permissions: Record<string, UserPerm>;   // کلید = شناسه ماژول ناوبری
  createdAt: string;
}

export interface ERPData {
  vehicles: Vehicle[];
  customers: Customer[];
  deals: Deal[];
  workOrders: WorkOrder[];
  rentals: Rental[];
  installments: InstallmentContract[];
  parts: Part[];
  suppliers: Supplier[];
  purchaseRequests: PurchaseRequest[];
  processes: WorkflowProcess[];
  transactions: Transaction[];
  activityLogs: ActivityLog[];
  employees: Employee[];
  users: AppUser[];
  flows: FlowDef[];
}

// ─── طراح گرافیکی فرآیندها (n8n-style) ───
export type FlowNodeKind =
  | 'trigger'     // رویداد شروع
  | 'task'        // عملیات
  | 'condition'   // شرط / انشعاب
  | 'approval'    // تأیید مدیر
  | 'notify'      // اطلاع‌رسانی
  | 'delay'       // انتظار / تأخیر
  | 'end';        // پایان

export type FlowNodeState = 'idle' | 'running' | 'success' | 'error' | 'skipped';

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  config: Record<string, string>;
  x: number;               // موقعیت روی بوم
  y: number;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  label?: string;          // برای نود شرط: بله / خیر
}

export interface FlowDef {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  createdBy?: string;
  createdAt: string;
  lastTestAt?: string;
  lastTestOk?: boolean;
}
