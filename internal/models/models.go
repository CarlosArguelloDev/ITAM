package models

import (
	"encoding/json"
	"time"
)

// Categories
const (
	CategoryLaptop     = "LAPTOP"
	CategoryMonitor    = "MONITOR"
	CategoryDocking    = "DOCKING"
	CategoryPeripheral = "PERIPHERAL"
	CategoryOther      = "OTHER"
)

// Asset Status
const (
	StatusAvailable   = "AVAILABLE"
	StatusAssigned    = "ASSIGNED"
	StatusMaintenance = "MAINTENANCE"
	StatusRetired     = "RETIRED"
	StatusLost        = "LOST"
)

// Action Types for History
const (
	ActionCreate           = "CREATE"
	ActionAssign           = "ASSIGN"
	ActionUnassign         = "UNASSIGN"
	ActionSwap             = "SWAP"
	ActionStatusChange     = "STATUS_CHANGE"
	ActionAuditMatch       = "AUDIT_MATCH"
	ActionAuditDiscrepancy = "AUDIT_DISCREPANCY"
)

// Responsiva Status
const (
	ResponsivaPending     = "PENDING"
	ResponsivaSigned      = "SIGNED"
	ResponsivaNotRequired = "NOT_REQUIRED"
)

// Discrepancy Types
const (
	DiscrepancyMatch            = "MATCH"
	DiscrepancyWrongUser        = "WRONG_USER"
	DiscrepancyWrongLocation    = "WRONG_LOCATION"
	DiscrepancyUnexpectedStatus = "UNEXPECTED_STATUS"
	DiscrepancyMissing          = "MISSING"
)

// User representa al usuario primario/empleado
type User struct {
	ID               string     `json:"id"`
	EmployeeCode     string     `json:"employee_code"`
	FullName         string     `json:"full_name"`
	Email            string     `json:"email"`
	Department       string     `json:"department"`
	Location         string     `json:"location"`
	IsActive         bool       `json:"is_active"`
	CreatedAt        time.Time  `json:"created_at"`
	AssignedAssets   []Asset    `json:"assigned_assets,omitempty"`
	AssetsCount      int        `json:"assets_count"`
	LaptopsCount     int        `json:"laptops_count"`
	MonitorsCount    int        `json:"monitors_count"`
	DockingsCount    int        `json:"dockings_count"`
	PeripheralsCount int        `json:"peripherals_count"`
}

// Asset representa cualquier equipo de TI
type Asset struct {
	ID               string          `json:"id"`
	AssetTag         string          `json:"asset_tag"`
	SerialNumber     string          `json:"serial_number"`
	Category         string          `json:"category"`
	Brand            string          `json:"brand"`
	Model            string          `json:"model"`
	Status           string          `json:"status"`
	AssignedToUserID *string         `json:"assigned_to_user_id,omitempty"`
	AssignedToName   *string         `json:"assigned_to_name,omitempty"`
	ParentAssetID    *string         `json:"parent_asset_id,omitempty"`
	ParentAssetTag   *string         `json:"parent_asset_tag,omitempty"`
	Location         string          `json:"location"`
	Specs            json.RawMessage `json:"specs"`
	WarrantyExpiry   *string         `json:"warranty_expiry,omitempty"`
	LastAuditedAt    *time.Time      `json:"last_audited_at,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	Children         []Asset         `json:"children,omitempty"`
}

// AssetHistory registra el audit log inmutable
type AssetHistory struct {
	ID                 string    `json:"id"`
	AssetID            string    `json:"asset_id"`
	AssetTag           string    `json:"asset_tag,omitempty"`
	AssetModel         string    `json:"asset_model,omitempty"`
	ActionType         string    `json:"action_type"`
	PreviousUserID     *string   `json:"previous_user_id,omitempty"`
	PreviousUserName   *string   `json:"previous_user_name,omitempty"`
	NewUserID          *string   `json:"new_user_id,omitempty"`
	NewUserName        *string   `json:"new_user_name,omitempty"`
	Notes              string    `json:"notes"`
	ResponsivaStatus   string    `json:"responsiva_status"`
	ResponsivaDocPath  *string   `json:"responsiva_doc_path,omitempty"`
	CreatedAt          time.Time `json:"created_at"`
}

// AuditCampaign gestiona campañas de inventario físico vs. lógico
type AuditCampaign struct {
	ID                 string     `json:"id"`
	Name               string     `json:"name"`
	TargetLocation     string     `json:"target_location"`
	TargetType         string     `json:"target_type"` // "USER" | "LOCATION"
	TargetID           *string    `json:"target_id,omitempty"`
	TargetName         string     `json:"target_name"`
	Status             string     `json:"status"` // "OPEN" | "CLOSED"
	TotalExpected      int        `json:"total_expected"`
	TotalScans         int        `json:"total_scans"`
	TotalMatches       int        `json:"total_matches"`
	DiscrepanciesCount int        `json:"discrepancies_count"`
	MissingCount       int        `json:"missing_count"`
	ResolvedCount      int        `json:"resolved_count"`
	Notes              *string    `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	ClosedAt           *time.Time `json:"closed_at,omitempty"`
	Scans              []AuditScan `json:"scans,omitempty"`
}

