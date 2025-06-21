# QR Code Check-in Implementation Plan

**Date**: January 21, 2025  
**Scope**: Add QR code generation and scanning for appointment check-ins

## Executive Summary

This plan implements QR code functionality for appointment check-ins, enabling:
- Automatic QR code generation for approved appointments
- Mobile-friendly QR code scanning by ushers
- Robust fallback mechanisms for scan failures
- Enhanced user experience with instant appointment lookup
- Security measures to prevent unauthorized access

## Current State Analysis

### Existing Check-in Flow
- **Ushers** manually find appointments in UsherAppointmentSchedule.tsx
- **Individual Check-in**: Click check-in buttons for each attendee
- **Bulk Check-in**: Check-in all attendees for an appointment
- **Data Sources**: appointment_dignitaries and appointment_contacts

### Current Limitations
- Manual appointment lookup by ushers
- Time-consuming for large events
- Potential for human error in attendee identification
- No automated verification system

## Requirements & Design Decisions

### Core Requirements
1. **QR Code Generation**: Automatic for approved appointments
2. **Mobile Scanning**: Camera-based QR scanning on usher devices
3. **Appointment Lookup**: Instant appointment display from QR scan
4. **Check-in Actions**: Individual and bulk check-in from QR view
5. **Fallback Mechanisms**: Manual entry when scanning fails
6. **Security**: Prevent unauthorized QR code usage

### Industry Best Practices Research

**QR Code Data Structure Options**:

1. **Option A: Direct Appointment ID**
   - Data: `{"appointment_id": 12345, "token": "abc123"}`
   - Pros: Simple, fast lookup
   - Cons: Sequential IDs could be guessed

2. **Option B: Signed Token with Metadata**
   - Data: `{"id": 12345, "date": "2025-01-21", "token": "jwt_signed_token"}`
   - Pros: Secure, includes verification data
   - Cons: Larger QR codes

3. **Option C: UUID-based with Appointment Context**
   - Data: `{"uuid": "550e8400-e29b-41d4-a716-446655440000", "aid": 12345}`
   - Pros: Non-guessable, includes readable appointment ID
   - Cons: Requires UUID generation and storage

**Recommended Approach: Option C + JWT Signing**
- Generate unique UUID per appointment
- Include appointment ID as readable text
- Sign entire payload with JWT for security
- Embed appointment number as fallback text in QR

## Implementation Plan

### Phase 1: QR Code Generation (Backend)

#### 1.1 Database Schema Updates

**New table: `appointment_qr_codes`**
```sql
CREATE TABLE appointment_qr_codes (
    id SERIAL PRIMARY KEY,
    appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    qr_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    qr_token TEXT NOT NULL, -- JWT signed token
    qr_data_json JSONB NOT NULL, -- Full QR payload
    generated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Optional expiration
    is_active BOOLEAN DEFAULT TRUE,
    generated_by INTEGER REFERENCES users(id),
    
    UNIQUE(appointment_id), -- One QR per appointment
    INDEX(qr_uuid),
    INDEX(appointment_id),
    INDEX(expires_at)
);
```

#### 1.2 QR Code Generation Service

