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
  id: number,
  updates: Camera): Promise<Camera> {
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
      zone_id: cameraData.zoneId
    };
    console.log('Creating camera with payload:', payload);
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

export async function deleteCamera(id: number): Promise<void> {
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

export async function getDetectionEventsByDay(day: Date) {
  if (!day) {
    throw new Error('Day parameter is required');
  }
  try {
    const formattedDate = day.toISOString().split('T')[0];
    console.log(`Fetching events for date: ${formattedDate}`);
    const url = `${API_BASE_URL}/api/v1/detections/date/${formattedDate}`;

    const response = await fetch(url);

    console.log(`Data: ${JSON.stringify(response)}`);

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        `Failed to fetch detection events: ${response.status} ${response.statusText} - ${errorData}`
      );
    }
    const raw = await response.json();

    return Array.isArray(raw)
      ? raw.map(
          (event: any): DetectionEvent => ({
            id: event.id,
            cameraId: event.camera_id,
        timestamp: new Date(event.timestamp),
        confidence: event.confidence,
        image_media: event.image_media
          ? event.image_media.map((img: any) => ({
              cameraId: img.camera_id,
              detectionId: img.detection_id,
              imageData: img.image_data,
              createdAt: new Date(img.created_at),
              media_path: img.media_path
            }))
          : []
      })
      )
      : [];
  } catch (error) {
    throw error;
  }
}

//Zone API functions
export async function getZones(): Promise<Zone[]> {
  try {
    const url = `${API_BASE_URL}/api/v1/zones/`;

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
export async function createZone(zoneName: string, zoneDescription: string): Promise<Zone> {
  try {
    const url = `${API_BASE_URL}/api/v1/zones/`;
    const  payload = {
      name: zoneName,
      zoneDescription: zoneDescription,
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
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
      min_detection_threshold: data.min_detection_threshold
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
      retentionDays: data.retention_days
    };
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
