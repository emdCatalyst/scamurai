import {
  ArrowLeftRight,
  BadgeCheck,
  Camera,
  ChartColumn,
  ClipboardCheck,
  CloudUpload,
  FolderOpen,
  HardHat,
  History,
  LayoutDashboard,
  PackageX,
  Palette,
  ScanQrCode,
  Search,
  Thermometer,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceKey } from '@/config/services';
import type { FeatureId } from './content';

/**
 * Icon for each feature, matching `services.<key>.features.items.<id>`.
 * Typed against the catalog keys, so a new service fails to compile until it
 * has icons for every feature.
 */
export const FEATURE_ICONS: Readonly<Record<ServiceKey, Readonly<Record<FeatureId, LucideIcon>>>> = {
  dispute_orders: {
    '1': Camera,
    '2': CloudUpload,
    '3': Search,
    '4': ChartColumn,
    '5': Users,
    '6': Palette,
  },
  compliance: {
    '1': ClipboardCheck,
    '2': LayoutDashboard,
    '3': Wrench,
    '4': HardHat,
    '5': Thermometer,
    '6': BadgeCheck,
  },
  receiving: {
    '1': ArrowLeftRight,
    '2': ScanQrCode,
    '3': PackageX,
    '4': FolderOpen,
    '5': Warehouse,
    '6': History,
  },
};
