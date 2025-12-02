import { useState } from 'react';
import { X, Sparkles, Folder, Users, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [workspaceName, setWorkspaceName] = useState('');

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-[24px]">Welcome to XPlanB</h2>
          <Button variant="ghost" size="icon" onClick={handleSkip} className="rounded-lg">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-[24px] mb-3">Let's get started!</h3>
              <p className="text-muted-foreground mb-8">
                XPlanB is your modern collaborative workspace for documents, projects, and team communication.
                Let's set up your workspace in just a few steps.
              </p>
              
              <div className="grid grid-cols-3 gap-6 text-left">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3">
                    <Folder className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="mb-1">Organize</h4>
                  <p className="text-[14px] text-muted-foreground">
                    Create folders and documents
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="mb-1">Collaborate</h4>
                  <p className="text-[14px] text-muted-foreground">
                    Work together in real-time
                  </p>
                </div>
                <div>
                  <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="mb-1">Achieve</h4>
                  <p className="text-[14px] text-muted-foreground">
                    Track progress and goals
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
                <Folder className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-[24px] mb-3 text-center">Create your workspace</h3>
              <p className="text-muted-foreground mb-8 text-center">
                Give your workspace a name. You can always change this later.
              </p>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="workspaceName">Workspace Name</Label>
                  <Input
                    id="workspaceName"
                    type="text"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g., My Team Workspace"
                    className="mt-1.5 rounded-xl"
                  />
                </div>

                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-[14px] text-blue-900 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Choose a name that represents your team or project.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-[24px] mb-3">You're all set!</h3>
              <p className="text-muted-foreground mb-8">
                Your workspace is ready. Start by creating your first document or inviting team members.
              </p>

              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="p-4 rounded-xl border border-border">
                  <h4 className="mb-2">📄 Create Document</h4>
                  <p className="text-[14px] text-muted-foreground">
                    Start writing and organizing your ideas
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-border">
                  <h4 className="mb-2">👥 Invite Team</h4>
                  <p className="text-[14px] text-muted-foreground">
                    Collaborate with your teammates
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex items-center justify-between">
          <div className="flex space-x-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  s === step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>

          <div className="flex space-x-3">
            <Button variant="ghost" onClick={handleSkip} className="rounded-xl">
              Skip
            </Button>
            <Button onClick={handleNext} className="rounded-xl">
              {step === 3 ? 'Get Started' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