**File**: `backend/services/qr_code_service.py`
```python
import qrcode
import jwt
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional
import base64
from io import BytesIO

class QRCodeService:
    def generate_appointment_qr(self, appointment_id: int, user_id: int) -> Dict:
        """Generate QR code for appointment with security token"""
        
        # Generate unique UUID
        qr_uuid = str(uuid.uuid4())
        
                 # Calculate timezone-aware expiration (1 day after appointment)
         appointment = db.query(models.Appointment).filter(
             models.Appointment.id == appointment_id
         ).first()
         expires_at = calculate_qr_expiration(appointment)
         
         # Create JWT payload
         payload = {
             'uuid': qr_uuid,
             'appointment_id': appointment_id,
             'generated_at': datetime.utcnow().isoformat(),
             'expires_at': expires_at.isoformat(),
             'iss': 'aolf-gsec'
         }
        
        # Sign with JWT
        token = jwt.encode(payload, settings.QR_SECRET_KEY, algorithm='HS256')
        
        # QR Code data (includes human-readable appointment ID)
        qr_data = {
            'uuid': qr_uuid,
            'token': token,
            'aid': appointment_id,  # Human readable fallback
            'type': 'appointment_checkin'
        }
        
                 # Generate QR code image with appointment ID overlay
         qr_image_base64 = self._generate_qr_image(qr_data, appointment_id)
        
        return {
            'uuid': qr_uuid,
            'token': token,
            'qr_data': qr_data,
            'qr_image': qr_image_base64,
            'appointment_id': appointment_id
        }
    
         def _generate_qr_image(self, data: Dict, appointment_id: int) -> str:
         """Generate QR code image with curved edges and appointment ID overlay"""
         qr = qrcode.QRCode(
             version=1,
             error_correction=qrcode.constants.ERROR_CORRECT_M,  # Higher error correction for overlay
             box_size=12,
             border=4,
         )
         qr.add_data(json.dumps(data))
         qr.make(fit=True)
         
         # Generate base QR image
         img = qr.make_image(fill_color="black", back_color="white")
         
         # Convert to PIL Image for manipulation
         from PIL import Image, ImageDraw, ImageFont
         
         # Add curved corners
         img = self._add_rounded_corners(img, radius=20)
         
         # Add appointment ID overlay in center
         img = self._add_center_text_overlay(img, f"#{appointment_id}")
         
         # Convert to base64
         buffer = BytesIO()
         img.save(buffer, format='PNG')
         img_str = base64.b64encode(buffer.getvalue()).decode()
         
         return f"data:image/png;base64,{img_str}"
     
     def _add_rounded_corners(self, img, radius):
         """Add rounded corners to QR code image"""
         from PIL import Image, ImageDraw
         
         # Create mask for rounded corners
         mask = Image.new('L', img.size, 0)
         draw = ImageDraw.Draw(mask)
         draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
         
         # Apply mask
         rounded_img = Image.new('RGBA', img.size, (255, 255, 255, 0))
         rounded_img.paste(img, (0, 0))
         rounded_img.putalpha(mask)
         
         return rounded_img
     
     def _add_center_text_overlay(self, img, text):
         """Add appointment number overlay in center of QR code"""
         from PIL import Image, ImageDraw, ImageFont
         
         draw = ImageDraw.Draw(img)
         
         # Try to load a font, fallback to default
         try:
             font = ImageFont.truetype("arial.ttf", 24)
         except:
             font = ImageFont.load_default()
         
         # Calculate text position (center)
         bbox = draw.textbbox((0, 0), text, font=font)
         text_width = bbox[2] - bbox[0]
         text_height = bbox[3] - bbox[1]
         
         x = (img.width - text_width) // 2
         y = (img.height - text_height) // 2
         
         # Add white background for text readability
         padding = 8
         bg_bbox = [
             x - padding, 
             y - padding, 
             x + text_width + padding, 
             y + text_height + padding
         ]
         draw.rounded_rectangle(bg_bbox, radius=6, fill='white', outline='black', width=2)
         
         # Add text
         draw.text((x, y), text, fill='black', font=font)
         
         return img
```

#### 1.3 API Endpoints

**File**: `backend/routers/admin/appointments.py`
```python
@router.post("/{appointment_id}/generate-qr", response_model=schemas.QRCodeResponse)
async def generate_appointment_qr(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user_for_write),
    db: Session = Depends(get_db)
):
    """Generate QR code for approved appointment"""
    # Verify appointment exists and is approved
    appointment = admin_get_appointment(
        current_user=current_user,
        db=db,
        appointment_id=appointment_id,
        required_access_level=models.AccessLevel.READ_WRITE
    )
    
    if appointment.status != models.AppointmentStatus.APPROVED:
        raise HTTPException(400, "QR codes only available for approved appointments")
    
    # Generate or retrieve existing QR code
    qr_service = QRCodeService()
    qr_result = qr_service.generate_appointment_qr(appointment_id, current_user.id)
    
    # Store in database
    # ... (implementation details)
    
    return qr_result

@router.get("/{appointment_id}/qr", response_model=schemas.QRCodeResponse)
async def get_appointment_qr(
    appointment_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get existing QR code for appointment"""
    # Implementation for retrieving existing QR codes
```

