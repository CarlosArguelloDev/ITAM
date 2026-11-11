export type LocationType = 'OPM' | 'OMEX';

export type AssetCategory =
  | 'LAPTOP'
  | 'MONITOR'
  | 'DOCKING'
  | 'WORKSTATION'
  | 'AUDIFONOS'
  | 'TELEFONO'
  | 'TELEFONO FIJO'
  | 'SIM-CARD'
  | 'IMPRESORA'
  | 'SCANNER'
  | 'IPAD'
  | 'FIREWALL'
  | 'SWITCH'
  | 'ACCESS POINT'
  | 'SERVER'
  | 'NVR'
  | 'DVR'
  | 'ROUTER'
  | 'NO-BREAK'
  | 'PDU'
  | 'PROYECTOR'
  | 'TELEVISION'
  | 'TRITURADORA'
  | 'CONTROL TV'
  | 'CONVERTIDOR DE MEDIOS'
  | 'GOPRO'
  | 'RACK MOUNT TRAY'
  | 'ADAPTADOR DE RED'
  | 'BOCINA'
  | 'BATERIA'
  | 'CARGADOR BATERIA'
  | 'QUEMADOR DE CD'
  | 'PERIPHERAL'
  | 'OTHER';

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export type AssetStatus = 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE' | 'RETIRED' | 'LOST';
export type ResponsivaStatus = 'PENDING' | 'SIGNED' | 'NOT_REQUIRED';
export type DiscrepancyType = 'MATCH' | 'WRONG_USER' | 'WRONG_LOCATION' | 'UNEXPECTED_STATUS' | 'MISSING';
export type AlertSeverity = 'HIGH' | 'MEDIUM' | 'INFO';

export interface User {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  department: string;
  location: LocationType;
  is_active: boolean;
  created_at: string;
  assigned_assets?: Asset[];
  assets_count?: number;
  laptops_count?: number;
  monitors_count?: number;
  dockings_count?: number;
  peripherals_count?: number;
}

export interface Asset {
  id: string;
  asset_tag: string;
  serial_number: string;
  category: AssetCategory;
  brand: string;
  model: string;
  status: AssetStatus;
  assigned_to_user_id?: string;
  assigned_to_name?: string;
  parent_asset_id?: string;
  parent_asset_tag?: string;
  location: LocationType;
  department?: string;
  specs: Record<string, any>;
  warranty_expiry?: string;
  last_audited_at?: string;
  created_at: string;
  children?: Asset[];
}

export interface AssetHistory {
  id: string;
  asset_id: string;
  asset_tag?: string;
  asset_model?: string;
  action_type: 'CREATE' | 'ASSIGN' | 'UNASSIGN' | 'SWAP' | 'STATUS_CHANGE' | 'AUDIT_MATCH' | 'AUDIT_DISCREPANCY';
  previous_user_id?: string;
  previous_user_name?: string;
  new_user_id?: string;
  new_user_name?: string;
  notes: string;
  responsiva_status: ResponsivaStatus;
  responsiva_doc_path?: string;
  created_at: string;
}

export interface DiagramNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface UserDiagramResponse {
  user: User;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  summary: {
    total: number;
    laptops: number;
    dockings: number;
    monitors: number;
    peripherals: number;
    others: number;
  };
}

export interface ResponsivaPayload {
  folio: string;
  generated_at: string;
  employee: User;
  primary_laptop?: Asset;
  attached_assets: Asset[];
  total_items: number;
  terms_and_conditions: string;
  pending_history_id?: string;
}

export interface AuditCampaign {
  id: string;
  name: string;
  target_location: string;
  target_type?: 'USER' | 'LOCATION';
  target_id?: string;
  target_name?: string;
  status: 'OPEN' | 'CLOSED';
  created_at: string;
  closed_at?: string;
  total_expected?: number;
  total_scanned: number;
  total_matches?: number;
  total_missing?: number;
  discrepancies_count: number;
  resolved_count: number;
  notes?: string;
  scans?: AuditScan[];
}

export interface AuditScan {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  asset_id: string;
  asset_tag: string;
  asset_brand: string;
  asset_model: string;
  asset_category: AssetCategory;
  expected_user_id?: string;
  expected_user_name?: string;
  found_with_user_id?: string;
  found_with_user_name?: string;
  expected_location: string;
  found_location: string;
  discrepancy_type: DiscrepancyType | 'UNASSIGNED' | 'UNASSIGNED_LOCATION';
  resolved: boolean;
  notes?: string;
  scanned_at: string;
}

export interface DashboardStats {
  total_assets: number;
  category_counts: Record<string, number>;
  status_counts: Record<string, number>;
  location_counts: Record<string, number>;
  active_discrepancies: number;
  pending_responsivas: number;
  expiring_warranties_30_days: number;
  unaudited_assets_over_90_days: number;
  total_users: number;
}

export interface AlertItem {
  id: string;
  severity: AlertSeverity;
  type: 'UNAUDITED_90_DAYS' | 'EXPIRING_WARRANTY' | 'PENDING_RESPONSIVA' | 'ACTIVE_DISCREPANCY';
  title: string;
  description: string;
  asset_id?: string;
  asset_tag?: string;
  user_id?: string;
  user_name?: string;
  date: string;
}

export interface PendingResponsivaItem {
  history_id: string;
  asset_id: string;
  asset_tag: string;
  asset_model: string;
  action_type: string;
  user_id?: string;
  user_name?: string;
  employee_code?: string;
  notes: string;
  responsiva_status: ResponsivaStatus;
  created_at: string;
}
