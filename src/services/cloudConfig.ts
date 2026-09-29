import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { app } from './googleAuth';
import { googleSheetsDb, SpreadsheetInfo } from './googleSheetsDb';

export const firestore = getFirestore(app);

export interface SharedDatabaseConfig {
  spreadsheetId: string | null;
  spreadsheetTitle: string | null;
  spreadsheetUrl: string | null;
  webhookUrl: string | null;
  updatedAt?: string;
  updatedBy?: string;
}

const CONFIG_COLLECTION = 'system_config';
const CONFIG_DOC_ID = 'database_settings';

/**
 * Service to synchronize database connection across ALL devices (laptops, phones, tablets)
 * via Firebase Firestore.
 */
export const cloudConfigService = {
  /**
   * Saves the shared database configuration to Firestore so all other devices receive it.
   */
  async saveConfigToCloud(config: Partial<SharedDatabaseConfig>): Promise<void> {
    try {
      const docRef = doc(firestore, CONFIG_COLLECTION, CONFIG_DOC_ID);
      const payload: SharedDatabaseConfig = {
        spreadsheetId: config.spreadsheetId ?? googleSheetsDb.getSavedSpreadsheetId(),
        spreadsheetTitle: config.spreadsheetTitle ?? googleSheetsDb.getSavedSpreadsheetInfo()?.title ?? null,
        spreadsheetUrl: config.spreadsheetUrl ?? googleSheetsDb.getSavedSpreadsheetInfo()?.spreadsheetUrl ?? null,
        webhookUrl: config.webhookUrl ?? googleSheetsDb.getSavedWebhookUrl(),
        updatedAt: new Date().toISOString(),
        updatedBy: config.updatedBy || 'Admin',
      };

      await setDoc(docRef, payload, { merge: true });

      // Also mirror to local storage
      if (payload.spreadsheetId) {
        googleSheetsDb.setSavedSpreadsheetId(payload.spreadsheetId);
      }
      if (payload.spreadsheetTitle && payload.spreadsheetId && payload.spreadsheetUrl) {
        googleSheetsDb.setSavedSpreadsheetInfo({
          spreadsheetId: payload.spreadsheetId,
          title: payload.spreadsheetTitle,
          spreadsheetUrl: payload.spreadsheetUrl,
        });
      }
      if (payload.webhookUrl) {
        googleSheetsDb.setSavedWebhookUrl(payload.webhookUrl);
      }
    } catch (err) {
      console.warn('Gagal menyimpan konfigurasi ke Firebase Firestore:', err);
    }
  },

  /**
   * Fetches the latest shared database config from Firestore.
   */
  async fetchConfigFromCloud(): Promise<SharedDatabaseConfig | null> {
    try {
      const docRef = doc(firestore, CONFIG_COLLECTION, CONFIG_DOC_ID);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as SharedDatabaseConfig;

        // Sync to local storage for offline resilience
        if (data.spreadsheetId) {
          googleSheetsDb.setSavedSpreadsheetId(data.spreadsheetId);
        }
        if (data.spreadsheetTitle && data.spreadsheetId && data.spreadsheetUrl) {
          googleSheetsDb.setSavedSpreadsheetInfo({
            spreadsheetId: data.spreadsheetId,
            title: data.spreadsheetTitle,
            spreadsheetUrl: data.spreadsheetUrl,
          });
        }
        if (data.webhookUrl) {
          googleSheetsDb.setSavedWebhookUrl(data.webhookUrl);
        }

        return data;
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi dari Firebase Firestore:', err);
    }
    return null;
  },

  /**
   * Subscribes to real-time changes to the database configuration so any device
   * gets updated immediately when another device connects or switches a database.
   */
  subscribeToCloudConfig(callback: (config: SharedDatabaseConfig) => void): () => void {
    try {
      const docRef = doc(firestore, CONFIG_COLLECTION, CONFIG_DOC_ID);
      const unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data() as SharedDatabaseConfig;

            // Sync to local storage
            if (data.spreadsheetId) {
              googleSheetsDb.setSavedSpreadsheetId(data.spreadsheetId);
            }
            if (data.spreadsheetTitle && data.spreadsheetId && data.spreadsheetUrl) {
              googleSheetsDb.setSavedSpreadsheetInfo({
                spreadsheetId: data.spreadsheetId,
                title: data.spreadsheetTitle,
                spreadsheetUrl: data.spreadsheetUrl,
              });
            }
            if (data.webhookUrl) {
              googleSheetsDb.setSavedWebhookUrl(data.webhookUrl);
            }

            callback(data);
          }
        },
        (error) => {
          console.warn('Ralat langganan Firestore cloud config:', error);
        }
      );
      return unsubscribe;
    } catch (err) {
      console.warn('Gagal memulakan langganan Firestore:', err);
      return () => {};
    }
  },
};
