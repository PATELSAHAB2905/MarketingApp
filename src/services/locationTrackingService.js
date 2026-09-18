// Location Tracking Service for Patel Sahab Spices
// Handles real GPS Geolocation, Firestore synchronization, permission states, and battery-friendly throttling.

import { setDocument, getDocument } from './firestoreService';

class LocationTrackingService {
  constructor() {
    this.watchId = null;
    this.heartbeatInterval = null;
    this.currentMarketer = null;
    this.lastPosition = null;
    this.lastSyncTime = 0;
    this.trackingActive = false;
    this.permissionState = 'prompt'; // 'granted' | 'denied' | 'prompt' | 'unavailable'
    this.listeners = new Set();
  }

  /**
   * Subscribe to local tracking state updates
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data);
      } catch (e) {
        console.error('[LocationTrackingService] Listener error:', e);
      }
    });
  }

  /**
   * Calculates distance between two coordinates in meters (Haversine formula)
   */
  calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get battery status if supported by browser
   */
  async getBatteryLevel() {
    try {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        return Math.round(battery.level * 100);
      }
    } catch {
      // Battery API not supported or restricted
    }
    return null;
  }

  /**
   * Request a one-shot current position (e.g. at Start My Day)
   */
  async getCurrentPosition() {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        this.permissionState = 'unavailable';
        resolve({
          success: false,
          error: 'Geolocation is not supported by your browser.',
          permissionState: 'unavailable',
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.permissionState = 'granted';
          const coords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
            heading: pos.coords.heading || null,
            speed: pos.coords.speed || null,
            timestamp: pos.timestamp || Date.now(),
          };
          this.lastPosition = coords;
          resolve({
            success: true,
            coords,
            permissionState: 'granted',
          });
        },
        (err) => {
          let state = 'unavailable';
          let message = 'Location unavailable. Please check GPS and internet.';
          if (err.code === err.PERMISSION_DENIED) {
            state = 'denied';
            message = 'Location permission denied. Live location cannot be shown.';
          } else if (err.code === err.TIMEOUT) {
            message = 'Location request timed out. Retrying in background.';
          }
          this.permissionState = state;
          resolve({
            success: false,
            error: message,
            permissionState: state,
            errorCode: err.code,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 30000,
        }
      );
    });
  }

  /**
   * Start continuous live location tracking for an active marketer
   */
  async startTracking({
    marketerId,
    marketerName,
    marketId,
    marketName,
    sessionId = 1,
    initialStatus = 'On Market Visit',
  }) {
    if (!marketerId) return;

    this.currentMarketer = {
      marketerId,
      marketerName,
      marketId,
      marketName,
      sessionId,
      status: initialStatus,
    };
    this.trackingActive = true;

    // 1. Get initial position immediately
    const initResult = await this.getCurrentPosition();
    const batteryLevel = await this.getBatteryLevel();

    const initialPayload = {
      marketerId,
      marketerName,
      marketId: marketId || '',
      marketName: marketName || 'General',
      sessionId,
      trackingActive: true,
      status: initialStatus,
      locationPermission: initResult.permissionState,
      latitude: initResult.success ? initResult.coords.latitude : null,
      longitude: initResult.success ? initResult.coords.longitude : null,
      accuracy: initResult.success ? initResult.coords.accuracy : null,
      batteryLevel,
      lastUpdatedAt: new Date().toISOString(),
      timestamp: Date.now(),
      error: initResult.success ? null : initResult.error,
    };

    // Sync to Firestore & Local Storage
    await this.syncLiveLocation(initialPayload);
    if (initResult.success) {
      await this.appendLocationHistory(marketerId, {
        lat: initResult.coords.latitude,
        lng: initResult.coords.longitude,
        accuracy: initResult.coords.accuracy,
        activity: 'Start My Day',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
      });
    }

    // 2. Clear any existing watcher
    this.stopWatcherOnly();

    // 3. Start Geolocation Watcher if supported
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          this.permissionState = 'granted';
          const newCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy || 0),
            heading: pos.coords.heading || null,
            speed: pos.coords.speed || null,
            timestamp: pos.timestamp || Date.now(),
          };

          const now = Date.now();
          const prev = this.lastPosition;

          // Throttling: Check distance displacement (meters) and elapsed time (ms)
          const distanceMeters = prev
            ? this.calculateDistanceMeters(prev.latitude, prev.longitude, newCoords.latitude, newCoords.longitude)
            : 999;
          const timeElapsedMs = now - this.lastSyncTime;

          // Update if moved > 15 meters OR > 45 seconds have passed
          if (distanceMeters > 15 || timeElapsedMs > 45000) {
            this.lastPosition = newCoords;
            this.lastSyncTime = now;
            const batt = await this.getBatteryLevel();

            const updatePayload = {
              ...this.currentMarketer,
              trackingActive: true,
              locationPermission: 'granted',
              latitude: newCoords.latitude,
              longitude: newCoords.longitude,
              accuracy: newCoords.accuracy,
              batteryLevel: batt,
              lastUpdatedAt: new Date().toISOString(),
              timestamp: now,
              error: null,
            };

            await this.syncLiveLocation(updatePayload);

            // Record breadcrumb point in history if moved > 25 meters or > 2 minutes
            if (distanceMeters > 25 || timeElapsedMs > 120000) {
              await this.appendLocationHistory(marketerId, {
                lat: newCoords.latitude,
                lng: newCoords.longitude,
                accuracy: newCoords.accuracy,
                activity: this.currentMarketer.status || 'Field Movement',
                shopName: this.currentMarketer.shopName || null,
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                timestamp: now,
              });
            }
          }
        },
        async (err) => {
          let state = 'unavailable';
          let message = 'Location unavailable.';
          if (err.code === err.PERMISSION_DENIED) {
            state = 'denied';
            message = 'Location permission denied.';
          }
          this.permissionState = state;
          const now = Date.now();
          if (now - this.lastSyncTime > 60000) {
            this.lastSyncTime = now;
            await this.syncLiveLocation({
              ...this.currentMarketer,
              trackingActive: true,
              locationPermission: state,
              lastUpdatedAt: new Date().toISOString(),
              timestamp: now,
              error: message,
            });
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 20000,
          timeout: 20000,
        }
      );
    }

    // 4. Heartbeat interval every 60s to maintain freshness
    this.heartbeatInterval = setInterval(async () => {
      if (!this.trackingActive || !this.currentMarketer) return;
      const now = Date.now();
      if (now - this.lastSyncTime > 55000) {
        this.lastSyncTime = now;
        const batt = await this.getBatteryLevel();
        const payload = {
          ...this.currentMarketer,
          trackingActive: true,
          locationPermission: this.permissionState,
          latitude: this.lastPosition ? this.lastPosition.latitude : null,
          longitude: this.lastPosition ? this.lastPosition.longitude : null,
          accuracy: this.lastPosition ? this.lastPosition.accuracy : null,
          batteryLevel: batt,
          lastUpdatedAt: new Date().toISOString(),
          timestamp: now,
        };
        await this.syncLiveLocation(payload);
      }
    }, 60000);

    return initialPayload;
  }

  /**
   * Update active marketer status (e.g., 'On Shop Visit', 'Taking Order', 'Collecting Payment')
   */
  async updateStatus({ status, marketId, marketName, shopId, shopName, activityDetails }) {
    if (!this.currentMarketer) return;

    this.currentMarketer = {
      ...this.currentMarketer,
      status: status || this.currentMarketer.status,
      marketId: marketId || this.currentMarketer.marketId,
      marketName: marketName || this.currentMarketer.marketName,
      shopId: shopId !== undefined ? shopId : this.currentMarketer.shopId,
      shopName: shopName !== undefined ? shopName : this.currentMarketer.shopName,
    };

    const batt = await this.getBatteryLevel();
    const now = Date.now();

    const payload = {
      ...this.currentMarketer,
      trackingActive: this.trackingActive,
      locationPermission: this.permissionState,
      latitude: this.lastPosition ? this.lastPosition.latitude : null,
      longitude: this.lastPosition ? this.lastPosition.longitude : null,
      accuracy: this.lastPosition ? this.lastPosition.accuracy : null,
      batteryLevel: batt,
      lastUpdatedAt: new Date().toISOString(),
      timestamp: now,
      activityDetails: activityDetails || null,
    };

    await this.syncLiveLocation(payload);

    // If coordinates are available, record breadcrumb event for this status change
    if (this.lastPosition && this.currentMarketer.marketerId) {
      await this.appendLocationHistory(this.currentMarketer.marketerId, {
        lat: this.lastPosition.latitude,
        lng: this.lastPosition.longitude,
        accuracy: this.lastPosition.accuracy,
        activity: status,
        shopName: shopName || null,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        timestamp: now,
      });
    }
  }

  /**
   * Stop continuous live location tracking (e.g. at End My Day or logout)
   */
  async stopTracking({ endRemark = '' } = {}) {
    this.trackingActive = false;
    this.stopWatcherOnly();

    if (this.currentMarketer) {
      const now = Date.now();
      const endedPayload = {
        ...this.currentMarketer,
        trackingActive: false,
        status: 'Day Ended',
        endRemark,
        lastUpdatedAt: new Date().toISOString(),
        timestamp: now,
      };

      await this.syncLiveLocation(endedPayload);

      if (this.lastPosition) {
        await this.appendLocationHistory(this.currentMarketer.marketerId, {
          lat: this.lastPosition.latitude,
          lng: this.lastPosition.longitude,
          accuracy: this.lastPosition.accuracy,
          activity: 'End My Day',
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          timestamp: now,
        });
      }
    }

    this.currentMarketer = null;
  }

  /**
   * Internal helper to stop watchPosition and intervals
   */
  stopWatcherOnly() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Synchronizes live location doc to Firestore and LocalStorage
   */
  async syncLiveLocation(data) {
    if (!data || !data.marketerId) return;

    // 1. Save to LocalStorage cache
    try {
      const key = 'PATEL_LIVE_LOCATIONS';
      const existing = JSON.parse(localStorage.getItem(key) || '{}');
      existing[data.marketerId] = {
        ...existing[data.marketerId],
        ...data,
      };
      localStorage.setItem(key, JSON.stringify(existing));
    } catch {
      // LocalStorage fallback
    }

    // 2. Push to Firestore collection 'liveLocations'
    try {
      await setDocument('liveLocations', String(data.marketerId), data, true);
    } catch (e) {
      console.warn('[LocationTrackingService] Firestore live sync warning:', e);
    }

    this.notifyListeners(data);
  }

  /**
   * Appends a real location breadcrumb point to today's location history
   */
  async appendLocationHistory(marketerId, point) {
    if (!marketerId || !point || !point.lat || !point.lng) return;

    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const docId = `${marketerId}_${dateStr}`;

    const key = `PATEL_LOCATION_HISTORY_${docId}`;
    let historyDoc = null;

    try {
      const local = localStorage.getItem(key);
      if (local) historyDoc = JSON.parse(local);
    } catch {
      // ignore
    }

    if (!historyDoc) {
      try {
        historyDoc = await getDocument('locationHistory', docId);
      } catch {
        // ignore
      }
    }

    if (!historyDoc) {
      historyDoc = {
        id: docId,
        marketerId,
        date: dateStr,
        points: [],
      };
    }

    // Prevent duplicate breadcrumbs within 10 meters and 30 seconds
    const lastPoint = historyDoc.points?.[historyDoc.points.length - 1];
    if (lastPoint) {
      const dist = this.calculateDistanceMeters(lastPoint.lat, lastPoint.lng, point.lat, point.lng);
      if (dist < 10 && point.timestamp - (lastPoint.timestamp || 0) < 30000) {
        return;
      }
    }

    historyDoc.points = [...(historyDoc.points || []), point];
    historyDoc.lastUpdated = new Date().toISOString();

    // Cache locally
    try {
      localStorage.setItem(key, JSON.stringify(historyDoc));
    } catch {
      // ignore
    }

    // Persist to Firestore
    try {
      await setDocument('locationHistory', docId, historyDoc, true);
    } catch (e) {
      console.warn('[LocationTrackingService] Firestore history sync warning:', e);
    }
  }
}

export const locationTrackingService = new LocationTrackingService();
export default locationTrackingService;
