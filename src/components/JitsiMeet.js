import React, { useEffect, useRef, useState } from 'react';
import { X, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from 'lucide-react';

const JitsiMeetComponent = ({ roomName, displayName, onClose, onMeetingEnd }) => {
  const jitsiContainerRef = useRef(null);
  const [api, setApi] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);

  useEffect(() => {
    // Check if Jitsi API is available
    if (!window.JitsiMeetExternalAPI) {
      console.error('Jitsi Meet API not loaded');
      return;
    }

    const domain = 'meet.jit.si';
    const options = {
      roomName: roomName || 'JaleDefaultRoom',
      width: '100%',
      height: '100%',
      parentNode: jitsiContainerRef.current,
      userInfo: {
        displayName: displayName || 'Guest'
      },
      configOverwrite: {
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        enableWelcomePage: false,
        prejoinPageEnabled: false
      },
      interfaceConfigOverwrite: {
        TOOLBAR_BUTTONS: [
          'microphone',
          'camera',
          'closedcaptions',
          'desktop',
          'fullscreen',
          'fodeviceselection',
          'hangup',
          'chat',
          'recording',
          'livestreaming',
          'etherpad',
          'sharedvideo',
          'settings',
          'raisehand',
          'videoquality',
          'filmstrip',
          'stats',
          'shortcuts',
          'tileview',
          'download',
          'help',
          'mute-everyone'
        ],
        SHOW_JITSI_WATERMARK: false,
        SHOW_WATERMARK_FOR_GUESTS: false
      }
    };

    const jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
    setApi(jitsiApi);

    // Event listeners
    jitsiApi.addEventListener('videoConferenceJoined', () => {
      console.log('Joined video conference');
    });

    jitsiApi.addEventListener('videoConferenceLeft', () => {
      console.log('Left video conference');
      if (onMeetingEnd) {
        onMeetingEnd();
      }
    });

    jitsiApi.addEventListener('readyToClose', () => {
      console.log('Ready to close');
      if (onClose) {
        onClose();
      }
    });

    jitsiApi.addEventListener('audioMuteStatusChanged', ({ muted }) => {
      setIsMuted(muted);
    });

    jitsiApi.addEventListener('videoMuteStatusChanged', ({ muted }) => {
      setIsVideoMuted(muted);
    });

    // Cleanup
    return () => {
      if (jitsiApi) {
        jitsiApi.dispose();
      }
    };
  }, [roomName, displayName, onClose, onMeetingEnd]);

  const toggleAudio = () => {
    if (api) {
      api.executeCommand('toggleAudio');
    }
  };

  const toggleVideo = () => {
    if (api) {
      api.executeCommand('toggleVideo');
    }
  };

  const hangUp = () => {
    if (api) {
      api.executeCommand('hangup');
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Video Interview</h2>
          <p className="text-sm text-gray-400">Room: {roomName}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-lg transition"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Jitsi Container */}
      <div ref={jitsiContainerRef} className="flex-1 w-full" />

      {/* Custom Controls Overlay */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 bg-opacity-90 rounded-full px-6 py-4 flex space-x-4">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full transition ${
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition ${
            isVideoMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title={isVideoMuted ? 'Start Video' : 'Stop Video'}
        >
          {isVideoMuted ? <VideoOff className="w-6 h-6 text-white" /> : <VideoIcon className="w-6 h-6 text-white" />}
        </button>

        <button
          onClick={hangUp}
          className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
};

export default JitsiMeetComponent;