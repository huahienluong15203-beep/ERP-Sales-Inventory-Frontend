export type LocationType = 'ZONE' | 'RACK' | 'SHELF' | 'BIN';

export interface WarehouseManager {
  id: number;
  code?: string;
  name?: string;
  username?: string;
  fullName?: string;
}

export interface WarehouseLocation {
  id: number;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  code: string;
  name: string;
  locationType: LocationType;
  zone?: string | null;
  shelf?: string | null;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Warehouse {
  id: number;
  code: string;
  name: string;
  address?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  manager?: WarehouseManager | null;
  managerName?: string | null;
  managerPhone?: string | null;
  managerEmail?: string | null;
  locationCount: number;
  activeLocationCount: number;
  locations?: WarehouseLocation[];
  createdAt?: string;
  updatedAt?: string;
}

export interface WarehouseCreatePayload {
  code: string;
  name: string;
  address?: string;
  managerId?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface WarehouseUpdatePayload {
  name: string;
  address?: string;
  managerId?: number | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface WarehouseLocationCreatePayload {
  code: string;
  name: string;
  locationType: LocationType;
  zone?: string;
  shelf?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface WarehouseLocationUpdatePayload {
  name: string;
  locationType: LocationType;
  zone?: string;
  shelf?: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface WarehouseFilterParams {
  status?: string;
  keyword?: string;
}

export interface WarehouseLocationFilterParams {
  locationType?: string;
  status?: string;
  keyword?: string;
}
