from core.models import sessionLocal, Camera, Detection

def seed():
    db = sessionLocal()
    try:
        # Seed cameras
        cameras = [
            Camera(camera_id="0", name="Front Door", location="Entrance", enabled=True),
            Camera(camera_id="1", name="Back Yard", location="Garden", enabled=False),
        ]
        for cam in cameras:
            exists = db.query(Camera).filter_by(camera_id=cam.camera_id).first()
            if not exists:
                db.add(cam)

        # Seed detections (example)
        detections = [
            Detection(camera_id="0", timestamp=1720346400.0, detection_type="person", confidence=0.98, bounding_box=[100, 120, 200, 300]),
            Detection(camera_id="1", timestamp=1720350000.0, detection_type="cat", confidence=0.85, bounding_box=[50, 60, 120, 180]),
        ]
        for det in detections:
            exists = db.query(Detection).filter_by(camera_id=det.camera_id, timestamp=det.timestamp, detection_type=det.detection_type).first()
            if not exists:
                db.add(det)

        db.commit()
        print("Seed data inserted successfully.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
