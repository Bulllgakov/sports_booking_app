export interface Venue {
  id: string;
  name: string;
  address: string;
  phone?: string;
  email?: string;
  description?: string;
  logoUrl?: string;
  photos?: string[];
  amenities?: string[];
  features?: string[];
  sports?: string[]; // ['padel', 'tennis', 'badminton'] - DEPRECATED: use courtSportTypes instead
  courtSportTypes?: string[]; // Виды спорта из кортов
  hasCourts?: boolean; // Есть ли корты у клуба
  organizationType?: string;
  inn?: string;
  bankAccount?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  location?: {
    latitude: number;
    longitude: number;
  };
  latitude?: number;
  longitude?: number;
  openTime?: string;
  closeTime?: string;
  minPrice?: number;
  maxPrice?: number;
  public?: boolean; // Отображать в витрине
  website?: string;
  instagram?: string;
  workingDays?: string[];
}