// AuditScan lectura física comparada contra el inventario lógico
type AuditScan struct {
	ID                string    `json:"id"`
	CampaignID        string    `json:"campaign_id"`
	AssetID           string    `json:"asset_id"`
	AssetTag          string    `json:"asset_tag"`
	AssetBrand        string    `json:"asset_brand"`
	AssetModel        string    `json:"asset_model"`
	AssetCategory     string    `json:"asset_category"`
	ExpectedUserID    *string   `json:"expected_user_id,omitempty"`
	ExpectedUserName  *string   `json:"expected_user_name,omitempty"`
	FoundWithUserID   *string   `json:"found_with_user_id,omitempty"`
	FoundWithUserName *string   `json:"found_with_user_name,omitempty"`
	ExpectedLocation  string    `json:"expected_location"`
	FoundLocation     string    `json:"found_location"`
	DiscrepancyType   string    `json:"discrepancy_type"`
	Resolved          bool      `json:"resolved"`
	Notes             *string   `json:"notes,omitempty"`
	ScannedAt         time.Time `json:"scanned_at"`
}

// DiagramNode y DiagramEdge para @xyflow/react
type DiagramNode struct {
	ID       string                 `json:"id"`
	Type     string                 `json:"type"`
	Position NodePosition           `json:"position"`
	Data     map[string]interface{} `json:"data"`
}

type NodePosition struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

type DiagramEdge struct {
	ID        string `json:"id"`
	Source    string `json:"source"`
	Target    string `json:"target"`
	Label     string `json:"label,omitempty"`
	Animated  bool   `json:"animated"`
	Style     string `json:"style,omitempty"`
}

type UserDiagramResponse struct {
	User     User          `json:"user"`
	Nodes    []DiagramNode `json:"nodes"`
	Edges    []DiagramEdge `json:"edges"`
	Summary  map[string]int`json:"summary"`
}

// ResponsivaPayload estructura limpia para la Carta de Responsiva
type ResponsivaPayload struct {
	Folio          string    `json:"folio"`
	GeneratedAt    time.Time `json:"generated_at"`
	Employee       User      `json:"employee"`
	PrimaryLaptop  *Asset    `json:"primary_laptop,omitempty"`
	AttachedAssets []Asset   `json:"attached_assets"`
	TotalItems     int       `json:"total_items"`
	TermsAndConditions string `json:"terms_and_conditions"`
	PendingHistoryID   string `json:"pending_history_id,omitempty"`
}

// Request DTOs
type CreateUserRequest struct {
	EmployeeCode string `json:"employee_code"`
	FullName     string `json:"full_name"`
	Email        string `json:"email"`
	Department   string `json:"department"`
	Location     string `json:"location"`
}

type UpdateUserRequest struct {
	EmployeeCode string `json:"employee_code"`
	FullName     string `json:"full_name"`
	Email        string `json:"email"`
	Department   string `json:"department"`
	Location     string `json:"location"`
	IsActive     bool   `json:"is_active"`
}

