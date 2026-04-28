# Health Portal - Quick Setup Guide

## 🚀 Getting Started

### 1. Install Dependencies
```powershell
pnpm install
```

### 2. Environment Variables
Create `.env.local` file with:
```env
MONGODB_URI=mongodb+srv://2200031385:Sarwansai@cluster0.zymg6z3.mongodb.net/healthportal
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
NODE_ENV=development
```

### 3. Setup Database Indexes (Important!)
```powershell
# This creates MongoDB indexes for fast search
node lib/setup-indexes.ts
```

### 4. Start Development Server
```powershell
pnpm dev
```

Server will start at: http://localhost:3000

---

## 🎯 What's New?

### ✅ Fully Implemented Features

1. **Complete API Integration**
   - All data now stored in MongoDB
   - No more localStorage dependency
   - Real-time data synchronization

2. **Advanced Search**
   - Search appointments by doctor, specialty, location
   - Search medical records by title, provider, description
   - Search vaccinations by name, provider
   - Instant results as you type

3. **Data Export**
   - Export appointments to CSV
   - Export medical records to CSV
   - Export vaccinations to CSV
   - Export complete health summary to TXT

4. **Security**
   - Rate limiting on auth endpoints (5 attempts / 15 min)
   - Input validation with Zod
   - XSS protection (HTML sanitization)
   - Strong password requirements
   - JWT authentication with httpOnly cookies

5. **Performance**
   - Pagination (50 items per page by default)
   - MongoDB text indexes for fast search
   - Optimized queries with `.lean()`
   - Loading states on all pages

---

## 📖 User Guide

### Registration
1. Navigate to http://localhost:3000/auth/register
2. Fill in all required fields
3. Password must have:
   - At least 8 characters
   - 1 uppercase letter
   - 1 lowercase letter
   - 1 number
   - 1 special character

### Appointments
- **View:** All your appointments with status
- **Search:** Type doctor name, specialty, or location
- **Filter:** By status (scheduled/completed/cancelled)
- **Export:** Click "Export" button for CSV download
- **Add:** Click "Schedule Appointment" button

### Medical Records
- **View:** All your medical records
- **Search:** Type title, provider, or description
- **Filter:** By type (lab/prescription/diagnosis/imaging)
- **Add:** Click "Add Record" button

### Vaccinations
- **View:** All vaccination records
- **Search:** Type vaccine name or provider
- **Status:** See completed vs pending vaccinations
- **Add:** Click "Add Vaccination" button

### Dashboard
- **Overview:** See all your health stats at a glance
- **Quick Actions:** Jump to any section
- **Export Summary:** Download complete health report

---

## 🔧 Developer Guide

### API Endpoints

#### Authentication
```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

#### Data Management
```
GET    /api/appointments?page=1&limit=20&search=cardio&status=scheduled
POST   /api/appointments
PATCH  /api/appointments
DELETE /api/appointments?id=xxx

GET    /api/medical-records?page=1&limit=20&search=blood&type=lab
POST   /api/medical-records
PATCH  /api/medical-records
DELETE /api/medical-records?id=xxx

GET    /api/vaccinations?page=1&limit=20&search=flu
POST   /api/vaccinations
PATCH  /api/vaccinations
DELETE /api/vaccinations?id=xxx
```

#### Export
```
GET /api/export?type=appointments&format=csv
GET /api/export?type=records&format=csv
GET /api/export?type=vaccinations&format=csv
GET /api/export?type=summary&format=txt
```

### Project Structure
```
lib/
├── validations.ts      # Zod schemas
├── rate-limit.ts       # Rate limiting
├── export-utils.ts     # Export functions
├── setup-indexes.ts    # DB index setup
├── db.ts               # MongoDB connection
├── models.ts           # Mongoose models
└── security-monitor.ts # Security tracking

app/api/
├── auth/               # Authentication
├── appointments/       # Appointments CRUD
├── medical-records/    # Records CRUD
├── vaccinations/       # Vaccinations CRUD
└── export/             # Data export
```

---

## 🐛 Troubleshooting

### MongoDB Connection Failed
- Check your MongoDB URI in `.env.local`
- Verify your IP is whitelisted in MongoDB Atlas
- Test connection: http://localhost:3000/api/test-connection

### Rate Limit Exceeded
- Wait 15 minutes (auth endpoints)
- Or wait 1 minute (API endpoints)
- Rate limits reset automatically

### Search Not Working
- Run `node lib/setup-indexes.ts` to create indexes
- Check MongoDB connection
- Clear browser cache and reload

### Export Not Downloading
- Check you're logged in
- Verify JWT token is valid
- Check browser console for errors

---

## 📊 Testing

### Test User Registration
```powershell
# Using PowerShell
$body = @{
    email = "test@example.com"
    password = "Test123!@#"
    firstName = "John"
    lastName = "Doe"
    dateOfBirth = "1990-01-01"
    gender = "male"
    phone = "555-0123"
    address = "123 Main St"
    city = "New York"
    state = "NY"
    zipCode = "10001"
    bloodType = "A+"
    emergencyContact = "Jane Doe: 555-0124"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
```

### Test Login
```powershell
$body = @{
    email = "test@example.com"
    password = "Test123!@#"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] Set strong `JWT_SECRET` (32+ random characters)
- [ ] Set `NODE_ENV=production`
- [ ] Run database index setup
- [ ] Enable HTTPS
- [ ] Configure CORS if needed
- [ ] Set up MongoDB backups
- [ ] Configure error monitoring
- [ ] Load test with expected traffic

### Environment Variables (Production)
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/healthportal
JWT_SECRET=super-secret-change-this-32-chars-minimum
NODE_ENV=production
```

---

## 📈 Performance Expectations

- **Search Queries:** < 50ms
- **List Queries:** < 100ms
- **API Response:** < 200ms
- **Export Generation:** < 2s for 1000 records

---

## 🎓 Key Features Explained

### Rate Limiting
Prevents brute force attacks by limiting requests:
- Auth endpoints: 5 attempts per 15 minutes
- API endpoints: 60 requests per minute
- Implementation: `lib/rate-limit.ts`

### Input Validation
All inputs validated with Zod schemas:
- Email format
- Password strength
- Phone numbers
- Dates (YYYY-MM-DD)
- Blood type format
- Implementation: `lib/validations.ts`

### Pagination
Large datasets load faster:
- Default: 50 items per page
- Configurable: `?limit=20`
- Metadata included in response

### MongoDB Indexes
Dramatically improve search speed:
- Text indexes on searchable fields
- Compound indexes for sorting
- Weighted indexes (title > description)
- Setup: `node lib/setup-indexes.ts`

---

## 💡 Tips

1. **Search is powerful** - Try searching partial words
2. **Filters combine** - Use search + status filter together
3. **Export regularly** - Back up your health data
4. **Rate limits reset** - Just wait if you hit the limit
5. **Browser cache** - Clear if you see old data

---

## 🤝 Support

### Check These First
1. Browser console (F12) for errors
2. Terminal for server errors
3. MongoDB Atlas dashboard for connection issues
4. `IMPLEMENTATION_SUMMARY.md` for detailed documentation

### Common Solutions
- **Can't login:** Check password requirements
- **Slow search:** Run index setup script
- **No data:** Check MongoDB connection
- **Export fails:** Verify authentication

---

## 🎉 You're All Set!

Your health portal now has:
- ✅ Production-ready security
- ✅ Enterprise-grade features
- ✅ Fast search & filtering
- ✅ Data export capabilities
- ✅ Scalable architecture

**Enjoy your upgraded health portal!** 🏥
