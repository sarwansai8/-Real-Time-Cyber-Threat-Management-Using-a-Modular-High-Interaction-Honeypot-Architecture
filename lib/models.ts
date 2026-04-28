import mongoose, { Schema, Document, Model } from 'mongoose'

// User/Patient Interface
export interface IUser extends Document {
  email: string
  password: string
  role: 'patient' | 'admin' | 'doctor'
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: 'male' | 'female' | 'other'
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  bloodType: string
  emergencyContact: string
  verified: boolean
  createdAt: Date
  updatedAt: Date
}

// Appointment Interface
export interface IAppointment extends Document {
  userId: mongoose.Types.ObjectId
  doctorName: string
  specialty: string
  date: Date
  time: string
  location: string
  status: 'scheduled' | 'completed' | 'cancelled'
  phone: string
  notes: string
  createdAt: Date
  updatedAt: Date
}

// Medical Record Interface
export interface IMedicalRecord extends Document {
  userId: mongoose.Types.ObjectId
  title: string
  type: 'lab' | 'prescription' | 'diagnosis' | 'imaging' | 'other'
  date: Date
  provider: string
  description: string
  fileUrl?: string
  fileSize: string
  confidential: boolean
  createdAt: Date
  updatedAt: Date
}

// Vaccination Interface
export interface IVaccination extends Document {
  userId: mongoose.Types.ObjectId
  vaccineName: string
  date: Date
  provider: string
  batchNumber?: string
  nextDueDate?: Date
  notes: string
  createdAt: Date
  updatedAt: Date
}

// Health Update Interface
export interface IHealthUpdate extends Document {
  title: string
  content: string
  summary: string
  category: 'advisory' | 'prevention' | 'research' | 'outbreak' | 'vaccination'
  severity: 'low' | 'medium' | 'high' | 'critical'
  publishedBy: string
  publishedDate: Date
  status: 'draft' | 'published' | 'archived'
  region: 'National' | 'Regional' | 'International'
  views: number
  savedCount: number
  createdAt: Date
  updatedAt: Date
}

// Audit Log Interface (HIPAA Compliance)
export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId
  userEmail: string
  action: 'create' | 'read' | 'update' | 'delete' | 'export' | 'login' | 'logout'
  resource: 'user' | 'appointment' | 'medical-record' | 'vaccination' | 'health-update' | 'session'
  resourceId?: string
  ipAddress: string
  userAgent: string
  timestamp: Date
  details: string
  dataSnapshot?: any
  sensitiveData: boolean
  complianceFlags: string[]
  createdAt: Date
}

// Security Event Interface
export interface ISecurityEvent extends Document {
  timestamp: Date
  type: 'login_attempt' | 'honeypot_triggered' | 'suspicious_behavior' | 'bot_detected' | 'failed_auth' | 'injection_attempt'
  severity: 'low' | 'medium' | 'high' | 'critical'
  ipAddress: string
  location: {
    country?: string
    city?: string
    region?: string
    timezone?: string
    latitude?: number
    longitude?: number
  }
  deviceInfo: {
    userAgent: string
    platform: string
    language: string
    screenResolution: string
    timezone: string
    cookiesEnabled: boolean
    doNotTrack: boolean
  }
  behaviorMetrics: {
    mouseMovements: number
    keystrokes: number
    clickCount: number
    scrollDepth: number
    timeOnPage: number
    humanLikelihood: number
  }
  honeypotData?: {
    fieldsFilled: string[]
    suspicionScore: number
  }
  sessionData: {
    sessionId: string
    pageViews: number
    referrer: string
  }
  details: string
  createdAt: Date
}

// Schemas
const UserSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'admin', 'doctor'], default: 'patient' },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  dateOfBirth: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  bloodType: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  verified: { type: Boolean, default: false },
}, { timestamps: true })

const AppointmentSchema = new Schema<IAppointment>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  doctorName: { type: String, required: true },
  specialty: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  location: { type: String },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  phone: { type: String },
  notes: { type: String },
}, { timestamps: true })

