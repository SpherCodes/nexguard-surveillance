/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Camera,
  DetectionEvent,
  Zone,
  SystemInfrenceSettings,
  SystemStorageSettings
} from '@/Types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export async function getCameras(): Promise<Camera[]> {
  try {
    const url = `${API_BASE_URL}/api/v1/cameras`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(
        `Failed to fetch cameras: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    return data.map(
      (camera: any): Camera => ({
        cameraId: camera.id,
        name: camera.name,
        location: camera.location,
        status: camera.status,
        enabled: camera.enabled,
        fps: camera.fps_target,
        resolution: [camera.resolution_width, camera.resolution_height],
        videoUrl: camera.url,
        zoneId: camera.zone_id
      })
    );
  } catch (error) {
    throw error;
  }
}

export async function getCamera(id: string): Promise<Camera | null> {
  try {
    const url = `${API_BASE_URL}/api/v1/cameras/${id}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(
        `Failed to fetch camera: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function updateCamera(
  id: string,
  updates: Partial<Camera>
): Promise<Camera> {
  try {
    const url = `${API_BASE_URL}/api/v1/cameras/${id}`;
    const payload = {
      name: updates.name,
      url: updates.videoUrl,
      enabled: updates.enabled,
      location: updates.location,
      zoneId: updates.zoneId
    };

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create camera: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function createCamera(cameraData: Camera): Promise<Camera> {
  try {
    const url = `${API_BASE_URL}/api/v1/cameras/`;
    const payload = {
      name: cameraData.name,
      url: cameraData.videoUrl,
      enabled: cameraData.enabled,
      resolution: cameraData.resolution,
      location: cameraData.location,
      zoneId: cameraData.zoneId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create camera: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}

export async function deleteCamera(id: string): Promise<void> {
  try {
    const url = `${API_BASE_URL}/api/v1/cameras/${id}`;
    const response = await fetch(url, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error(
        `Failed to delete camera: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error(`Error deleting camera ${id}:`, error);
    throw error;
  }
}

export async function getLatestAlerts(): Promise<DetectionEvent[]> {
  try {
    const url = `${API_BASE_URL}/api/v1/detections/recent`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch latest alerts: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    // Map API fields to DetectionEvent fields
    return data.map((item: DetectionEvent) => ({
      id: item.id,
      cameraId: item.cameraId,
      timestamp: item.timestamp,
      description: undefined,
      thumbnailImg: item.thumbnail
        ? `data:image/jpeg;base64,${item.thumbnail}`
        : undefined,
      confidence: item.confidence
    }));
  } catch (error) {
    throw error;
  }
}

export async function getDetectionEventsByDay(day: Date) {
  if (!day) {
    throw new Error('Day parameter is required');
  }
  try {
    const formattedDate = day.toISOString().split('T')[0];
    const url = `${API_BASE_URL}/api/v1/detections/day/${formattedDate}`;

    const response = await fetch(url);

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Failed to fetch detection events: ${response.status} ${response.statusText} - ${errorData}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error; // Re-throw for TanStack Query to handle
  }
}

//Zone API functions
export async function getZones(): Promise<Zone[]> {
  try {
    const url = `${API_BASE_URL}/api/v1/zones`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch zones: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
}
export async function createZone(zoneName: string): Promise<Zone> {
  try {
    const url = `${API_BASE_URL}/api/v1/zones/${zoneName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(zoneName)
    });

    if (!response.ok) {
      throw new Error(
        `Failed to create zone: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating zone:', error);
    throw error;
  }
}

// Api calls for system settings
export async function getInferenceSettings(): Promise<SystemInfrenceSettings> {
  try {
    const url = `${API_BASE_URL}/api/v1/system/inference`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch inference settings: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    return {
      model: data.model,
      min_detection_threshold: data.min_detection_threshold,
    } as SystemInfrenceSettings;
  } catch (error) {
    console.error('Error fetching inference settings:', error);
    throw error;
  }
}

export async function getSystemStorageSettings(): Promise<SystemStorageSettings> {
  try {
    const url = `${API_BASE_URL}/api/v1/system/storage`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch storage settings: ${response.status} ${response.statusText}`
      );
    }
    const data = await response.json();
    return {
      storageType: data.storage_type,
      retentionDays: data.retention_days,
    }
  } catch (error) {
    console.error('Error fetching storage settings:', error);
    throw error;
  }
}

export async function updateInferenceSettings(
  data: SystemInfrenceSettings
): Promise<SystemInfrenceSettings> {
  try {
    const url = `${API_BASE_URL}/api/v1/system/inference`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update inference settings: ${response.status} ${response.statusText}`
      );
    }
    const updatedData = await response.json();
    return updatedData as SystemInfrenceSettings;
  } catch (error) {
    console.error('Error updating inference settings:', error);
    throw error;
  }
}

export async function updateStorageSettings(
  data: SystemStorageSettings
): Promise<SystemStorageSettings> {
  try {
    const url = `${API_BASE_URL}/api/v1/system/storage`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(
        `Failed to update storage settings: ${response.status} ${response.statusText}`
      );
    }
    const updatedData = await response.json();
    return updatedData as SystemStorageSettings;
  } catch (error) {
    console.error('Error updating storage settings:', error);
    throw error;
  }
}