**File**: `backend/routers/usher.py`
```python
@router.post("/scan-qr", response_model=schemas.QRScanResponse)
async def scan_qr_code(
    scan_data: schemas.QRScanRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Process scanned QR code and return appointment details"""
    try:
        # Parse QR data
        qr_data = json.loads(scan_data.qr_text)
        
        # Verify JWT token
        token = qr_data.get('token')
        jwt_payload = jwt.decode(token, settings.QR_SECRET_KEY, algorithms=['HS256'])
        
        # Verify UUID matches
        if jwt_payload['uuid'] != qr_data['uuid']:
            raise HTTPException(400, "Invalid QR code")
        
        # Check expiration
        expires_at = datetime.fromisoformat(jwt_payload['expires_at'])
        if datetime.utcnow() > expires_at:
            raise HTTPException(400, "QR code expired")
        
                 # Get appointment and validate check-in time window
         appointment_id = jwt_payload['appointment_id']
         
         # Check if check-in is allowed (2 hours before appointment)
         appointment = db.query(models.Appointment).filter(
             models.Appointment.id == appointment_id
         ).first()
         
         if not is_checkin_allowed(appointment):
             raise HTTPException(400, "Check-in not yet allowed - must be within 2 hours of appointment time")
         
         # Get full appointment data for usher
         usher_appointment = get_usher_appointment(appointment_id, current_user, db)
         
         return {
             'success': True,
             'appointment': usher_appointment,
             'scan_type': 'qr_success'
         }
        
    except Exception as e:
        # Fallback: try to extract appointment ID from QR data
        fallback_id = extract_fallback_appointment_id(scan_data.qr_text)
        if fallback_id:
            appointment = get_usher_appointment(fallback_id, current_user, db)
            return {
                'success': True,
                'appointment': appointment,
                'scan_type': 'fallback_success',
                'warning': 'QR verification failed, used fallback method'
            }
        
        return {
            'success': False,
            'error': 'Invalid QR code',
            'scan_type': 'failed'
        }
```

### Phase 2: QR Code Delivery & Display

#### 2.1 Email Integration

**Add QR codes to appointment confirmation emails**:
- Include QR code image in email templates
- Add instructions for check-in process
- Provide fallback appointment number

#### 2.2 User Portal

**New page**: `frontend/src/pages/MyAppointmentQR.tsx`
- Display QR codes for approved appointments  
- Download/save QR code functionality
- Instructions for use

### Phase 3: QR Code Scanning (Frontend)

#### 3.1 QR Scanner Component

**File**: `frontend/src/components/QRScanner.tsx`
```typescript
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError: (error: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const startScanning = () => {
    const scanner = new Html5QrcodeScanner(
      "qr-scanner-container",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      },
      false
    );

    scanner.render(
      (decodedText) => {
        setIsScanning(false);
        scanner.clear();
        onScan(decodedText);
      },
      (error) => {
        // Handle scan errors silently (too noisy otherwise)
        console.debug('QR scan error:', error);
      }
    );

    scannerRef.current = scanner;
    setIsScanning(true);
  };

  return (
    <Box>
      {!isScanning ? (
        <Button onClick={startScanning} variant="contained" size="large">
          Start QR Scanner
        </Button>
      ) : (
        <Box>
          <div id="qr-scanner-container" />
          <Button onClick={() => {
            scannerRef.current?.clear();
            setIsScanning(false);
          }}>
            Stop Scanner
          </Button>
        </Box>
      )}
    </Box>
  );
};
```