const MedicalRecordSchema = new Schema<IMedicalRecord>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  type: { type: String, enum: ['lab', 'prescription', 'diagnosis', 'imaging', 'other'], required: true },
  date: { type: Date, default: Date.now },
  provider: { type: String, required: true },
  description: { type: String },
  fileUrl: { type: String },
  fileSize: { type: String, default: '0 MB' },
  confidential: { type: Boolean, default: false },
}, { timestamps: true })

const VaccinationSchema = new Schema<IVaccination>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  vaccineName: { type: String, required: true },
  date: { type: Date, required: true },
  provider: { type: String, required: true },
  batchNumber: { type: String },
  nextDueDate: { type: Date },
  notes: { type: String },
}, { timestamps: true })

const HealthUpdateSchema = new Schema<IHealthUpdate>({
  title: { type: String, required: true },
  content: { type: String, required: true },
  summary: { type: String, required: true },
  category: {
    type: String,
    enum: ['advisory', 'prevention', 'research', 'outbreak', 'vaccination'],
    required: true,
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  publishedBy: { type: String, required: true },
  publishedDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published',
  },
  region: {
    type: String,
    enum: ['National', 'Regional', 'International'],
    default: 'National',
  },
  views: { type: Number, default: 0 },
  savedCount: { type: Number, default: 0 },
}, { timestamps: true })

const SecurityEventSchema = new Schema<ISecurityEvent>({
  timestamp: { type: Date, default: Date.now },
  type: { 
    type: String, 
    enum: ['login_attempt', 'honeypot_triggered', 'suspicious_behavior', 'bot_detected', 'failed_auth', 'injection_attempt'],
    required: true 
  },
  severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
  ipAddress: { type: String, required: true },
  location: {
    country: String,
    city: String,
    region: String,
    timezone: String,
    latitude: Number,
    longitude: Number,
  },
  deviceInfo: {
    userAgent: { type: String, required: true },
    platform: String,
    language: String,
    screenResolution: String,
    timezone: String,
    cookiesEnabled: Boolean,
    doNotTrack: Boolean,
  },
  behaviorMetrics: {
    mouseMovements: { type: Number, default: 0 },
    keystrokes: { type: Number, default: 0 },
    clickCount: { type: Number, default: 0 },
    scrollDepth: { type: Number, default: 0 },
    timeOnPage: { type: Number, default: 0 },
    humanLikelihood: { type: Number, default: 0 },
  },
  honeypotData: {
    fieldsFilled: [String],
    suspicionScore: Number,
  },
  sessionData: {
    sessionId: { type: String, required: true },
    pageViews: { type: Number, default: 1 },
    referrer: String,
  },
  details: { type: String, required: true },
}, { timestamps: true })

// Create indexes for better performance
// Note: Email index is already defined in UserSchema with unique: true
AppointmentSchema.index({ userId: 1, date: 1 })
MedicalRecordSchema.index({ userId: 1, date: -1 })
VaccinationSchema.index({ userId: 1, date: -1 })
HealthUpdateSchema.index({ status: 1, publishedDate: -1 })
HealthUpdateSchema.index({ category: 1, severity: 1 })
SecurityEventSchema.index({ timestamp: -1, severity: 1 })

// Export models
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema)
export const Appointment: Model<IAppointment> = mongoose.models.Appointment || mongoose.model<IAppointment>('Appointment', AppointmentSchema)
export const MedicalRecord: Model<IMedicalRecord> = mongoose.models.MedicalRecord || mongoose.model<IMedicalRecord>('MedicalRecord', MedicalRecordSchema)
export const Vaccination: Model<IVaccination> = mongoose.models.Vaccination || mongoose.model<IVaccination>('Vaccination', VaccinationSchema)
export const HealthUpdate: Model<IHealthUpdate> = mongoose.models.HealthUpdate || mongoose.model<IHealthUpdate>('HealthUpdate', HealthUpdateSchema)
export const SecurityEvent: Model<ISecurityEvent> = mongoose.models.SecurityEvent || mongoose.model<ISecurityEvent>('SecurityEvent', SecurityEventSchema)
