import { useState } from 'react';
import { X, Video, Users, Share, Circle, Square, Mic, MicOff, VideoOff, Check, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Toaster, toast } from 'sonner';
import { copyToClipboard } from '../utils/clipboard';

interface MeetingModalProps {
  documentName: string;
  onClose: () => void;
}

export default function MeetingModal({ documentName, onClose }: MeetingModalProps) {
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [participants, setParticipants] = useState([
    { id: 1, name: 'You', status: 'active' },
  ]);

  const handleStartMeeting = () => {
    const link = `https://meet.xplanb.app/${Math.random().toString(36).substring(7)}`;
    setMeetingLink(link);
    setMeetingStarted(true);
    toast.success('Meeting started!');
    
    // Simulate participants joining
    setTimeout(() => {
      setParticipants([
        ...participants,
        { id: 2, name: 'Sarah Johnson', status: 'active' },
        { id: 3, name: 'Mike Chen', status: 'active' },
      ]);
    }, 2000);
  };

  const handleShareScreen = () => {
    setIsSharingScreen(!isSharingScreen);
    if (!isSharingScreen) {
      toast.success('Screen sharing started');
    } else {
      toast.info('Screen sharing stopped');
    }
  };

  const handleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.success('Recording started');
    } else {
      toast.success('Recording saved successfully');
    }
  };

  const copyMeetingLink = async () => {
    const success = await copyToClipboard(meetingLink);
    if (success) {
      setLinkCopied(true);
      toast.success('Meeting link copied to clipboard');
      setTimeout(() => setLinkCopied(false), 2000);
    } else {
      toast.error('Failed to copy link. Please copy manually: ' + meetingLink);
    }
  };

  if (!meetingStarted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-md rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[20px]">Start Meeting</h2>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg">
              <X className="w-5 h-5" />
            </Button>
          </div>

          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
              <p className="text-[14px] text-blue-900 dark:text-blue-200">
                📄 <strong>Document:</strong> {documentName}
              </p>
            </div>

            <div>
              <Label htmlFor="meetingTitle">Meeting Title</Label>
              <Input
                id="meetingTitle"
                type="text"
                defaultValue={`Meeting: ${documentName}`}
                className="mt-1.5 rounded-xl"
              />
            </div>

            <div>
              <Label htmlFor="inviteEmails">Invite Participants (Optional)</Label>
              <Input
                id="inviteEmails"
                type="text"
                placeholder="email1@example.com, email2@example.com"
                className="mt-1.5 rounded-xl"
              />
              <p className="text-[12px] text-muted-foreground mt-1">
                You can also share the meeting link after starting
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleStartMeeting}
                className="flex-1 rounded-xl"
              >
                <Video className="w-4 h-4 mr-2" />
                Start Meeting
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Meeting Interface */}
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gray-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="bg-red-600 text-white rounded-lg">
              {isRecording && <Circle className="w-3 h-3 mr-1 fill-white animate-pulse" />}
              {isRecording ? 'Recording' : 'Live'}
            </Badge>
            <span className="text-white text-[14px]">{documentName}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-white text-[14px] mr-2">
              <Users className="w-4 h-4 inline mr-1" />
              {participants.length}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-lg text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Main Video Area */}
        <div className="flex-1 relative bg-gray-950 grid grid-cols-2 gap-2 p-2">
          {/* Simulated video feeds */}
          <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center">
            {isSharingScreen ? (
              <div className="text-white text-center">
                <Share className="w-12 h-12 mx-auto mb-2" />
                <p>Your Screen</p>
              </div>
            ) : (
              <div className="text-white text-center">
                {isVideoOff ? (
                  <>
                    <Avatar className="w-20 h-20 mx-auto mb-2">
                      <AvatarFallback className="bg-blue-600 text-white text-[24px]">
                        Y
                      </AvatarFallback>
                    </Avatar>
                    <p>You</p>
                  </>
                ) : (
                  <>
                    <Video className="w-12 h-12 mx-auto mb-2" />
                    <p>You (Camera Active)</p>
                  </>
                )}
              </div>
            )}
            {isMuted && (
              <div className="absolute top-2 right-2 bg-red-600 p-2 rounded-lg">
                <MicOff className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          {participants.slice(1).map((participant) => (
            <div
              key={participant.id}
              className="relative rounded-xl overflow-hidden bg-gradient-to-br from-green-900 to-blue-900 flex items-center justify-center"
            >
              <div className="text-white text-center">
                <Avatar className="w-20 h-20 mx-auto mb-2">
                  <AvatarFallback className="bg-green-600 text-white text-[24px]">
                    {participant.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <p>{participant.name}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="p-4 bg-gray-900 flex items-center justify-center gap-3">
          <Button
            variant={isMuted ? 'destructive' : 'secondary'}
            size="lg"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-xl"
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </Button>

          <Button
            variant={isVideoOff ? 'destructive' : 'secondary'}
            size="lg"
            onClick={() => setIsVideoOff(!isVideoOff)}
            className="rounded-xl"
          >
            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </Button>

          <Button
            variant={isSharingScreen ? 'default' : 'secondary'}
            size="lg"
            onClick={handleShareScreen}
            className="rounded-xl"
          >
            <Share className="w-5 h-5 mr-2" />
            {isSharingScreen ? 'Stop Sharing' : 'Share Screen'}
          </Button>

          <Button
            variant={isRecording ? 'destructive' : 'secondary'}
            size="lg"
            onClick={handleRecording}
            className="rounded-xl"
          >
            {isRecording ? (
              <>
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </>
            ) : (
              <>
                <Circle className="w-5 h-5 mr-2" />
                Record
              </>
            )}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={copyMeetingLink}
            className="rounded-xl"
            title={meetingLink}
          >
            {linkCopied ? (
              <>
                <Check className="w-4 h-4 mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            size="lg"
            onClick={onClose}
            className="rounded-xl ml-auto"
          >
            End Meeting
          </Button>
        </div>
      </div>
    </div>
  );
}