#### 3.2 Enhanced Usher Interface

**File**: `frontend/src/pages/UsherAppointmentSchedule.tsx`

**Major Updates**:
```typescript
// Add QR scanning mode toggle
const [scanMode, setScanMode] = useState<'list' | 'qr'>('list');
const [scannedAppointment, setScannedAppointment] = useState<UsherAppointmentSchedule | null>(null);

// QR Scan handler
const handleQRScan = async (qrText: string) => {
  try {
    const response = await api.post('/usher/scan-qr', { qr_text: qrText });
    
    if (response.data.success) {
      setScannedAppointment(response.data.appointment);
      setScanMode('list'); // Switch to appointment view
      
      if (response.data.warning) {
        enqueueSnackbar(response.data.warning, { variant: 'warning' });
      } else {
        enqueueSnackbar('QR code scanned successfully!', { variant: 'success' });
      }
    } else {
      enqueueSnackbar(`Scan failed: ${response.data.error}`, { variant: 'error' });
    }
  } catch (error) {
    enqueueSnackbar('Failed to process QR code', { variant: 'error' });
  }
};

// Render QR scanner or appointment list
return (
  <Layout>
    <Container maxWidth="lg">
      {/* Toggle between List and QR modes */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup value={scanMode} exclusive onChange={(e, mode) => setScanMode(mode)}>
          <ToggleButton value="list">
            <ListIcon /> Appointment List
          </ToggleButton>
          <ToggleButton value="qr">
            <QrCodeScannerIcon /> QR Scanner
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {scanMode === 'qr' ? (
        <QRScannerView onScan={handleQRScan} />
      ) : (
        <AppointmentListView 
          appointments={scannedAppointment ? [scannedAppointment] : filteredAppointments}
          highlightAppointment={scannedAppointment?.id}
        />
      )}
    </Container>
  </Layout>
);
```

#### 3.3 Fallback Manual Entry

**Component**: `ManualAppointmentLookup.tsx`
```typescript
const ManualAppointmentLookup = ({ onAppointmentFound }) => {
  const [appointmentId, setAppointmentId] = useState('');
  
  const handleManualLookup = async () => {
    // API call to lookup appointment by ID
    // Same result as QR scan but with manual entry
  };

  return (
    <Box>
      <TextField
        label="Appointment ID"
        value={appointmentId}
        onChange={(e) => setAppointmentId(e.target.value)}
        placeholder="Enter appointment number"
      />
      <Button onClick={handleManualLookup}>
        Find Appointment
      </Button>
    </Box>
  );
};
```

### Phase 4: Enhanced User Experience

#### 4.1 Performance Optimizations

- **Lazy Loading**: Load QR scanner only when needed
- **Camera Optimization**: Release camera resources properly
- **Caching**: Cache appointment data after successful scan
- **Progressive Web App**: Enable offline QR display

#### 4.2 Error Handling & Feedback

- **Visual Feedback**: Loading states, success animations
- **Audio Feedback**: Beep on successful scan
- **Haptic Feedback**: Vibration on mobile devices
- **Clear Error Messages**: Specific error codes and solutions

#### 4.3 Accessibility

- **Screen Reader Support**: Proper ARIA labels
- **High Contrast Mode**: QR code visibility
- **Large Text Support**: Readable appointment information
- **Keyboard Navigation**: Full keyboard accessibility

### Phase 5: Security & Validation

#### 5.1 QR Code Security

- **JWT Signing**: Prevent QR code tampering
- **Expiration**: Time-limited QR codes
- **Rate Limiting**: Prevent brute force scanning
- **Access Control**: Verify usher permissions

#### 5.2 Data Validation

- **Schema Validation**: Strict QR data format validation
- **Appointment Status**: Verify appointment is still valid
- **Location Access**: Ensure usher has location access
- **Time Windows**: Optional check-in time restrictions

### Phase 6: Testing Strategy

