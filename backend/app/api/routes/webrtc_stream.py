from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from aiortc import RTCIceCandidate
import json
import asyncio

from ...services.detection import DetectionEventManager

from ...dependencies import get_detection_event_manager, get_inference_engine, get_video_capture
from ...services.video_capture import VideoCapture
from ...services.inference_engine import YOLOProcessor as inference_engine
from ...services.webrtc import RTCSessionManager

# Create a router instance
router = APIRouter()

# Create a session manager to handle WebRTC connections
rtc_manager = RTCSessionManager()

# Add WebSocket endpoint for signaling
@router.websocket("/{camera_id}/webrtc")
async def webrtc_signaling(
    websocket: WebSocket,
    camera_id: str,
    video_capture: VideoCapture = Depends(get_video_capture),
    inference_engine: inference_engine = Depends(get_inference_engine),
    detection_event_manager: DetectionEventManager = Depends(get_detection_event_manager)
):
    """WebRTC signaling for camera streaming"""
    try:
        await websocket.accept()
        
        if camera_id not in video_capture.cameras:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Camera {camera_id} not found")
            return
            
        peer_id = f"client_{websocket.client.host}_{websocket.client.port}"
        print(f'peer_id: {peer_id}, camera_id: {camera_id}')
        print(f"WebRTC client connected: {peer_id} for camera {camera_id}")
        
        # Make sure camera is running
        if not video_capture.is_camera_running(camera_id):
            video_capture._start_camera_thread(camera_id)
        if inference_engine:
            inference_engine.start_processing(camera_id)
        
        # Handle signaling messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "offer":
                # Client sent an offer, create answer
                session_desc = await rtc_manager.create_answer(
                    camera_id, 
                    peer_id, 
                    message.get("sdp"),
                    inference_engine,
                    video_capture
                )
                await websocket.send_json({
                    "type": "answer",
                    "sdp": session_desc
                })
                
            elif msg_type == "ice-candidate":
                # Convert dict to RTCIceCandidate object
                candidate_dict = message.get("candidate")
                print(f"Received ICE candidate: {candidate_dict}")
                if candidate_dict and "candidate" in candidate_dict:
                    try:
                        ice_candidate = RTCIceCandidate(
                            component=candidate_dict.get("component", 1),
                            foundation=candidate_dict.get("foundation", ""),
                            ip=candidate_dict.get("address", ""),
                            port=candidate_dict.get("port", 0),
                            priority=candidate_dict.get("priority", 0),
                            protocol=candidate_dict.get("protocol", "udp"),
                            type=candidate_dict.get("type", "host"),
                            # Additional fields
                            sdpMid=candidate_dict.get("sdpMid", "0"),
                            sdpMLineIndex=candidate_dict.get("sdpMLineIndex", 0)
                        )
                        
                        await rtc_manager.add_ice_candidate(
                            camera_id,
                            peer_id,
                            ice_candidate
                        )
                    except Exception as e:
                        print(f"Error processing ICE candidate: {e}")
                        print(f"Candidate data: {candidate_dict}")
                
            elif msg_type == "disconnect":
                break
                
    except WebSocketDisconnect:
        print(f"WebRTC client disconnected from camera {camera_id}")
    except Exception as e:
        print(f"WebRTC error for camera {camera_id}: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up WebRTC resources
        try:
            await rtc_manager.close_peer_connection(camera_id, peer_id)
        except Exception as e:
            print(f"Error cleaning up peer connection: {e}")