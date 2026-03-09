
import locationData from './locations.json';

// For Firestore data
export interface LocationSetting {
  id: string;
  section: string;
  lotFilter: string | null;
  locationName: string;
  unitValue: number;
}

// For UI Dropdowns
export interface Barangay {
  name: string;
  barangayCode: string;
}

// For processRecords function (legacy structure)
export interface SectionConfig {
  section: string;
  location: string;
  unitValue?: number;
}
export interface BarangayConfig {
  name: string;
  barangayCode: string;
  sections: SectionConfig[];
}

export const allBarangays: Barangay[] = locationData.barangays.map(b => ({
  name: b.name,
  barangayCode: b.barangayCode,
}));

    