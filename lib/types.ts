// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // stored as plain-text for demo
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AuthSession {
  userId: string;
  role: UserRole;
}

// ─── Sites ────────────────────────────────────────────────────────────────────
export interface SiteContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string; // e.g. "Site Manager", "Head of H&S"
  isPrimary: boolean;
}

export interface Site {
  id: string;
  simproId?: string;
  name: string;
  address: string;
  city: string;
  postcode: string;
  region: string;
  // Legacy single-contact fields (kept for backwards compatibility)
  primaryContact: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  // Multiple contacts support
  contacts?: SiteContact[];
  status: "active" | "inactive";
  condition?: "good" | "fair" | "poor" | "critical";
  createdAt: string;
  syncedFromSimpro?: boolean;
  attachments?: SiteAttachment[];
}

// ─── Asset Types (catalogue level) ────────────────────────────────────────────
export interface AssetType {
  id: string;
  name: string;
  code: string;
  description: string;
  testingIntervalMonths: number; // how often it should be tested
  createdAt: string;
}

// ─── Asset Instances (physical asset at a site) ───────────────────────────────
export interface AssetInstance {
  id: string;
  assetTypeId: string;
  siteId: string;
  serialNumber: string;
  location: string; // e.g. "Ground Floor Corridor"
  installDate: string;
  nextTestDue: string;
  lastTestDate?: string;
  lastTestResult?: "pass" | "fail" | "pending";
  notes?: string;
  createdAt: string;
}

// ─── Asset Tests ──────────────────────────────────────────────────────────────
export type TestResult = "pass" | "fail" | "pending";

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // bytes
  dataUrl: string; // base64 data URL (simulated upload)
  uploadedAt: string;
}

export interface AssetTest {
  id: string;
  assetInstanceId: string;
  testedBy: string;
  testedByUserId: string;
  testDate: string;
  result: TestResult;
  notes: string;
  failureReasons?: string[];
  attachments: Attachment[];
  certificateNumber?: string;
  nextTestDate: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Reactive Jobs (unplanned maintenance) ─────────────────────────────────────
export type ReactiveJobStatus = "open" | "in-progress" | "completed" | "cancelled";
export type ReactiveJobPriority = "low" | "medium" | "high" | "urgent";
export type ReactiveJobSource = "portal" | "manual";

export interface ReactiveJob {
  id: string;
  siteId: string;
  title: string;
  description: string;
  priority: ReactiveJobPriority;
  status: ReactiveJobStatus;
  source: ReactiveJobSource; // "portal" = submitted via public form, "manual" = created by admin
  createdBy: string;
  createdByUserId: string;
  // Intake / submitter details (populated when source = "portal")
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  assignedCompanyId?: string; // supply chain company id
  notes?: string;
  attachments: Attachment[];
  completedAt?: string;
  closeNotes?: string; // notes added when closing via public link
  createdAt: string;
  updatedAt: string;
}

// ─── Supply Chain ─────────────────────────────────────────────────────────────
export interface SupplyChainCompany {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  postcode: string;
  specialisms: string[]; // e.g. ["LOLER", "Fire Safety", "PAT Testing"]
  insuranceExpiryDate: string; // ISO date string
  status: "active" | "inactive";
  createdAt: string;
}

// ─── Site Attachments ─────────────────────────────────────────────────────────
export interface SiteAttachment {
  id: string;
  name: string;
  description: string;
  url: string; // opens in new tab (fake URL for demo)
  type: string; // e.g. "Lease Agreement", "Risk Assessment"
  uploadedAt: string;
}

// ─── Approvals ────────────────────────────────────────────────────────────────
export type ApprovalStatus = "pending" | "approved" | "rejected";
export type ApprovalCategory =
  | "document"
  | "maintenance"
  | "lease"
  | "compliance"
  | "procurement"
  | "other";

export interface ApprovalRequest {
  id: string;
  title: string;
  description: string;
  category: ApprovalCategory;
  status: ApprovalStatus;
  requestedBy: string;
  requestedByUserId: string;
  assignedTo?: string; // name of approver
  siteId?: string;
  dueDate?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Activity Log ─────────────────────────────────────────────────────────────
export type ActivityAction =
  | "created"
  | "updated"
  | "status_changed"
  | "assigned"
  | "note_added"
  | "attachment_added"
  | "attachment_removed"
  | "closed"
  | "approved"
  | "rejected";

export interface ActivityLogEntry {
  id: string;
  entityType: "reactive_job" | "asset_test" | "approval";
  entityId: string;
  action: ActivityAction;
  description: string;
  performedBy: string;
  performedByUserId: string;
  createdAt: string;
  metadata?: Record<string, string>;
}

// ─── Notification / Escalation Preferences ────────────────────────────────────
export interface EscalationPreferences {
  testDueLeadDays: number;       // days before test due to send first alert
  testOverdueRepeatDays: number; // how often to repeat overdue alerts
  leaseDueLeadDays: number;      // days before lease expiry to alert
  complianceDueLeadDays: number; // days before compliance renewal to alert
  emailNotifications: boolean;
  portalNotifications: boolean;
}

// ─── Notifications ────────────────────────────────────────────────────────────
export type NotificationType =
  | "test_due"
  | "test_overdue"
  | "test_failed"
  | "test_passed"
  | "asset_added"
  | "site_synced"
  | "user_added"
  | "job_created"
  | "job_assigned"
  | "job_completed"
  | "supplier_insurance_expired";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkTo?: string; // optional deep link
  metadata?: Record<string, string>;
}
