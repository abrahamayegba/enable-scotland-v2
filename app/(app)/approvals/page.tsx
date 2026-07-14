"use client";

import { useState, useEffect } from "react";
import {
  getApprovals,
  saveApproval,
  deleteApproval,
  getSites,
  generateId,
  addActivityLog,
} from "@/lib/store";
import type { ApprovalRequest, ApprovalCategory, Site } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  CalendarDays,
  User,
  CheckCheck,
  X,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
    icon: XCircle,
  },
} as const;

const CATEGORY_LABELS: Record<ApprovalCategory, string> = {
  document: "Document",
  maintenance: "Maintenance",
  lease: "Lease",
  compliance: "Compliance",
  procurement: "Procurement",
  other: "Other",
};

const CATEGORY_BADGE: Record<ApprovalCategory, string> = {
  document: "bg-blue-50 text-blue-700 border-blue-200",
  maintenance: "bg-orange-50 text-orange-700 border-orange-200",
  lease: "bg-purple-50 text-purple-700 border-purple-200",
  compliance: "bg-teal-50 text-teal-700 border-teal-200",
  procurement: "bg-slate-50 text-slate-700 border-slate-200",
  other: "bg-gray-50 text-gray-700 border-gray-200",
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editApproval, setEditApproval] = useState<ApprovalRequest | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<ApprovalRequest | null>(null);
  const [resolveApproval, setResolveApproval] = useState<{ approval: ApprovalRequest; action: "approved" | "rejected" } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setApprovals(getApprovals());
    setSites(getSites());
  }, []);

  function refresh() {
    setApprovals(getApprovals());
  }

  const filtered = approvals.filter((a) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      (a.requestedBy ?? "").toLowerCase().includes(q) ||
      (a.assignedTo ?? "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchCat = categoryFilter === "all" || a.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const pending = approvals.filter((a) => a.status === "pending").length;
  const approved = approvals.filter((a) => a.status === "approved").length;
  const rejected = approvals.filter((a) => a.status === "rejected").length;
  const overdue = approvals.filter(
    (a) => a.status === "pending" && a.dueDate && isPast(new Date(a.dueDate))
  ).length;

  function handleResolve(approval: ApprovalRequest, status: "approved" | "rejected", notes: string) {
    const now = new Date().toISOString();
    const updated: ApprovalRequest = {
      ...approval,
      status,
      resolvedAt: now,
      resolvedBy: user?.name,
      resolutionNotes: notes || undefined,
      updatedAt: now,
    };
    saveApproval(updated);
    addActivityLog({
      id: generateId("log"),
      entityType: "approval",
      entityId: approval.id,
      action: status === "approved" ? "approved" : "rejected",
      description: `${status === "approved" ? "Approved" : "Rejected"} by ${user?.name}${notes ? `: ${notes}` : ""}`,
      performedBy: user?.name ?? "",
      performedByUserId: user?.id ?? "",
      createdAt: now,
    });
    refresh();
    setResolveApproval(null);
    setSelectedApproval(null);
  }

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Approvals</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pending approvals and sign-off requests — {approvals.length} total
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white shrink-0"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Request
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: pending, dot: "bg-amber-500" },
          { label: "Approved", value: approved, dot: "bg-green-500" },
          { label: "Rejected", value: rejected, dot: "bg-red-500" },
          { label: "Overdue", value: overdue, dot: "bg-red-700" },
        ].map(({ label, value, dot }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
          >
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dot)} />
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-44 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search approvals..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-sm w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 text-sm w-40">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as ApprovalCategory[]).map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || statusFilter !== "all" || categoryFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_140px_130px_120px_100px_44px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground">Request</p>
          <p className="text-xs font-medium text-muted-foreground">Category</p>
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <p className="text-xs font-medium text-muted-foreground">Assigned To</p>
          <p className="text-xs font-medium text-muted-foreground">Due</p>
          <p className="text-xs font-medium text-muted-foreground sr-only">Actions</p>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardCheck className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">No approvals found</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search || statusFilter !== "all" || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Create a new approval request to get started"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((approval) => {
              const statusCfg = STATUS_CONFIG[approval.status];
              const site = sites.find((s) => s.id === approval.siteId);
              const isOverdue =
                approval.status === "pending" &&
                approval.dueDate &&
                isPast(new Date(approval.dueDate));
              return (
                <div
                  key={approval.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_140px_130px_120px_100px_44px] gap-2 md:gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group items-center"
                  onClick={() => setSelectedApproval(approval)}
                >
                  {/* Title */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", statusCfg.dot)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{approval.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {approval.requestedBy}
                        {site ? ` · ${site.name}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="hidden md:flex">
                    <span className={cn("text-xs border px-2 py-0.5 rounded-md", CATEGORY_BADGE[approval.category])}>
                      {CATEGORY_LABELS[approval.category]}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden md:flex">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md", statusCfg.badge)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Assigned to */}
                  <div className="hidden md:block">
                    <p className="text-xs text-muted-foreground truncate">{approval.assignedTo ?? "—"}</p>
                  </div>

                  {/* Due */}
                  <div className="hidden md:block">
                    {approval.dueDate ? (
                      <p className={cn("text-xs", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
                        {format(new Date(approval.dueDate), "dd MMM")}
                        {isOverdue && " (overdue)"}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">—</p>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin ? (
                    <div className="hidden md:flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          {approval.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); setResolveApproval({ approval, action: "approved" }); }}
                              >
                                <CheckCheck className="w-3.5 h-3.5 mr-2 text-green-600" /> Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => { e.stopPropagation(); setResolveApproval({ approval, action: "rejected" }); }}
                              >
                                <X className="w-3.5 h-3.5 mr-2 text-red-600" /> Reject
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditApproval(approval); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(approval.id); }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : null}

                  {/* Mobile badges */}
                  <div className="flex items-center gap-2 md:hidden flex-wrap">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md", statusCfg.badge)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                    <span className={cn("text-xs border px-2 py-0.5 rounded-md", CATEGORY_BADGE[approval.category])}>
                      {CATEGORY_LABELS[approval.category]}
                    </span>
                    {approval.dueDate && (
                      <span className={cn("text-xs", isOverdue ? "text-red-600 font-medium" : "text-muted-foreground")}>
                        Due {format(new Date(approval.dueDate), "dd MMM")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2.5 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {approvals.length} requests
            </p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      {selectedApproval && (
        <ApprovalDetailDialog
          approval={selectedApproval}
          site={sites.find((s) => s.id === selectedApproval.siteId)}
          isAdmin={isAdmin}
          onClose={() => setSelectedApproval(null)}
          onEdit={() => { setEditApproval(selectedApproval); setSelectedApproval(null); }}
          onApprove={() => setResolveApproval({ approval: selectedApproval, action: "approved" })}
          onReject={() => setResolveApproval({ approval: selectedApproval, action: "rejected" })}
        />
      )}

      {/* Add / Edit dialog */}
      {(addOpen || editApproval) && (
        <ApprovalFormDialog
          open={addOpen || !!editApproval}
          onOpenChange={(o) => { if (!o) { setAddOpen(false); setEditApproval(null); } }}
          sites={sites}
          user={user}
          initialData={editApproval ?? undefined}
          onSave={(data) => {
            if (editApproval) {
              saveApproval({ ...editApproval, ...data, updatedAt: new Date().toISOString() });
            } else {
              const now = new Date().toISOString();
              saveApproval({ ...data, id: generateId("appr"), createdAt: now, updatedAt: now });
            }
            refresh();
            setAddOpen(false);
            setEditApproval(null);
          }}
        />
      )}

      {/* Resolve dialog */}
      {resolveApproval && (
        <ResolveDialog
          approval={resolveApproval.approval}
          action={resolveApproval.action}
          onClose={() => setResolveApproval(null)}
          onConfirm={(notes) => handleResolve(resolveApproval.approval, resolveApproval.action, notes)}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Approval Request</DialogTitle>
            <DialogDescription>This will permanently remove the request and cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (deleteId) { deleteApproval(deleteId); refresh(); setDeleteId(null); } }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Detail Dialog ────────────────────────────────────────────────────────────
function ApprovalDetailDialog({
  approval,
  site,
  isAdmin,
  onClose,
  onEdit,
  onApprove,
  onReject,
}: {
  approval: ApprovalRequest;
  site?: Site;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const statusCfg = STATUS_CONFIG[approval.status];
  const isOverdue =
    approval.status === "pending" &&
    approval.dueDate &&
    isPast(new Date(approval.dueDate));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-[var(--brand-purple)]" />
            <DialogTitle className="text-base leading-tight">{approval.title}</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className={cn("inline-flex items-center gap-1.5 text-xs border px-1.5 py-0.5 rounded-md", statusCfg.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
              {statusCfg.label}
            </span>
            <span className={cn("text-xs border px-1.5 py-0.5 rounded-md", CATEGORY_BADGE[approval.category])}>
              {CATEGORY_LABELS[approval.category]}
            </span>
            {isOverdue && (
              <span className="text-xs text-red-600 font-medium">Overdue</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex flex-col gap-4 text-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
            <p className="text-sm leading-relaxed">{approval.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Requested By</p>
              <p className="text-sm flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-muted-foreground" />{approval.requestedBy}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Assigned To</p>
              <p className="text-sm">{approval.assignedTo ?? "—"}</p>
            </div>
            {site && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Site</p>
                <p className="text-sm flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-muted-foreground" />{site.name}</p>
              </div>
            )}
            {approval.dueDate && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Due Date</p>
                <p className={cn("text-sm flex items-center gap-1.5", isOverdue ? "text-red-600 font-medium" : "")}>
                  <CalendarDays className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                  {format(new Date(approval.dueDate), "dd MMM yyyy")}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Created</p>
              <p className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(approval.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>

          {approval.resolvedAt && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {approval.status === "approved" ? "Approval Notes" : "Rejection Notes"}
                </p>
                <div className={cn("rounded-lg border p-3 text-sm", approval.status === "approved" ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50")}>
                  <p className="font-medium text-xs mb-1">{approval.resolvedBy} · {format(new Date(approval.resolvedAt), "dd MMM yyyy, HH:mm")}</p>
                  <p className="text-sm">{approval.resolutionNotes ?? "No notes added."}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        <DialogFooter className="flex gap-2">
          {isAdmin && approval.status === "pending" && (
            <>
              <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} className="border-red-200 text-red-600 hover:bg-red-50">
                <X className="w-3.5 h-3.5 mr-1.5" /> Reject
              </Button>
            </>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          )}
          <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Resolve Dialog ───────────────────────────────────────────────────────────
function ResolveDialog({
  approval,
  action,
  onClose,
  onConfirm,
}: {
  approval: ApprovalRequest;
  action: "approved" | "rejected";
  onClose: () => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");
  const isApproving = action === "approved";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isApproving ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            {isApproving ? "Approve Request" : "Reject Request"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {isApproving
              ? "You are approving this request. Add any notes for the record."
              : "You are rejecting this request. Please explain why so the requester can act on it."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Notes {!isApproving && <span className="text-muted-foreground">(recommended)</span>}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isApproving ? "Optional notes..." : "Explain the reason for rejection..."}
            rows={3}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className={isApproving ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}
            onClick={() => onConfirm(notes)}
          >
            {isApproving ? "Confirm Approve" : "Confirm Reject"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────
type ApprovalFormData = Omit<ApprovalRequest, "id" | "createdAt" | "updatedAt" | "resolvedAt" | "resolvedBy" | "resolutionNotes">;

function ApprovalFormDialog({
  open,
  onOpenChange,
  sites,
  user,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sites: Site[];
  user: any;
  initialData?: ApprovalRequest;
  onSave: (data: ApprovalFormData) => void;
}) {
  const [form, setForm] = useState<ApprovalFormData>({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    category: initialData?.category ?? "other",
    status: initialData?.status ?? "pending",
    requestedBy: initialData?.requestedBy ?? user?.name ?? "",
    requestedByUserId: initialData?.requestedByUserId ?? user?.id ?? "",
    assignedTo: initialData?.assignedTo ?? "",
    siteId: initialData?.siteId ?? "",
    dueDate: initialData?.dueDate ? initialData.dueDate.split("T")[0] : "",
  });

  function set<K extends keyof ApprovalFormData>(k: K, v: ApprovalFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const isValid = form.title.trim() && form.description.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Approval Request" : "New Approval Request"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update the details for this approval request." : "Create a new approval request for sign-off."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-1">
          <div className="flex flex-col gap-1.5">
            <Label>Title <span className="text-destructive">*</span></Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Roof Repair Quote Approval" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Description <span className="text-destructive">*</span></Label>
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe what needs to be approved..."
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v: any) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as ApprovalCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assigned To (Approver)</Label>
              <Input value={form.assignedTo ?? ""} onChange={(e) => set("assignedTo", e.target.value || undefined)} placeholder="Name of approver" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.dueDate ?? ""} onChange={(e) => set("dueDate", e.target.value ? new Date(e.target.value).toISOString() : undefined)} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Related Site</Label>
              <Select value={form.siteId ?? "none"} onValueChange={(v) => set("siteId", v === "none" ? undefined : v)}>
                <SelectTrigger><SelectValue placeholder="Select site (optional)..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No specific site —</SelectItem>
                  {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <Separator />
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            disabled={!isValid}
            onClick={() => onSave(form)}
          >
            {initialData ? "Save Changes" : "Create Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
