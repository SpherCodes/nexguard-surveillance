from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, status
from aiortc import RTCIceCandidate
import json
import asyncio

from ...utils.detection_manager import DetectionEventManager

from ...dependencies import get_detection_event_manager, get_inference_engine, get_video_capture
from ...services.video_capture import VideoCapture
from ...services.inference_engine import YOLOProcessor as inference_engine
from ...services.webrtc import RTCSessionManager

# Create a router instance
router = APIRouter()

# Create a session manager to handle WebRTC connections
rtc_manager = RTCSessionManager()

# Add WebSocket endpoint for signaling
@router.websocket("/{camera_id}")
async def webrtc_signaling(
    websocket: WebSocket,
    camera_id: int,
    video_capture: VideoCapture = Depends(get_video_capture),
    inference_engine: inference_engine = Depends(get_inference_engine)
):
    """WebRTC signaling for camera streaming"""
    print('Connecting WebRTC client to camera:', camera_id)
    try:
        await websocket.accept()
        print(f'WebRTC socket connected for camera {camera_id}')
        camera_id = camera_id
        if camera_id not in video_capture.cameras:
            print('video_capture.cameras:', video_capture.cameras)
            print(f"Camera {camera_id} not found in video capture service!!")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=f"Camera {camera_id} not found")
            return
            
        peer_id = f"client_{websocket.client.host}_{websocket.client.port}"
        
        # Handle signaling messages
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            msg_type = message.get("type")
            
            if msg_type == "offer":
                # Client sent an offer, create answer
                sdp_data = message.get("sdp")
                
                # Check if sdp_data is a dictionary and extract the sdp string
                if isinstance(sdp_data, dict) and "sdp" in sdp_data:
                    sdp_string = sdp_data["sdp"]
                else:
                    sdp_string = sdp_data
                
                session_desc = await rtc_manager.create_answer(
                    camera_id, 
                    peer_id, 
                    sdp_string,
                    inference_engine,
                    video_capture
                )
                await websocket.send_json({
                    "type": "answer",
                    "sdp": session_desc
                })
                print(f"Sent answer SDP for camera {camera_id} to peer {peer_id}")
                
            elif msg_type == "ice-candidate":
                # Convert dict to RTCIceCandidate object
                candidate_dict = message.get("candidate")
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