#### 6.1 QR Code Testing

- **Generation Testing**: Various appointment types and statuses
- **Security Testing**: Invalid tokens, expired codes, tampered data
- **Scanning Testing**: Different devices, lighting conditions, QR quality
- **Fallback Testing**: Manual entry when QR fails

#### 6.2 Device Compatibility

- **Mobile Browsers**: iOS Safari, Chrome, Firefox
- **Camera Access**: Permission handling, multiple cameras
- **Performance**: Low-end devices, poor network conditions
- **Offline Functionality**: Cached QR codes, network recovery

## Implementation Timeline

### Phase 1: Backend QR Generation (Week 1)
- Database schema and models
- QR generation service
- Admin API endpoints
- Basic security implementation

### Phase 2: QR Delivery (Week 2) 
- Email template updates
- User portal QR display
- QR code management APIs

### Phase 3: Frontend Scanner (Week 3)
- QR scanner component
- Usher interface updates
- Manual fallback implementation

### Phase 4: UX Enhancement (Week 4)
- Performance optimizations
- Error handling improvements
- Accessibility features

### Phase 5: Testing & Polish (Week 5)
- Comprehensive testing
- Security validation
- Device compatibility testing
- Documentation and training

**Total Timeline**: 5 weeks

## Requirements Confirmed

Based on clarification, the implementation will include:

1. **QR Code Expiration**: 1 day after appointment date (timezone-aware)
2. **QR Code Regeneration**: No regeneration allowed - one permanent QR per appointment
3. **Offline Functionality**: Yes, with local caching and background sync
4. **Check-in Time Windows**: 2 hours before appointment time (timezone-aware)
5. **QR Code Visual Format**: Curved edges with appointment number displayed in center
6. **Fallback Display**: Appointment ID prominently displayed in center of QR code area

## Enhanced Implementation Details

### Timezone Handling Strategy

**QR Code Expiration Calculation**:
```python
def calculate_qr_expiration(appointment: models.Appointment) -> datetime:
    """Calculate QR expiration as 1 day after appointment in appointment's timezone"""
    if appointment.calendar_event:
        # Use sophisticated timezone logic from existing system
        appointment_datetime = appointment.calendar_event.start_datetime
        appointment_timezone = get_appointment_timezone(appointment.calendar_event)
        
        # Convert to appointment timezone, add 1 day, convert back to UTC
        local_appointment_time = appointment_datetime.astimezone(appointment_timezone)
        expiration_local = local_appointment_time + timedelta(days=1)
        expiration_utc = expiration_local.astimezone(pytz.UTC)
        
        return expiration_utc
    else:
        # Fallback: 1 day from creation
        return datetime.utcnow() + timedelta(days=1)
```

**Check-in Time Window Validation**:
```python
def is_checkin_allowed(appointment: models.Appointment) -> bool:
    """Check if current time is within 2 hours before appointment"""
    if not appointment.calendar_event:
        return True  # Allow if no specific time set
    
    appointment_datetime = appointment.calendar_event.start_datetime
    appointment_timezone = get_appointment_timezone(appointment.calendar_event)
    
    # Convert current time to appointment timezone
    now_local = datetime.now(appointment_timezone)
    appointment_local = appointment_datetime.astimezone(appointment_timezone)
    
    # Allow check-in starting 2 hours before
    checkin_allowed_from = appointment_local - timedelta(hours=2)
    
    return now_local >= checkin_allowed_from
```

### Offline Functionality Architecture