type CreateAssetRequest struct {
	AssetTag         string          `json:"asset_tag"`
	SerialNumber     string          `json:"serial_number"`
	Category         string          `json:"category"`
	Brand            string          `json:"brand"`
	Model            string          `json:"model"`
	Status           string          `json:"status"`
	AssignedToUserID *string         `json:"assigned_to_user_id"`
	ParentAssetID    *string         `json:"parent_asset_id"`
	Location         string          `json:"location"`
	Specs            json.RawMessage `json:"specs"`
	WarrantyExpiry   *string         `json:"warranty_expiry"`
}

type UpdateAssetRequest struct {
	AssetTag         string          `json:"asset_tag"`
	SerialNumber     string          `json:"serial_number"`
	Category         string          `json:"category"`
	Brand            string          `json:"brand"`
	Model            string          `json:"model"`
	Status           string          `json:"status"`
	AssignedToUserID *string         `json:"assigned_to_user_id"`
	ParentAssetID    *string         `json:"parent_asset_id"`
	Location         string          `json:"location"`
	Specs            json.RawMessage `json:"specs"`
	WarrantyExpiry   *string         `json:"warranty_expiry"`
}

type AssignAssetRequest struct {
	AssetID       string  `json:"asset_id"`
	UserID        string  `json:"user_id"`
	ParentAssetID *string `json:"parent_asset_id"`
	Location      string  `json:"location"`
	Notes         string  `json:"notes"`
}

type UnassignAssetRequest struct {
	AssetID    string `json:"asset_id"`
	NextStatus string `json:"next_status"` // AVAILABLE o MAINTENANCE
	Location   string `json:"location"`
	Notes      string `json:"notes"`
}

type SwapAssetRequest struct {
	UserID                  string  `json:"user_id"`
	OldAssetID              string  `json:"old_asset_id"`
	NewAssetID              string  `json:"new_asset_id"`
	OldAssetNextStatus      string  `json:"old_asset_next_status"` // AVAILABLE, MAINTENANCE, RETIRED
	MoveChildrenToNewAsset  bool    `json:"move_children_to_new_asset"`
	Notes                   string  `json:"notes"`
}

type ScanAssetRequest struct {
	AssetTag        string  `json:"asset_tag"`
	FoundWithUserID *string `json:"found_with_user_id"`
	FoundLocation   string  `json:"found_location"`
}

type ResolveDiscrepancyRequest struct {
	Action string `json:"action"` // ACCEPT_PHYSICAL, MARK_LOST, KEEP_LOGICAL
	Notes  string `json:"notes"`
}

// KPI Dashboard Stats
type DashboardStats struct {
	TotalAssets                int            `json:"total_assets"`
	CategoryCounts             map[string]int `json:"category_counts"`
	StatusCounts               map[string]int `json:"status_counts"`
	LocationCounts             map[string]int `json:"location_counts"`
	ActiveDiscrepancies        int            `json:"active_discrepancies"`
	PendingResponsivas         int            `json:"pending_responsivas"`
	ExpiringWarranties30Days   int            `json:"expiring_warranties_30_days"`
	UnauditedAssetsOver90Days  int            `json:"unaudited_assets_over_90_days"`
	TotalUsers                 int            `json:"total_users"`
}

// AlertItem para el Centro de Alertas
type AlertItem struct {
	ID          string    `json:"id"`
	Severity    string    `json:"severity"` // 'HIGH', 'MEDIUM', 'INFO'
	Type        string    `json:"type"`     // 'UNAUDITED_90_DAYS', 'EXPIRING_WARRANTY', 'PENDING_RESPONSIVA', 'ACTIVE_DISCREPANCY'
	Title       string    `json:"title"`
	Description string    `json:"description"`
	AssetID     *string   `json:"asset_id,omitempty"`
	AssetTag    *string   `json:"asset_tag,omitempty"`
	UserID      *string   `json:"user_id,omitempty"`
	UserName    *string   `json:"user_name,omitempty"`
	Date        time.Time `json:"date"`
}
