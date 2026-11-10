import {
  User,
  Asset,
  AssetHistory,
  UserDiagramResponse,
  ResponsivaPayload,
  AuditCampaign,
  AuditScan,
  DashboardStats,
  AlertItem,
  PendingResponsivaItem,
} from './types';

const API_BASE = '/api';

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  if (!res.ok) {
    let errorMsg = `Error ${res.status}: ${res.statusText}`;
    try {
      const errData = await res.json();
      if (errData.error) errorMsg = errData.error;
    } catch {}
    throw new Error(errorMsg);
  }

  return res.json();
}

export const api = {
  // Stats & Alertas
  getStats: () => fetchJSON<DashboardStats>('/stats'),
  getAlerts: () => fetchJSON<AlertItem[]>('/alerts'),

  // Usuarios
  getUsers: (params?: { search?: string; department?: string; active?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.department) query.set('department', params.department);
    if (params?.active) query.set('active', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJSON<User[]>(`/users${qs}`);
  },
  getUser: (id: string) => fetchJSON<User>(`/users/${id}`),
  createUser: (data: Partial<User>) =>
    fetchJSON<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Partial<User>) =>
    fetchJSON<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    fetchJSON<{ message: string; status?: string }>(`/users/${id}`, { method: 'DELETE' }),
  getUserDiagram: (id: string) => fetchJSON<UserDiagramResponse>(`/users/${id}/diagram`),
  getResponsivaData: (id: string) => fetchJSON<ResponsivaPayload>(`/users/${id}/responsiva-data`),

  // Activos
  getAssets: (params?: { search?: string; category?: string; status?: string; location?: string; user_id?: string }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.location) query.set('location', params.location);
    if (params?.user_id) query.set('user_id', params.user_id);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJSON<Asset[]>(`/assets${qs}`);
  },
  getAsset: (id: string) => fetchJSON<Asset>(`/assets/${id}`),
  getAssetByTag: (tag: string) => fetchJSON<Asset>(`/assets/tag/${encodeURIComponent(tag)}`),
  createAsset: (data: Partial<Asset>) =>
    fetchJSON<Asset>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  updateAsset: (id: string, data: Partial<Asset>) =>
    fetchJSON<Asset>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAsset: (id: string) =>
    fetchJSON<{ message: string; status?: string }>(`/assets/${id}`, { method: 'DELETE' }),
  getAssetHistory: (id: string) => fetchJSON<AssetHistory[]>(`/assets/${id}/history`),

  // Asignaciones & Swap
  assignAsset: (data: { asset_id: string; user_id: string; parent_asset_id?: string; location?: string; notes?: string }) =>
    fetchJSON<Asset>('/assets/assign', { method: 'POST', body: JSON.stringify(data) }),
  unassignAsset: (data: { asset_id: string; next_status?: string; location?: string; notes?: string }) =>
    fetchJSON<Asset>('/assets/unassign', { method: 'POST', body: JSON.stringify(data) }),
  swapAsset: (data: {
    user_id: string;
    old_asset_id: string;
    new_asset_id: string;
    old_asset_next_status?: string;
    move_children_to_new_asset?: boolean;
    notes?: string;
  }) => fetchJSON<{ status: string; message: string; folio: string; history_id: string; responsiva_url: string }>('/assets/swap', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Responsivas & Documentos
  getPendingResponsivas: () => fetchJSON<PendingResponsivaItem[]>('/responsivas/pending'),
  uploadResponsiva: async (formData: FormData) => {
    const res = await fetch(`${API_BASE}/responsivas/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Error al subir responsiva' }));
      throw new Error(err.error || 'Error al subir responsiva');
    }
    return res.json();
  },

  // Auditorías & Conciliación
  getCampaigns: () => fetchJSON<AuditCampaign[]>('/audits/campaigns'),
  createCampaign: (data: { name: string; target_location: string }) =>
    fetchJSON<AuditCampaign>('/audits/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  getCampaign: (id: string) => fetchJSON<AuditCampaign>(`/audits/campaigns/${id}`),
  closeCampaign: (id: string) => fetchJSON<AuditCampaign>(`/audits/campaigns/${id}/close`, { method: 'POST' }),
  scanAsset: (campaignId: string, data: { asset_tag: string; found_with_user_id?: string; found_location?: string }) =>
    fetchJSON<AuditScan>(`/audits/campaigns/${campaignId}/scan`, { method: 'POST', body: JSON.stringify(data) }),
  getDiscrepancies: (campaignId: string) => fetchJSON<AuditScan[]>(`/audits/campaigns/${campaignId}/discrepancies`),
  resolveDiscrepancy: (scanId: string, data: { action: 'ACCEPT_PHYSICAL' | 'MARK_LOST' | 'KEEP_LOGICAL'; notes?: string }) =>
    fetchJSON<{ status: string; message: string }>(`/audits/discrepancies/${scanId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Auditoría Dirigida por Persona o Locación/Site
  getTargetExpectedAssets: (type: 'USER' | 'LOCATION', target: string) =>
    fetchJSON<Asset[]>(`/audits/target-assets?type=${type}&target=${encodeURIComponent(target)}`),
  scanTargetAsset: (data: { campaign_id?: string; target_type: 'USER' | 'LOCATION'; target_id: string; target_name: string; asset_tag: string }) =>
    fetchJSON<{
      campaign_id: string;
      asset: Asset;
      discrepancy_type: 'MATCH' | 'WRONG_USER' | 'WRONG_LOCATION' | 'UNASSIGNED' | 'UNASSIGNED_LOCATION';
      message: string;
      scanned_at: string;
    }>('/audits/target-scan', { method: 'POST', body: JSON.stringify(data) }),
  finishTargetAudit: (data: { campaign_id: string; notes?: string }) =>
    fetchJSON<AuditCampaign>('/audits/target-finish', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  reconcileTargetAsset: (data: {
    campaign_id?: string;
    action: 'ASSIGN_TO_TARGET' | 'MARK_LOST';
    asset_id: string;
    target_type: 'USER' | 'LOCATION';
    target_id: string;
    notes?: string;
  }) => fetchJSON<{ status: string; message: string }>('/audits/target-reconcile', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};