**Local Storage Strategy**:
```typescript
interface CachedAppointmentData {
  appointment: UsherAppointmentSchedule;
  cachedAt: string;
  qrScanned: boolean;
  pendingCheckins: PendingCheckin[];
}

interface PendingCheckin {
  id: string; // Local UUID
  appointmentId: number;
  entityType: 'dignitary' | 'contact';
  entityId: number;
  status: AttendanceStatus;
  timestamp: string;
  synced: boolean;
}

class OfflineCheckinManager {
  private storage = window.localStorage;
  private syncQueue: PendingCheckin[] = [];
  
  // Cache appointment when scanned
  cacheAppointment(appointment: UsherAppointmentSchedule) {
    const cacheData: CachedAppointmentData = {
      appointment,
      cachedAt: new Date().toISOString(),
      qrScanned: true,
      pendingCheckins: []
    };
    this.storage.setItem(`cached_appointment_${appointment.id}`, JSON.stringify(cacheData));
  }
  
  // Store check-in action locally when offline
  queueCheckin(checkinData: PendingCheckin) {
    this.syncQueue.push(checkinData);
    this.storage.setItem('pending_checkins', JSON.stringify(this.syncQueue));
    
    // Immediately attempt sync if online
    if (navigator.onLine) {
      this.syncPendingCheckins();
    }
  }
  
  // Background sync when connection restored
  async syncPendingCheckins() {
    const pending = this.getPendingCheckins();
    
    for (const checkin of pending) {
      try {
        await this.syncSingleCheckin(checkin);
        this.markAsSynced(checkin.id);
      } catch (error) {
        console.error('Sync failed for checkin:', checkin.id, error);
      }
    }
  }
  
  // Sync individual check-in to backend
  private async syncSingleCheckin(checkin: PendingCheckin) {
    if (checkin.entityType === 'dignitary') {
      await api.patch('/usher/dignitaries/checkin', {
        appointment_dignitary_id: checkin.entityId,
        attendance_status: checkin.status
      });
    } else {
      await api.patch('/usher/contacts/checkin', {
        appointment_contact_id: checkin.entityId,
        attendance_status: checkin.status
      });
    }
  }
  
  private getPendingCheckins(): PendingCheckin[] {
    const pending = this.storage.getItem('pending_checkins');
    return pending ? JSON.parse(pending) : [];
  }
  
  private markAsSynced(checkinId: string) {
    this.syncQueue = this.syncQueue.filter(c => c.id !== checkinId);
    this.storage.setItem('pending_checkins', JSON.stringify(this.syncQueue));
  }
}

### Offline Sync Workflow

**When Online**:
1. QR code scanned → Appointment cached locally
2. Check-in performed → Immediately synced to backend
3. UI updated with real-time status

**When Offline**:
1. QR code scanned → Use cached appointment data (if available)
2. Check-in performed → Stored in local queue with visual indicator
3. UI shows "pending sync" status

**When Connection Restored**:
1. Automatic background sync of queued check-ins
2. Conflict resolution (backend state takes precedence)
3. UI updated with final synced status

**Visual Indicators**:
- ✅ Synced check-ins (green)
- ⏳ Pending sync (yellow with sync icon)
- ❌ Sync failed (red with retry option)
- 📱 Offline mode indicator

### QR Code Visual Specifications

**Design Requirements**:
- **Curved Corners**: 20px border radius for modern appearance
- **Center Overlay**: White rounded rectangle with appointment number
- **Text Format**: "#12345" in black, bold font
- **Error Correction**: Medium level to accommodate center overlay
- **Size**: 300x300px standard, scalable for different displays
- **Colors**: Black QR code on white background, high contrast

**Implementation Details**:
```python
# QR Code generation with visual specifications
def _generate_styled_qr(self, data: Dict, appointment_id: int) -> str:
    # Base QR code with medium error correction
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=4,
    )
    
    # Style enhancements
    img = qr.make_image(fill_color="black", back_color="white")
    img = self._add_rounded_corners(img, radius=20)
    img = self._add_center_overlay(img, f"#{appointment_id}")
    
    return img
```

**Email Template Integration**:
- QR code embedded as inline image
- Appointment details displayed below QR
- Clear instructions for check-in process
- Fallback text with appointment number

**Mobile Display Optimization**:
- Responsive sizing for different screen sizes
- High DPI support for crisp scanning
- Touch-friendly download/save options 