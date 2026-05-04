export type UserRole = "admin" | "moderator" | "editor" | "user";

export interface User {
  _id?: string;
  username: string;
  email: string;
  password: string; // hashed
  role: UserRole;
  displayName?: string;
  organization?: string;
  location?: string;
  country?: string;
  city?: string;
  region?: string;
  role_custom?: string;
  interests?: string;
  profilePicture?: string;
  coverImage?: string;
  about?: string;
  aboutTranslations?: Record<string, string>; // Translations: { me: "...", en: "...", it: "...", sq: "..." }
  headline?: string;
  headlineTranslations?: Record<string, string>;
  experience?: Experience[];
  education?: Education[];
  skills?: string[];
  skillsTranslations?: Record<string, string[]>; // Translations for skills array
  website?: string;
  phone?: string;
  linkedin?: string;
  twitter?: string;
  lastActivity?: Date;
  status?: "online" | "away" | "offline";
  registeredPlatforms?: {
    lms?: boolean;
    ecommerce?: boolean;
    dms?: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Experience {
  _id?: string;
  title: string;
  titleTranslations?: Record<string, string>;
  company: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  descriptionTranslations?: Record<string, string>;
}

export interface Education {
  _id?: string;
  school: string;
  schoolTranslations?: Record<string, string>;
  degree?: string;
  degreeTranslations?: Record<string, string>;
  field?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
  descriptionTranslations?: Record<string, string>;
}
